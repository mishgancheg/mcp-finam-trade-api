# SHOW_MCP_ENDPOINTS Feature

## Overview

The `SHOW_MCP_ENDPOINTS` environment variable allows you to include API endpoint information in MCP tool responses. This is useful for debugging, logging, and understanding which API endpoints are being called by each MCP tool.

## Configuration

Set in `.env` file:

```bash
SHOW_MCP_ENDPOINTS=true   # Include endpoints in responses
SHOW_MCP_ENDPOINTS=false  # Standard responses (default)
```

## Response Format

### Without SHOW_MCP_ENDPOINTS (default)

```json
{
  "jsonrpc": "2.0",
  "id": "tool-GetOrders",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "..."
      }
    ]
  }
}
```

### With SHOW_MCP_ENDPOINTS=true

```json
{
  "jsonrpc": "2.0",
  "id": "tool-GetOrders",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "...",
        "endpoints": [
          "/v1/sessions",
          "/v1/accounts/{account_id}/orders"
        ]
      }
    ]
  }
}
```

## Endpoint Mapping

Each MCP tool is mapped to one or more API endpoints:

### Authentication Tools
- **Auth**: `["/v1/sessions"]`
- **TokenDetails**: `["/v1/sessions", "/v1/sessions/details"]`

### Account Tools
- **GetAccount**: `["/v1/sessions", "/v1/accounts/{account_id}"]`
- **Trades**: `["/v1/sessions", "/v1/accounts/{account_id}/trades"]`
- **Transactions**: `["/v1/sessions", "/v1/accounts/{account_id}/transactions"]`

### Asset Tools
- **Assets**: `["/v1/sessions", "/v1/assets"]`
- **Clock**: `["/v1/sessions", "/v1/assets/clock"]`
- **Exchanges**: `["/v1/sessions", "/v1/exchanges"]`
- **GetAsset**: `["/v1/sessions", "/v1/assets/{symbol}"]`
- **GetAssetParams**: `["/v1/sessions", "/v1/assets/{symbol}/params"]`
- **GetAssetDetails**: `["/v1/sessions", "/v1/assets/{symbol}", "/v1/assets/{symbol}/params"]`
- **OptionsChain**: `["/v1/sessions", "/v1/assets/{symbol}/options"]`
- **Schedule**: `["/v1/sessions", "/v1/assets/{symbol}/schedule"]`

### Order Tools
- **GetOrders**: `["/v1/sessions", "/v1/accounts/{account_id}/orders"]`
- **PlaceOrder**: `["/v1/sessions", "/v1/accounts/{account_id}/orders"]`
- **GetOrder**: `["/v1/sessions", "/v1/accounts/{account_id}/orders/{order_id}"]`
- **CancelOrder**: `["/v1/sessions", "/v1/accounts/{account_id}/orders/{order_id}"]`

### Market Data Tools
- **Bars**: `["/v1/sessions", "/v1/instruments/{symbol}/bars"]`
- **LastQuote**: `["/v1/sessions", "/v1/instruments/{symbol}/quotes/latest"]`
- **LatestTrades**: `["/v1/sessions", "/v1/instruments/{symbol}/trades/latest"]`
- **OrderBook**: `["/v1/sessions", "/v1/instruments/{symbol}/orderbook"]`

### Special Tools
- **SearchInstruments**: `[]` (client-side only, no API endpoint)

## Notes

1. **JWT Authentication**: Most tools require JWT authentication, so they include `/v1/sessions` as the first endpoint in the array.

2. **Multiple Endpoints**: Some tools like `GetAssetDetails` call multiple endpoints to gather complete information.

3. **No Endpoints**: `SearchInstruments` is a client-side tool that searches cached asset data, so it has no associated API endpoints.

4. **Parameter Placeholders**: Endpoint paths include parameter placeholders like `{account_id}`, `{symbol}`, `{order_id}` which are replaced with actual values during API calls.

## Use Cases

### Debugging
Enable `SHOW_MCP_ENDPOINTS` to see exactly which API endpoints are being called:

```bash
SHOW_MCP_ENDPOINTS=true npm run mcp
```

### Logging
Parse the `endpoints` array to log API usage:

```javascript
const response = await mcpClient.callTool('GetOrders', {...});
const endpoints = response.result.content[0].endpoints;
console.log('API endpoints called:', endpoints);
```

### Rate Limiting
Track which endpoints are being called to monitor API rate limits:

```javascript
if (endpoints.includes('/v1/sessions')) {
  console.log('JWT token generated');
}
```

### Documentation
Use the endpoint information to generate API usage documentation or audit trails.

## Implementation Details

The feature is implemented in:
- `src/mcp/tool-endpoints.ts` - Mapping of tools to endpoints
- `src/mcp/server.ts` - Logic to include endpoints in responses
- `.env.example` - Configuration documentation

## Testing

Run the test suite to verify the feature:

```bash
# Test endpoint mapping
node test/test-endpoints-mapping.js

# Test response format
node test/test-endpoints-in-response.js
```

Expected output:
```
✅ All tests passed!
```
