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
  type CallToolRequest,
  type Tool,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import helmet from 'helmet';
import * as api from '../api.js';
import { formatResponse } from './formatters.js';

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

// Create tool definitions with optional account_id default
function createTools (defaultAccountId?: string): Tool[] {

  // Helper to add account_id Description
  const accountIdProp = (s: string): { type: 'string', description: string } => {
    return {
      type: 'string',
      description: s + (defaultAccountId ? ` (optional. Default ${defaultAccountId})` : ''),
    };
  };

  // Helper to add account_id Description
  const symbolProp = (s?: string): { type: 'string', description: string } => {
    return {
      type: 'string',
      description: s || 'Instrument/Asset symbol (e.g., YDEX@MISX)',
    };
  };

  const accountIdRequired = !defaultAccountId;

  // Helper to add account_id to required array if needed
  const addRequired = (base: string[] = []): string[] => {
    return accountIdRequired ? [...base, 'account_id'] : base;
  };

  return [
    // Group 1: Connection
    {
      name: 'Auth', // 1-1
      description: 'Authenticate and get JWT token',
      inputSchema: {
        type: 'object',
        properties: {
          secret_token: {
            type: 'string',
            description: 'Secret token (optional if provided at startup)',
          },
        },
      },
    },
    {
      name: 'TokenDetails', // 1-2
      description: 'Get token details and permissions',
      inputSchema: {
        type: 'object',
        properties: {
          jwt_token: {
            type: 'string',
            description: 'JWT token',
          },
        },
      },
    },

    // Group 2: Accounts
    {
      name: 'GetAccount', // 2-1
      description: 'Get account information',
      inputSchema: {
        type: 'object',
        properties: {
          account_id: accountIdProp('Account ID'),
        },
        required: addRequired(),
      },
    },
    {
      name: 'Trades', // 2-2
      description: 'Get account trades for specified time interval',
      inputSchema: {
        type: 'object',
        properties: {
          account_id: accountIdProp('Account ID'),
          start_time: { type: 'string', description: 'Start time (RFC3339 format)' },
          end_time: { type: 'string', description: 'End time (RFC3339 format)' },
        },
        required: addRequired(['start_time', 'end_time']),
      },
    },
    {
      name: 'Transactions', // 2-3
      description: 'Get account transactions for specified time interval',
      inputSchema: {
        type: 'object',
        properties: {
          account_id: accountIdProp('Account ID'),
          start_time: { type: 'string', description: 'Start time (RFC3339 format)' },
          end_time: { type: 'string', description: 'End time (RFC3339 format)' },
        },
        required: addRequired(['start_time', 'end_time']),
      },
    },

    // Group 3: Instruments // VVA слишком много
    {
      name: 'Assets', // 3-1
      description: 'Get list of all available assets/instruments',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'Clock', // 3-2
      description: 'Get server time',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'Exchanges', // 3-3 // VVQ Переделать на Resourcesю С кешированием и обновлением раз 2 часа
      description: 'Get list of exchanges: names and mic codes',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },

    {
      name: 'GetAssetDetails', // 3-4 + 3-5 Combined
      description: `Get detailed information and trading parameters for a specific asset

Asset Information:
- ID, name, ticker
- mic - Exchange id
- Isin
- type - (e.g., EQUITIES / BONDS / FUNDS / FUTURES...)
- Board - trading mode code (tqbr)
- decimals - number of decimal signs in price
- min_step - min price step. For calc final price step: min_step/(10^Decimals)
- lot_size - number in lots
- Expiration_Date - (for Futures)

Trading Parameters:
- symbol
- tradeable - is trading allowed
- long/short availability:
  - value – (e.g., AVAILABLE / NOT_AVAILABLE / HALTED)
  - halted_days – days until restrictions are lifted
- risk rate for long & short
- maintenance collateral for long/short
- min/max order size
- trading status`,
      inputSchema: {
        type: 'object',
        properties: {
          symbol: symbolProp(),
          account_id: accountIdProp('Account ID for which the asset details will be selected'),
        },
        required: addRequired(['symbol']),
      },
    },
    {
      name: 'OptionsChain', // 3-6
      description: `Get options chain for underlying asset
- Symbol - basic optional asset
- Options (Array) In each:
  - Symbol and type of instrument
  - lot, number of basic asset in the tool
  - Starting dates and ending
  - The price of execution and the factor multiplier
  - The start/end of expiration
      `,
      inputSchema: {
        type: 'object',
        properties: {
          symbol: symbolProp('Underlying asset symbol'),
        },
        required: ['symbol'],
      },
    },
    {
      name: 'Schedule', // 3-7
      description: 'Get trading schedule for asset (asset sessions and their intervals)',
      inputSchema: {
        type: 'object',
        properties: {
          symbol: symbolProp(),
        },
        required: ['symbol'],
      },
    },

    // Group 4: Orders
    {
      name: 'CancelOrder', // 4-1
      description: `Cancel an existing order. In response comes the canceled Order`,
      inputSchema: {
        type: 'object',
        properties: {
          account_id: accountIdProp('Account ID'),
          order_id: { type: 'string', description: 'Order ID to cancel' },
        },
        required: addRequired(['order_id']),
      },
    },

    {
      name: 'GetOrder', // 4-2
      description: `Get specific order details
order_id
exec_id
status: new / partially_filled / filled / canceled / rejected
account_id
symbol
quantity
side
type
time_in_force
limit_price
stop_price
stop_condition
legs (Array) for multi legs order
client_order_id  – uniq id for order
      `,
      inputSchema: {
        type: 'object',
        properties: {
          account_id: accountIdProp('Account ID'),
          order_id: { type: 'string', description: 'Order ID' },
        },
        required: addRequired(['order_id']),
      },
    },

    {
      name: 'GetOrders', // 4-3
      description: 'Get details for all orders for account',
      inputSchema: {
        type: 'object',
        properties: {
          account_id: accountIdProp('Account ID'),
        },
        required: addRequired(),
      },
    },

    {
      name: 'PlaceOrder', // 4-4
      description: 'Place a new order',
      inputSchema: {
        type: 'object',
        properties: {
          account_id: accountIdProp('Account ID'),
          symbol: symbolProp(),
          quantity: {
            type: 'number',
            description: 'Order quantity',
          },
          side: {
            type: 'string',
            enum: ['SIDE_BUY', 'SIDE_SELL'],
            description: 'Order side',
          },
          type: {
            type: 'string',
            enum: ['ORDER_TYPE_LIMIT', 'ORDER_TYPE_MARKET', 'ORDER_TYPE_STOP', 'ORDER_TYPE_STOP_LIMIT'],
            description: 'Order type',
          },
          time_in_force: {
            type: 'string',
            enum: ['TIME_IN_FORCE_DAY', 'TIME_IN_FORCE_GTC', 'TIME_IN_FORCE_IOC', 'TIME_IN_FORCE_FOK'],
            description: 'Time in force',
          },
          limit_price: {
            type: 'number',
            description: 'Limit price (required for limit orders)',
          },
          stop_price: {
            type: 'number',
            description: 'Stop price (required for stop orders)',
          },
          stop_condition: {
            type: 'string',
            enum: ['STOP_CONDITION_MORE', 'STOP_CONDITION_LESS'],
            description: 'Stop condition (optional)',
          },
          client_order_id: {
            type: 'string',
            description: 'Unique order ID (optional). Automatically generated if not sent. (maximum 20 characters)',
            minLength: 3,
            maxLength: 20,
            pattern: "^[A-Za-z0-9 ]+$"
          },
          legs: {
            type: 'array',
            description: 'Order legs for complex orders (optional)',
            items: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Instrument symbol in format: SYMBOL@MIC (e.g. SBER@MISX)'
                },
                quantity: {
                  type: 'number',
                  description: 'Leg quantity',
                },
                side: {
                  type: 'string',
                  enum: ['SIDE_BUY', 'SIDE_SELL'],
                  description: 'Leg side'
                }
              },
              required: ['symbol', 'quantity', 'side'],
            }
          },
        },
        required: addRequired(['symbol', 'quantity', 'side', 'type', 'time_in_force']),
      },
    },

    // Group 5: Market Data
    {
      name: 'Bars', // 5-1
      description: 'Get historical bars/candles for instrument',
      inputSchema: {
        type: 'object',
        properties: {
          symbol: symbolProp(),
          start_time: { type: 'string', description: 'Start time (RFC3339 format)' },
          end_time: { type: 'string', description: 'End time (RFC3339 format)' },
          timeframe: {
            type: 'string',
            enum: ['TIME_FRAME_M1', 'TIME_FRAME_M5', 'TIME_FRAME_M15', 'TIME_FRAME_H1', 'TIME_FRAME_D'],
            description: 'Timeframe',
          },
        },
        required: ['symbol', 'start_time', 'end_time', 'timeframe'],
      },
    },
    {
      name: 'LastQuote', // 5-2
      description: 'Get latest quote for instrument',
      inputSchema: {
        type: 'object',
        properties: {
          symbol: symbolProp(),
        },
        required: ['symbol'],
      },
    },
    {
      name: 'LatestTrades', // 5-3
      description: 'Get latest trades for instrument (max 100 records)',
      inputSchema: {
        type: 'object',
        properties: {
          symbol: symbolProp(),
        },
        required: ['symbol'],
      },
    },
    {
      name: 'OrderBook', // 5-4
      description: 'Get order book for instrument',
      inputSchema: {
        type: 'object',
        properties: {
          symbol: symbolProp(),
        },
        required: ['symbol'],
      },
    },
  ];
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
    // Call API wrapper
    const apiFn = api[name as keyof typeof api] as (params: Record<string, string>) => Promise<unknown>;
    if (!apiFn) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Tool ${name} not found`,
      );
    }

    const result = await apiFn(params);

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

  const server = new Server(
    {
      name: 'finam-trade-api',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => handleToolCall(request));

  return server;
}

// Start stdio transport
export async function startStdioServer () {
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

  // Security middleware
  app.use(helmet());
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', transport: 'http', returnAs: RETURN_AS });
  });

  // SSE endpoint for MCP
  app.get('/sse', async (req, res) => {
    // Extract account_id from headers for tool descriptions
    const headerCreds = extractCredentials(req.headers as Record<string, string>);
    const server = createMcpServer(headerCreds?.account_id);
    const transport = new SSEServerTransport('/message', res);
    await server.connect(transport);

    // Override tool handler to pass headers
    server.setRequestHandler(CallToolRequestSchema, async (request) =>
      handleToolCall(request, req.headers as Record<string, string>),
    );
  });

  // Message endpoint for SSE
  app.post('/message', async (req, res) => {
    res.json({ received: true });
  });

  app.listen(port, () => {
    console.error(`MCP Server running on HTTP transport at http://localhost:${port}`);
    console.error(`SSE endpoint: http://localhost:${port}/sse`);
    console.error(`Response format: ${RETURN_AS}`);
  });
}
