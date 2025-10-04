/**
 * Mapping of MCP tool names to their corresponding API endpoints
 *
 * All tools (except Auth and SearchInstruments) require JWT authentication,
 * so they implicitly call /v1/sessions first.
 */

export const TOOL_ENDPOINTS: Record<string, string[]> = {
  // Group 1: Authentication
  Auth: ['POST;/v1/sessions'],
  TokenDetails: ['POST;/v1/sessions/details'],

  // Group 2: Account
  GetAccount: ['GET;/v1/accounts/{account_id}'],
  Trades: ['GET;/v1/accounts/{account_id}/trades'],
  Transactions: ['GET;/v1/accounts/{account_id}/transactions'],

  // Group 3: Assets
  Assets: ['GET;/v1/assets'],
  Clock: ['GET;/v1/assets/clock'],
  Exchanges: ['GET;/v1/exchanges'],
  GetAsset: ['GET;/v1/assets/{symbol}'],
  GetAssetParams: ['GET;/v1/assets/{symbol}/params'],
  GetAssetDetails: ['GET;/v1/assets/{symbol}', 'GET;/v1/assets/{symbol}/params'],
  OptionsChain: ['GET;/v1/assets/{symbol}/options'],
  Schedule: ['GET;/v1/assets/{symbol}/schedule'],

  // Group 4: Orders
  GetOrders: ['GET;/v1/accounts/{account_id}/orders'],
  PlaceOrder: ['POST;/v1/accounts/{account_id}/orders'],
  GetOrder: ['GET;/v1/accounts/{account_id}/orders/{order_id}'],
  CancelOrder: ['DELETE;/v1/accounts/{account_id}/orders/{order_id}'],

  // Group 5: Market Data
  Bars: ['GET;/v1/instruments/{symbol}/bars'],
  LastQuote: ['GET;/v1/instruments/{symbol}/quotes/latest'],
  LatestTrades: ['GET;/v1/instruments/{symbol}/trades/latest'],
  OrderBook: ['GET;/v1/instruments/{symbol}/orderbook'],

  // Special: Instrument Search (client-side, no API endpoint)
  SearchInstruments: [],
};

/**
 * Get endpoint paths for a given tool name
 */
export function getToolEndpoints(toolName: string): string[] {
  return TOOL_ENDPOINTS[toolName] || [];
}
