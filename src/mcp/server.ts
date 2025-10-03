// noinspection UnnecessaryLocalVariableJS

/**
 * MCP Server for FINAM Trade API
 *
 * Provides MCP tools wrapping all FINAM Trade API endpoints.
 * Supports both HTTP and stdio transports.
 *
 * Authentication:
 * - stdio transport: API_SECRET_TOKEN and ACCOUNT_ID from environment variables
 * - HTTP transport: Authorization Bearer header and X-Finam-Account-Id header per request
 *
 * Response formatting controlled by RETURN_AS env variable (json|string)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type CallToolRequest,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import helmet from 'helmet';
import * as api from '../api.js';
import { formatResponse } from './formatters.js';
import { getInstrumentSearch } from '../services/instrument-search.js';
import { createTools } from './tools.js';
import { createResources, handleReadResource } from './resources.js';
import { createPrompts, handleGetPrompt } from './prompts.js';

// Environment configuration
const RETURN_AS = (process.env.RETURN_AS || 'json') as 'json' | 'string';
const HTTP_PORT = parseInt(process.env.MCP_HTTP_PORT || '3001', 10);

// Server credentials (for stdio transport)
const API_SECRET_TOKEN: string | undefined = process.env.API_SECRET_TOKEN;
const ACCOUNT_ID: string | undefined = process.env.ACCOUNT_ID;


interface IHeaderCreds {
  secret_token: string;
  account_id: string
}

// Extract credentials from request (for HTTP transport)
function extractCredentials (headers?: Record<string, string>): IHeaderCreds | null {
  if (!headers) {
    return null;
  }

  const authHeader = headers.authorization || headers.Authorization;
  const accountIdHeader = headers['x-finam-account-id'] || headers['X-Finam-Account-Id'];

  if (!authHeader || !accountIdHeader) {
    return null;
  }

  const secret_token = authHeader.replace(/^Bearer\s+/i, '');
  return { secret_token, account_id: accountIdHeader };
}

// Tool handler
async function handleToolCall (request: CallToolRequest, headers?: Record<string, string>) {
  const { name, arguments: args } = request.params;

  // Merge credentials: request args > HTTP headers > server defaults
  let params = { ...args } as Record<string, string>;

  // Try HTTP headers first
  const headerCreds = extractCredentials(headers);

  params.secret_token = params.secret_token || headerCreds?.secret_token || API_SECRET_TOKEN || '';
  params.account_id = params.account_id || headerCreds?.account_id || ACCOUNT_ID || '';

  // Validate credentials
  if (!params.secret_token) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'secret_token is required',
    );
  }

  try {
    let result: unknown;

    // Handle SearchInstruments specially
    if (name === 'SearchInstruments') {
      const instrumentSearch = getInstrumentSearch();
      const query = params.query as string;
      const instruments = await instrumentSearch.search(query);
      result = instruments;
    } else {
      // Call API wrapper
      const apiFn = api[name as keyof typeof api] as (params: Record<string, string>) => Promise<unknown>;
      if (!apiFn) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Tool ${name} not found`,
        );
      }
      result = await apiFn(params);
    }

    // Format response based on RETURN_AS setting
    const formatted = formatResponse(name, result, RETURN_AS);

    return {
      content: [{ type: 'text', text: formatted }],
    };
  } catch (error) {
    // If it's already an McpError, rethrow it
    if (error instanceof McpError) {
      throw error;
    }

    // Wrap other errors in McpError
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : String(error),
    );
  }
}

// Create MCP server
export function createMcpServer (defaultAccountId?: string) {
  const tools = createTools(defaultAccountId);
  const resources = createResources();
  const prompts = createPrompts(defaultAccountId);

  const server = new Server(
    {
      name: 'finam-trade-api',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );

  // Register handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => handleToolCall(request));

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const content = await handleReadResource(uri, API_SECRET_TOKEN);
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: content,
        },
      ],
    };
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleGetPrompt(name, args, defaultAccountId);
  });

  return server;
}

// Start stdio transport
export async function startStdioServer () {
  // Set transport type for instrument search (stdio = exact search only)
  const instrumentSearch = getInstrumentSearch();
  instrumentSearch.setTransport('stdio');

  const server = createMcpServer(ACCOUNT_ID);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('MCP Server running on stdio transport');
  console.error(`Credentials: secret_token=${API_SECRET_TOKEN ? '***' : 'not set'}, account_id=${ACCOUNT_ID || 'not set'}`);
  console.error(`Response format: ${RETURN_AS}`);
}

// Start HTTP transport
export async function startHttpServer (port: number = HTTP_PORT) {
  const app = express();

  // Store active SSE transports (session_id -> transport)
  const sseTransports = new Map<string, SSEServerTransport>();

  // Security middleware
  app.use(helmet());
  // Skip body parsing for /mcp/v1 and /message - we'll read it manually
  app.use((req, res, next) => {
    if (req.path === '/mcp/v1' || req.path === '/message') {
      return next();
    }
    express.json()(req, res, next);
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      transports: ['stdio', 'sse', 'streamable-http'],
      returnAs: RETURN_AS,
    });
  });

  // Root endpoint with information
  app.get('/', (_req, res) => {
    res.send(`
      <h1>FINAM Trade API MCP Server</h1>
      <p>Server is running and supports multiple transports:</p>
      <ul>
        <li><strong>STDIO:</strong> Start with <code>node dist/mcp/index.js</code></li>
        <li><strong>SSE:</strong> Connect to <code>GET /sse</code> and send messages to <code>POST /message</code></li>
        <li><strong>Streamable HTTP:</strong> Connect to <code>POST /mcp/v1</code></li>
      </ul>
      <p><a href="/health">Health Check</a></p>
    `);
  });

  // SSE endpoint for MCP
  app.get('/sse', async (req, res) => {
    const sessionId = `sse-${Date.now()}-${Math.random()}`;
    console.error(`[SSE] New connection: ${sessionId}`);

    // Extract account_id from headers for tool descriptions
    const headerCreds = extractCredentials(req.headers as Record<string, string>);
    const server = createMcpServer(headerCreds?.account_id);
    const transport = new SSEServerTransport('/message', res);

    // Store transport for this session
    sseTransports.set(sessionId, transport);

    await server.connect(transport);

    // Override tool handler to pass headers and mark as HTTP transport
    server.setRequestHandler(CallToolRequestSchema, async (request) =>
      handleToolCall(request, req.headers as Record<string, string>),
    );

    req.on('close', () => {
      console.error(`[SSE] Connection closed: ${sessionId}`);
      sseTransports.delete(sessionId);
    });
  });

  // Message endpoint for SSE
  app.post('/message', async (req, res) => {
    // For simplicity, use the most recent SSE transport
    // In production, you'd want to use session IDs to route to the correct transport
    const transports = Array.from(sseTransports.values());
    if (transports.length === 0) {
      res.status(503).json({ error: 'No active SSE connection' });
      return;
    }

    const transport = transports[transports.length - 1];
    if (!transport) {
      res.status(503).json({ error: 'Transport not available' });
      return;
    }

    console.error(`[SSE] Routing message to transport (${transports.length} active)`);

    // Let the transport handle the message
    await transport.handlePostMessage(req, res);
  });

  // Streamable HTTP endpoint for MCP
  app.post('/mcp/v1', async (req, res) => {
    const sessionId = `http-${Date.now()}-${Math.random()}`;
    console.error(`[Streamable HTTP] New connection: ${sessionId}`);

    // Extract credentials from headers
    const headerCreds = extractCredentials(req.headers as Record<string, string>);

    try {
      // Collect full request body
      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          // Parse request
          const request = JSON.parse(body.trim());
          console.error(`[Streamable HTTP] Request:`, request);

          // Process request
          let result;
          if (request.method === 'initialize') {
            result = {
              protocolVersion: '0.1.0',
              capabilities: {
                tools: {},
                resources: {},
                prompts: {},
              },
              serverInfo: {
                name: 'finam-trade-api',
                version: '1.0.0',
              },
            };
          } else if (request.method === 'initialized') {
            // Client confirms initialization - no response needed
            result = {};
          } else if (request.method === 'tools/list') {
            const tools = createTools(headerCreds?.account_id);
            result = { tools };
          } else if (request.method === 'tools/call') {
            result = await handleToolCall(request as CallToolRequest, req.headers as Record<string, string>);
          } else if (request.method === 'resources/list') {
            const resources = createResources();
            result = { resources };
          } else if (request.method === 'resources/read') {
            const uri = request.params?.uri;
            if (!uri) {
              throw new McpError(ErrorCode.InvalidParams, 'uri parameter required');
            }
            const content = await handleReadResource(uri, headerCreds?.secret_token);
            result = {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: content,
                },
              ],
            };
          } else if (request.method === 'prompts/list') {
            const prompts = createPrompts(headerCreds?.account_id);
            result = { prompts };
          } else if (request.method === 'prompts/get') {
            const name = request.params?.name;
            if (!name) {
              throw new McpError(ErrorCode.InvalidParams, 'name parameter required');
            }
            result = handleGetPrompt(name, request.params?.arguments, headerCreds?.account_id);
          } else {
            throw new McpError(ErrorCode.MethodNotFound, `Unknown method: ${request.method}`);
          }

          // Send response
          const response = {
            jsonrpc: '2.0',
            id: request.id,
            result,
          };

          console.error(`[Streamable HTTP] Response sent for request ${request.id}`);
          res.setHeader('Content-Type', 'application/json');
          res.json(response);

        } catch (err) {
          console.error(`[Streamable HTTP] Processing error:`, err);
          const errorResponse = {
            jsonrpc: '2.0',
            id: body ? (JSON.parse(body.trim()) as { id?: unknown }).id : null,
            error: {
              code: err instanceof McpError ? err.code : ErrorCode.InternalError,
              message: err instanceof Error ? err.message : String(err),
            },
          };
          res.status(400).json(errorResponse);
        }
      });

      req.on('close', () => {
        console.error(`[Streamable HTTP] Connection closed: ${sessionId}`);
      });

    } catch (error) {
      console.error(`[Streamable HTTP] Error:`, error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: ErrorCode.InternalError,
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });

  app.listen(port, async () => {
    console.error(`\n🚀 MCP Server running on port ${port}`);
    console.error(`\n🚀 FINAM Trade API: ${process.env.API_BASE_URL}`);

    console.error(`\nAvailable endpoints:`);
    console.error(`  - SSE:              http://localhost:${port}/sse`);
    console.error(`  - SSE Messages:     http://localhost:${port}/message`);
    console.error(`  - Streamable HTTP:  http://localhost:${port}/mcp/v1`);
    console.error(`  - Health:           http://localhost:${port}/health`);
    console.error(`\nActive transports: stdio, SSE, Streamable HTTP`);
    console.error(`Response format: ${RETURN_AS}`);

    // Initialize instrument search for HTTP/SSE transports
    const instrumentSearch = getInstrumentSearch();
    instrumentSearch.setTransport('http');
    await instrumentSearch.initialize();
    instrumentSearch.startCacheRefresh(); // Start periodic cache refresh for HTTP transport
  });
}
