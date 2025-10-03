/**
 * MCP Resources Definitions for FINAM Trade API
 *
 * Defines all available resources including enums, schemas, and dynamic data.
 */

import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as Enums from '../types/finam-trade-api-enums.js';
import * as api from '../api.js';

// Enum resources configuration
const ENUM_RESOURCES = [
  { name: 'OrderType', description: 'order type' },
  { name: 'TimeInForce', description: 'time in force' },
  { name: 'OrderStatus', description: 'order status' },
  { name: 'StopCondition', description: 'stop condition' },
  { name: 'QuoteLevel', description: 'quote level' },
  { name: 'AccountType', description: 'account type' },
  { name: 'AccountStatus', description: 'account status' },
  { name: 'AssetType', description: 'asset type' },
  { name: 'OptionType', description: 'option type' },
  { name: 'SessionType', description: 'session type' },
  { name: 'TimeFrame', description: 'timeframe' },
  { name: 'TransactionCategory', description: 'transaction category' },
  { name: 'OrderBookAction', description: 'order book action' },
] as const;

// Schema descriptions for documentation resources
const assetDescription = `
id
name
ticker
mic - Exchange MIC code
symbol - (ticker@mic)
isin?  ISIN identifier
type - see enum://AssetType
board?  Trading mode code
lot_size?
decimals?  Num of decimal digits in price
min_step?  Min price step (for final step: min_step/(10^decimals))
`;

const orderInfoDescription = `
order_id - Order identifier
exec_id - Execution identifier
status - Order status (see enum://OrderStatus)
order  Order details
    account_id  Account identifier
    symbol  Instrument symbol
    quantity  Quantity in units
    side  SIDE_BUY | SIDE_SELL
    type  Order type (see enum://OrderType)
    time_in_force  Time in force (see enum://TimeInForce)
    limit_price?  Required for limit and stop-limit orders
    stop_price?  Required for stop-market and stop-limit orders
    stop_condition  Required for stop-market and stop-limit orders (see enum://StopCondition)
    legs?  Required for multi-leg orders. Array of: { symbol, quantity, side }
    client_order_id  Unique order identifier. Auto-generated if not provided (max 20 characters)
transact_at  Submission date and time
filled_quantity?  Filled quantity
cancel_time?  Cancellation date and time
accept_at?  Acceptance date and time
withdraw_at?  Cancellation date and time
`;

// Create resource definitions for enums
export function createResources(): Resource[] {
  // Generate enum resources
  const enumResources = ENUM_RESOURCES.map(({ name, description }) => ({
    uri: `enum://${name}`,
    name: `${name} enum values`,
    description: `All possible ${description} values`,
    mimeType: 'application/json',
  }));

  // Schema documentation resources
  const schemaResources: Resource[] = [
    {
      uri: 'schema://asset',
      name: 'Asset/Instrument Schema',
      description: 'Complete description of asset/instrument fields',
      mimeType: 'text/plain',
    },
    {
      uri: 'schema://order',
      name: 'Order Info Schema',
      description: 'Complete description of order information fields',
      mimeType: 'text/plain',
    },
  ];

  // Add exchange resource
  return [
    ...enumResources,
    ...schemaResources,
    {
      uri: 'exchange://list',
      name: 'Exchanges list',
      description: 'List of all exchanges with names and mic codes (cached, updates every 2 hours)',
      mimeType: 'application/json',
    },
  ];
}

// Handle resource read requests
export async function handleReadResource(uri: string, secret_token?: string): Promise<string> {
  // Handle enum resources
  const enumResource = ENUM_RESOURCES.find(({ name }) => uri === `enum://${name}`);
  if (enumResource) {
    // Get enum object dynamically by name
    const enumObject = Enums[enumResource.name as keyof typeof Enums];
    // Return array of enum values only (without key duplication)
    const values = Object.values(enumObject);
    return JSON.stringify(values, null, 2);
  }

  // Handle schema resources
  if (uri === 'schema://asset') {
    return assetDescription.trim();
  }
  if (uri === 'schema://order') {
    return orderInfoDescription.trim();
  }

  // Handle exchange resource
  if (uri === 'exchange://list') {
    if (!secret_token) {
      throw new McpError(ErrorCode.InvalidRequest, 'secret_token not configured');
    }
    try {
      const exchanges = await api.ExchangesCached({ secret_token });
      return JSON.stringify(exchanges, null, 2);
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      // Network/timeout errors - throw McpError
      if (error instanceof Error) {
        throw new McpError(ErrorCode.InvalidRequest, error.message);
      }
      throw new McpError(ErrorCode.InvalidRequest, `Unknown error: ${error}`);
    }
  }

  throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
}
