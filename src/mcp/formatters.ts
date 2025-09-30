/**
 * Response formatters for MCP tools
 *
 * Handles conversion between JSON and string formats based on RETURN_AS setting.
 * Implements special formatting rules for specific endpoints.
 */

import type {
  AssetsResponse,
  LatestTradesResponse,
  AuthResponse,
  TokenDetailsResponse,
  GetAccountResponse,
  TradesResponse,
  TransactionsResponse,
  ClockResponse,
  ExchangesResponse,
  GetAssetResponse,
  GetAssetParamsResponse,
  OptionsChainResponse,
  ScheduleResponse,
  PlaceOrderResponse,
  CancelOrderResponse,
  GetOrdersResponse,
  GetOrderResponse,
  BarsResponse,
  LastQuoteResponse,
  OrderBookResponse,
} from '../meta/finam-trade-api-interfaces.js';

/**
 * Format API result based on tool name and return mode
 */
export function formatResponse(toolName: string, data: unknown, returnAs: 'json' | 'string'): string {

  // JSON mode - return as-is with special processing
  if (returnAs === 'json') {
    return formatJsonResponse(toolName, data);
  }

  // String mode - format for LLM consumption
  return formatStringResponse(toolName, data);
}

/**
 * Format response in JSON mode
 */
function formatJsonResponse(toolName: string, data: unknown): string {
  // Special handling for Assets (3-1)
  if (toolName === 'Assets') {
    const response = data as AssetsResponse;
    if (response.assets && Array.isArray(response.assets)) {
      // Remove 'mic' property and limit to 1000 items
      const cleaned = response.assets.slice(0, 1000).map((asset) => {
        const { mic, ...rest } = asset as { mic?: string };
        return rest;
      });
      return JSON.stringify({ assets: cleaned }, null, 2);
    }
  }

  // Special handling for LatestTrades (5-3)
  if (toolName === 'LatestTrades') {
    const response = data as LatestTradesResponse;
    if (response.trades && Array.isArray(response.trades)) {
      // Limit to 100 items
      const limited = response.trades.slice(0, 100);
      return JSON.stringify({ trades: limited }, null, 2);
    }
  }

  // Default: return as formatted JSON
  return JSON.stringify(data, null, 2);
}

/**
 * Format response in string mode for LLM consumption
 */
function formatStringResponse(toolName: string, data: unknown): string {
  // Special handling for Assets (3-1)
  if (toolName === 'Assets') {
    return formatAssetsAsString(data as AssetsResponse);
  }

  // Special handling for LatestTrades (5-3)
  if (toolName === 'LatestTrades') {
    return formatLatestTradesAsString(data as LatestTradesResponse);
  }

  // Tool-specific formatters
  switch (toolName) {
    case 'Auth':
      return formatAuthAsString(data as AuthResponse);
    case 'TokenDetails':
      return formatTokenDetailsAsString(data as TokenDetailsResponse);
    case 'GetAccount':
      return formatAccountAsString(data as GetAccountResponse);
    case 'Trades':
      return formatTradesAsString(data as TradesResponse);
    case 'Transactions':
      return formatTransactionsAsString(data as TransactionsResponse);
    case 'Clock':
      return formatClockAsString(data as ClockResponse);
    case 'Exchanges':
      return formatExchangesAsString(data as ExchangesResponse);
    case 'GetAsset':
      return formatAssetAsString(data as GetAssetResponse);
    case 'GetAssetParams':
      return formatAssetParamsAsString(data as GetAssetParamsResponse);
    case 'GetAssetDetails':
      return formatAssetDetailsAsString(data as GetAssetResponse & GetAssetParamsResponse);
    case 'OptionsChain':
      return formatOptionsChainAsString(data as OptionsChainResponse);
    case 'Schedule':
      return formatScheduleAsString(data as ScheduleResponse);
    case 'PlaceOrder':
      return formatPlaceOrderAsString(data as PlaceOrderResponse);
    case 'CancelOrder':
      return formatCancelOrderAsString(data as CancelOrderResponse);
    case 'GetOrders':
      return formatOrdersAsString(data as GetOrdersResponse);
    case 'GetOrder':
      return formatOrderAsString(data as GetOrderResponse);
    case 'Bars':
      return formatBarsAsString(data as BarsResponse);
    case 'LastQuote':
      return formatLastQuoteAsString(data as LastQuoteResponse);
    case 'OrderBook':
      return formatOrderBookAsString(data as OrderBookResponse);
    default:
      // Fallback to JSON
      return JSON.stringify(data, null, 2);
  }
}

