/**
 * MCP Tools Definitions for FINAM Trade API
 *
 * Defines all available tools wrapping API endpoints.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// Create tool definitions with optional account_id default
export function createTools (defaultAccountId?: string): Tool[] {

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
      description: `Get account information:
account_id
type - see enum://AccountType
status - see enum://AccountStatus
equity - Funds available plus value of open positions
unrealized_profit
positions - Positions (open plus theoretical from active unfilled orders). Array of:
    symbol
    quantity - in units (signed value for long/short)
    average_price - (not filled for FORTS positions)
    current_price
    daily_pnl - (not filled for FORTS)
    unrealized_pnl
cash - Own funds available for trading. Does not include margin funds. Array of (Money object)
portfolio_mc? - Portfolio margin metrics
    available_cash - Own funds available for trading (includes margin)
    initial_margin
    maintenance_margin
balance? - Account balance
currency?
`,
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
      description: `Get account trades for specified time interval:
trades: Array of:
  trade_id - (from exchange)
  symbol
  price
  size
  side - SIDE_BUY | SIDE_SELL
  timestamp - (ISO 8601)
  order_id
  account_id
      `,
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
      description: `Get account transactions for specified time interval
transactions - Aray of:
  id
  timestamp - (ISO 8601)
  symbol
  change (Money object)
  transaction_category -  see enum://TransactionCategory
  transaction_name
      `,

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

    // Group 3: Instruments
    {
      name: 'Assets', // 3-1
      description: `Get list of all available assets/instruments.
Array of instruments (see schema://asset resource for field descriptions)`,
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'Clock', // 3-2
      description: 'Get server time (ISO 8601)',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'GetAssetDetails', // 3-4 + 3-5 Combined
      description: `Get detailed information and trading parameters for a specific asset
Asset Information: See schema://asset resource for field descriptions

Trading Parameters:
- symbol
- account_id
- tradeable - is trading allowed
- longable/shortable - Long/Short availability:
    - value - Status (AVAILABLE / NOT_AVAILABLE / HALTED)
    - halted_days - Days remaining for long/short restrictions (if any)
- long_risk_rate
- short_risk_rate
- long_collateral?/short_collateral? - Maintenance collateral for long/short (Money object)
- min_order_size?/max_order_size? - Min/Max order size
- trading_status`,
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
      description: `Get options chain for underlying asset:
symbol
options - Array of:
    symbol - Option instrument symbol
    type - see enum://OptionType
    contract_size - (quantity)
    trade_last_day
    strike - Strike price
    expiration_first_day
    expiration_last_day
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
      description: `Get trading schedule for asset:
symbol
sessions - Array:
    type - see enum://SessionType
    interval:
        start_time - (ISO 8601)
        end_time - (ISO 8601)
      `,
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
      description: `Cancel an existing order.
Returns the canceled order (see schema://order resource for field descriptions)`,
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
      description: `Get specific order details (see schema://order resource for field descriptions)`,
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
      description: `Get details for all orders for account.
Returns array of orders (see schema://order resource for field descriptions)`,
      inputSchema: {
        type: 'object',
        properties: {
          account_id: accountIdProp('Account ID'),
          status_filter: {
            type: 'array',
            description: `Filter orders by status (optional).
Values: see enum://OrderStatus + 'ACTIVE' (for active orders only).
If empty array or not provided, returns all orders.
If non-empty, returns only orders with matching statuses (OR logic).
`,
            items: {
              type: 'string',
            },
          },
          limit: {
            type: 'number',
            description: 'Default 50',
          },

        },
        required: addRequired(),
      },
    },

    {
      name: 'PlaceOrder', // 4-4
      description: `Place a new order.
Returns the created order (see schema://order resource for field descriptions)`,
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
            pattern: "^[A-Za-z0-9 ]+$",
          },
          legs: {
            type: 'array',
            description: 'Order legs for complex orders (optional)',
            items: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Instrument symbol in format: SYMBOL@MIC (e.g. SBER@MISX)',
                },
                quantity: {
                  type: 'number',
                  description: 'Leg quantity',
                },
                side: {
                  type: 'string',
                  enum: ['SIDE_BUY', 'SIDE_SELL'],
                  description: 'Leg side',
                },
              },
              required: ['symbol', 'quantity', 'side'],
            },
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
      description: `Get latest quote for instrument
symbol
quote (for day):
    symbol
    timestamp (ISO 8601)
    ask - price
    ask_size
    bid - price
    bid_size
    last - price
    last_size
    volume
    turnover
    open
    high
    low
    close
    change - Price change (last minus close)
      `,
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
      description: `Get latest trades for instrument (max 100 records)
symbol
trades - Array:
    trade_id
    mpid - Market participant identifier
    timestamp - (ISO 8601)
    price
    size
    side - (buy or sell)
      `,
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
      description: `Get order book for instrument:
symbol
orderbook:
    rows - Array:
        price
        buy_size
        sell_size
        action - see enum://OrderBookAction
        mpid - Market participant identifier
        timestamp - (ISO 8601)
      `,
      inputSchema: {
        type: 'object',
        properties: {
          symbol: symbolProp(),
        },
        required: ['symbol'],
      },
    },

    // Semantic Search
    {
      name: 'SearchInstruments',
      description: `Exact instrument lookup only.
The LLM must infer which strict key the user means and pass exactly one of:
symbol (e.g., SBER@MISX),
isin (e.g., RU000A1014L8),
or ticker (e.g., SBER)

Returns instrument details (see schema://asset resource for field descriptions))
`,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'A strict value of one key: symbol | isin | ticker. Examples: "SBER@MISX", "RU000A1014L8", "SBER".',
          },
        },
        required: ['query'],
      },
    },
  ];
}
