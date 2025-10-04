/**
 * Mapping of MCP tool names to their corresponding API endpoints
 *
 * All tools (except Auth and SearchInstruments) require JWT authentication,
 * so they implicitly call /v1/sessions first.
 */

export const TOOL_ENDPOINTS: Record<string, string[]> = {
  // Group 1: Authentication
  Auth: ['/v1/sessions'],
  TokenDetails: ['/v1/sessions/details'],

  // Group 2: Account
  GetAccount: ['/v1/accounts/{account_id}'],
  Trades: ['/v1/accounts/{account_id}/trades'],
  Transactions: ['/v1/accounts/{account_id}/transactions'],

  // Group 3: Assets
  Assets: ['/v1/assets'],
  Clock: ['/v1/assets/clock'],
  Exchanges: ['/v1/exchanges'],
  GetAsset: ['/v1/assets/{symbol}'],
  GetAssetParams: ['/v1/assets/{symbol}/params'],
  GetAssetDetails: ['/v1/assets/{symbol}', '/v1/assets/{symbol}/params'],
  OptionsChain: ['/v1/assets/{symbol}/options'],
  Schedule: ['/v1/assets/{symbol}/schedule'],

  // Group 4: Orders
  GetOrders: ['/v1/accounts/{account_id}/orders'],
  PlaceOrder: ['/v1/accounts/{account_id}/orders'],
  GetOrder: ['/v1/accounts/{account_id}/orders/{order_id}'],
  CancelOrder: ['/v1/accounts/{account_id}/orders/{order_id}'],

  // Group 5: Market Data
  Bars: ['/v1/instruments/{symbol}/bars'],
  LastQuote: ['/v1/instruments/{symbol}/quotes/latest'],
  LatestTrades: ['/v1/instruments/{symbol}/trades/latest'],
  OrderBook: ['/v1/instruments/{symbol}/orderbook'],

  // Special: Instrument Search (client-side, no API endpoint)
  SearchInstruments: [],
};

/**
 * Get endpoint paths for a given tool name
 */
export function getToolEndpoints(toolName: string): string[] {
  return TOOL_ENDPOINTS[toolName] || [];
}