// ==================== String Formatters ====================

/**
 * Format Assets response as CSV string (max 2000 records)
 * Format: symbol,id,ticker,isin,type,name
 */
function formatAssetsAsString(response: AssetsResponse): string {
  if (!response.assets || !Array.isArray(response.assets)) {
    return 'No assets found';
  }

  const lines = ['symbol,id,ticker,isin,type,name'];

  response.assets.slice(0, 2000).forEach((asset) => {
    const symbol = asset.symbol || '';
    const id = asset.id || '';
    const ticker = asset.ticker || '';
    const isin = asset.isin || '';
    const type = asset.type || '';
    const name = (asset.name || '').replace(/"/g, '""'); // Escape quotes

    lines.push(`${symbol},${id},${ticker},${isin},${type},"${name}"`);
  });

  return lines.join('\n');
}

/**
 * Format LatestTrades response as string (max 100 records)
 */
function formatLatestTradesAsString(response: LatestTradesResponse): string {
  if (!response.trades || !Array.isArray(response.trades)) {
    return 'No trades found';
  }

  const trades = response.trades.slice(0, 100);
  const lines = ['time,price,quantity,side'];

  trades.forEach((trade) => {
    const time = trade.timestamp || '';
    const price = trade.price?.value || '0';
    const quantity = trade.size?.value || '0';
    const side = trade.side || '';

    lines.push(`${time},${price},${quantity},${side}`);
  });

  return lines.join('\n');
}

function formatAuthAsString(response: AuthResponse): string {
  return `JWT Token: ${response.token || 'N/A'}`;
}

function formatTokenDetailsAsString(response: TokenDetailsResponse): string {
  const lines = [`Token Details:`, `- Created: ${response.created_at || 'N/A'}`, `- Expires: ${response.expires_at || 'N/A'}`];

  if (response.scopes && response.scopes.length > 0) {
    lines.push(`- Scopes: ${response.scopes.join(', ')}`);
  }

  return lines.join('\n');
}

function formatAccountAsString(response: GetAccountResponse): string {
  return [
    `Account: ${response.account_id || 'N/A'}`,
    `Equity: ${response.equity?.value || '0'}`,
    `Currency: ${response.currency || 'N/A'}`,
    `Status: ${response.status || 'N/A'}`,
  ].join('\n');
}

function formatTradesAsString(response: TradesResponse): string {
  if (!response.trades || response.trades.length === 0) {
    return 'No trades found';
  }

  const lines = ['symbol,size,price,side,time'];
  response.trades.forEach((trade) => {
    lines.push(
      `${trade.symbol},${trade.size?.value},${trade.price?.value},${trade.side},${trade.timestamp}`,
    );
  });

  return lines.join('\n');
}

function formatTransactionsAsString(response: TransactionsResponse): string {
  if (!response.transactions || response.transactions.length === 0) {
    return 'No transactions found';
  }

  const lines = ['category,amount,currency,time'];
  response.transactions.forEach((tx) => {
    lines.push(`${tx.transaction_category},${tx.change?.units},${tx.change?.currency_code},${tx.timestamp}`);
  });

  return lines.join('\n');
}

function formatClockAsString(response: ClockResponse): string {
  return `Server Time: ${response.timestamp || 'N/A'}`;
}

function formatExchangesAsString(response: ExchangesResponse): string {
  if (!response.exchanges || response.exchanges.length === 0) {
    return 'No exchanges found';
  }

  const lines = ['mic,name'];
  response.exchanges.forEach((ex) => {
    lines.push(`${ex.mic},${ex.name}`);
  });

  return lines.join('\n');
}

function formatAssetAsString(response: GetAssetResponse): string {
  return [
    `Symbol: ${response.symbol}`,
    `Name: ${response.name}`,
    `Type: ${response.type}`,
    `Ticker: ${response.ticker}`,
    `ISIN: ${response.isin || 'N/A'}`,
    `Exchange: ${response.exchange || 'N/A'}`,
  ].join('\n');
}

function formatAssetParamsAsString(response: GetAssetParamsResponse): string {
  return [
    `Symbol: ${response.symbol}`,
    `Account: ${response.account_id}`,
    `Tradeable: ${response.tradeable}`,
    `Longable: ${response.longable}`,
    `Shortable: ${response.shortable}`,
    `Min Order Size: ${response.min_order_size?.value || 'N/A'}`,
    `Max Order Size: ${response.max_order_size?.value || 'N/A'}`,
  ].join('\n');
}

function formatAssetDetailsAsString(response: GetAssetResponse & GetAssetParamsResponse): string {
  const lines = [
    '=== Asset Information ===',
    `Symbol: ${response.symbol}`,
    `Name: ${response.name}`,
    `Type: ${response.type}`,
    `Ticker: ${response.ticker}`,
    `ISIN: ${response.isin || 'N/A'}`,
    `Exchange: ${response.exchange || 'N/A'}`,
    `Board: ${response.board || 'N/A'}`,
    `Lot Size: ${response.lot_size?.value || 'N/A'}`,
    `Decimals: ${response.decimals ?? 'N/A'}`,
    `Min Step: ${response.min_step || 'N/A'}`,
    '',
    '=== Trading Parameters ===',
    `Account ID: ${response.account_id}`,
    `Tradeable: ${response.tradeable}`,
  ];

  // Longable info
  if (response.longable && typeof response.longable === 'object' && 'value' in response.longable) {
    lines.push(`Long Availability: ${response.longable.value}`);
    if ('halted_days' in response.longable && response.longable.halted_days) {
      lines.push(`  - Halted Days: ${response.longable.halted_days}`);
    }
  } else {
    lines.push(`Longable: ${response.longable}`);
  }

  // Shortable info
  if (response.shortable && typeof response.shortable === 'object' && 'value' in response.shortable) {
    lines.push(`Short Availability: ${response.shortable.value}`);
    if ('halted_days' in response.shortable && response.shortable.halted_days) {
      lines.push(`  - Halted Days: ${response.shortable.halted_days}`);
    }
  } else {
    lines.push(`Shortable: ${response.shortable}`);
  }

  // Risk rates
  if (response.long_risk_rate?.value) {
    lines.push(`Long Risk Rate: ${response.long_risk_rate.value}`);
  }
  if (response.short_risk_rate?.value) {
    lines.push(`Short Risk Rate: ${response.short_risk_rate.value}`);
  }

  // Collateral
  if (response.long_collateral) {
    lines.push(`Long Collateral: ${response.long_collateral.units} ${response.long_collateral.currency_code}`);
  }
  if (response.short_collateral) {
    lines.push(`Short Collateral: ${response.short_collateral.units} ${response.short_collateral.currency_code}`);
  }

  // Order sizes
  lines.push(`Min Order Size: ${response.min_order_size?.value || 'N/A'}`);
  lines.push(`Max Order Size: ${response.max_order_size?.value || 'N/A'}`);

  // Trading status
  if (response.trading_status) {
    lines.push(`Trading Status: ${response.trading_status}`);
  }

  return lines.join('\n');
}

function formatOptionsChainAsString(response: OptionsChainResponse): string {
  if (!response.options || response.options.length === 0) {
    return 'No options found';
  }

  const lines = ['symbol,strike,expiry_last,type'];
  response.options.forEach((opt) => {
    const expiryDate = opt.expiration_last_day ? `${opt.expiration_last_day.year}-${opt.expiration_last_day.month}-${opt.expiration_last_day.day}` : 'N/A';
    lines.push(`${opt.symbol},${opt.strike?.value},${expiryDate},${opt.type}`);
  });

  return lines.join('\n');
}

function formatScheduleAsString(response: ScheduleResponse): string {
  if (!response.sessions || response.sessions.length === 0) {
    return 'No schedule found';
  }

  const lines = ['type,start_time,end_time'];
  response.sessions.forEach((session) => {
    lines.push(`${session.type},${session.interval?.start_time || 'N/A'},${session.interval?.end_time || 'N/A'}`);
  });

  return lines.join('\n');
}

function formatPlaceOrderAsString(response: PlaceOrderResponse): string {
  return [
    `Order Placed:`,
    `- Order ID: ${response.order_id}`,
    `- Status: ${response.status}`,
    `- Client Order ID: ${response.order?.client_order_id || 'N/A'}`,
  ].join('\n');
}

function formatCancelOrderAsString(response: CancelOrderResponse): string {
  return `Order ${response.order_id} cancelled successfully`;
}

function formatOrdersAsString(response: GetOrdersResponse): string {
  if (!response.orders || response.orders.length === 0) {
    return 'No orders found';
  }

  const lines = ['orderId,symbol,side,type,quantity,status'];
  response.orders.forEach((order) => {
    lines.push(
      `${order.order_id},${order.order?.symbol},${order.order?.side},${order.order?.type},${order.order?.quantity?.value},${order.status}`,
    );
  });

  return lines.join('\n');
}

function formatOrderAsString(response: GetOrderResponse): string {
  return [
    `Order ${response.order_id}:`,
    `- Symbol: ${response.order?.symbol}`,
    `- Side: ${response.order?.side}`,
    `- Type: ${response.order?.type}`,
    `- Quantity: ${response.order?.quantity?.value}`,
    `- Status: ${response.status}`,
    `- Filled: ${response.filled_quantity?.value || '0'}`,
  ].join('\n');
}

function formatBarsAsString(response: BarsResponse): string {
  if (!response.bars || response.bars.length === 0) {
    return 'No bars found';
  }

  const lines = ['time,open,high,low,close,volume'];
  response.bars.forEach((bar) => {
    lines.push(
      `${bar.timestamp},${bar.open?.value},${bar.high?.value},${bar.low?.value},${bar.close?.value},${bar.volume?.value}`,
    );
  });

  return lines.join('\n');
}

function formatLastQuoteAsString(response: LastQuoteResponse): string {
  return [
    `Last Quote:`,
    `- Bid: ${response.bid?.value || 'N/A'}`,
    `- Ask: ${response.ask?.value || 'N/A'}`,
    `- Last: ${response.last_price?.value || 'N/A'}`,
    `- Volume: ${response.volume?.value || 'N/A'}`,
  ].join('\n');
}

function formatOrderBookAsString(response: OrderBookResponse): string {
  const rows = response.orderbook?.rows || [];

  const bids = rows.filter(r => r.buy_size && r.buy_size.value !== '0');
  const asks = rows.filter(r => r.sell_size && r.sell_size.value !== '0');

  const lines = [
    'Order Book:',
    '',
    'Bids:',
    'price,size',
    ...bids.slice(0, 10).map((b) => `${b.price?.value},${b.buy_size?.value}`),
    '',
    'Asks:',
    'price,size',
    ...asks.slice(0, 10).map((a) => `${a.price?.value},${a.sell_size?.value}`),
  ];

  return lines.join('\n');
}