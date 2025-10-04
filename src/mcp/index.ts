#!/usr/bin/env node
/**
 * MCP Server Entry Point
 *
 * Supports two transport modes:
 * 1. stdio (default) - for Claude Desktop integration
 *    Usage: node dist/mcp/index.js
 *    Credentials: API_SECRET_TOKEN and ACCOUNT_ID from environment variables
 *
 * 2. HTTP/SSE - for HTTP-based MCP clients
 *    Usage: node dist/mcp/index.js --http [--port 3001]
 *    Credentials: Authorization Bearer header and X-Finam-Account-Id header per request
 *
 * Environment variables:
 * - API_SECRET_TOKEN: Secret token (for stdio transport)
 * - ACCOUNT_ID: Account ID (for stdio transport)
 * - RETURN_AS: json|string (default: json)
 * - MCP_HTTP_PORT: HTTP server port (default: 3001)
 */

import '../init-config.js';
import { startStdioServer, startHttpServer } from './server.js';

const HELP_TEXT = `
MCP Server for FINAM Trade API

USAGE:
  mcp-finam-trade-api [OPTIONS]

OPTIONS:
  --help              Show this help message
  --http              Start HTTP/SSE transport server (default: stdio)
  --port <number>     HTTP server port (default: 3001, requires --http)

TRANSPORT MODES:
  stdio (default)     For Claude Desktop integration
                      Credentials: API_SECRET_TOKEN and ACCOUNT_ID from environment

  HTTP/SSE            For HTTP-based MCP clients
                      Credentials: Authorization Bearer header and X-Finam-Account-Id header

ENVIRONMENT VARIABLES:
  API_SECRET_TOKEN    Secret token for authentication (stdio mode)
  ACCOUNT_ID          Account ID (stdio mode)
  RETURN_AS           Response format: json|string (default: json)
  MCP_HTTP_PORT       HTTP server port (default: 3001)

EXAMPLES:
  # Start stdio server (for Claude Desktop)
  mcp-finam-trade-api

  # Start HTTP server on default port 3001
  mcp-finam-trade-api --http

  # Start HTTP server on custom port
  mcp-finam-trade-api --http --port 3002
`;

// Parse CLI arguments
const args = process.argv.slice(2);

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(HELP_TEXT);
  process.exit(0);
}

const isHttpMode = args.includes('--http');

if (isHttpMode) {
  // HTTP/SSE transport mode
  const portIndex = args.indexOf('--port');
  const portArg = portIndex >= 0 ? args[portIndex + 1] : undefined;
  const port = portArg ? parseInt(portArg, 10) : undefined;

  console.log('Starting MCP HTTP server...');
  startHttpServer(port)
    .then(() => {
      console.log('✅  MCP HTTP server started successfully');
    })
    .catch((error) => {
      console.error('\n❌  Failed to start HTTP server');
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      process.exit(1);
    });
} else {
  // stdio transport mode (default)
  console.log('Starting MCP stdio server...');
  startStdioServer()
    .then(() => {
      console.log('✅  MCP stdio server started successfully');
    })
    .catch((error) => {
      console.error('\n❌  Failed to start stdio server');
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      process.exit(1);
    });
}
