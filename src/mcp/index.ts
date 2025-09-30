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

// Parse CLI arguments
const args = process.argv.slice(2);
const isHttpMode = args.includes('--http');

if (isHttpMode) {
  // HTTP/SSE transport mode
  const portIndex = args.indexOf('--port');
  const portArg = portIndex >= 0 ? args[portIndex + 1] : undefined;
  const port = portArg ? parseInt(portArg, 10) : undefined;

  startHttpServer(port).catch((error) => {
    console.error('Failed to start HTTP server:', error);
    process.exit(1);
  });
} else {
  // stdio transport mode (default)
  startStdioServer().catch((error) => {
    console.error('Failed to start stdio server:', error);
    process.exit(1);
  });
}
