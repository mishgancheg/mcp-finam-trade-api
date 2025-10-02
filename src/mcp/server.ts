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
  type CallToolRequest,
  type Tool,
  type Resource,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import helmet from 'helmet';
import * as api from '../api.js';
import { formatResponse } from './formatters.js';
import * as Enums from '../types/finam-trade-api-enums.js';
import { getInstrumentSearch } from '../services/instrument-search.js';

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
isin? – ISIN identifier
type - see enum://AssetType
board? – Trading mode code
lot_size?
decimals? – Num of decimal digits in price
min_step? – Min price step (for final step: min_step/(10^decimals))
`;

const orderInfoDescription = `
order_id - Order identifier
exec_id - Execution identifier
status - Order status (see enum://OrderStatus)
order – Order details
    account_id – Account identifier
    symbol – Instrument symbol
    quantity – Quantity in units
    side – SIDE_BUY | SIDE_SELL
    type – Order type (see enum://OrderType)
    time_in_force – Time in force (see enum://TimeInForce)
    limit_price? – Required for limit and stop-limit orders
    stop_price? – Required for stop-market and stop-limit orders
    stop_condition – Required for stop-market and stop-limit orders (see enum://StopCondition)
    legs? – Required for multi-leg orders. Array of: { symbol, quantity, side }
    client_order_id – Unique order identifier. Auto-generated if not provided (max 20 characters)
transact_at – Submission date and time
filled_quantity? – Filled quantity
cancel_time? – Cancellation date and time
accept_at? – Acceptance date and time
withdraw_at? – Cancellation date and time
`;

// Create resource definitions for enums
function createResources (): Resource[] {
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
async function handleReadResource (uri: string): Promise<string> {
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
    if (!API_SECRET_TOKEN) {
      throw new McpError(ErrorCode.InvalidRequest, 'API_SECRET_TOKEN not configured');
    }
    try {
      const exchanges = await api.ExchangesCached({ secret_token: API_SECRET_TOKEN });
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

const getAccountResponseDescription = `
account_id
type - see enum://AccountType
status - see enum://AccountStatus
equity - Funds available plus value of open positions
unrealized_profit
positions – Positions (open plus theoretical from active unfilled orders). Array of:
    symbol
    quantity – in units (signed value for long/short)
    average_price – (not filled for FORTS positions)
    current_price
    daily_pnl – (not filled for FORTS)
    unrealized_pnl
cash – Own funds available for trading. Does not include margin funds. Array of (Money object)
portfolio_mc? – Portfolio margin metrics
    available_cash – Own funds available for trading (includes margin)
    initial_margin
    maintenance_margin
balance? – Account balance
currency?
`;

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
      description: `Get account information:
${getAccountResponseDescription}     
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
  trade_id – (from exchange)
  symbol
  price
  size
  side – SIDE_BUY | SIDE_SELL
  timestamp – (ISO 8601)
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
transactions – Aray of:
  id
  timestamp – (ISO 8601)
  symbol
  change (Money object)
  transaction_category –  see enum://TransactionCategory
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
- longable/shortable – Long/Short availability:
    - value – Status (AVAILABLE / NOT_AVAILABLE / HALTED)
    - halted_days – Days remaining for long/short restrictions (if any)
- long_risk_rate
- short_risk_rate
- long_collateral?/short_collateral? – Maintenance collateral for long/short (Money object)
- min_order_size?/max_order_size? – Min/Max order size
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
options – Array of:
    symbol – Option instrument symbol
    type – see enum://OptionType
    contract_size – (quantity)
    trade_last_day
    strike – Strike price
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
sessions – Array:
    type – see enum://SessionType
    interval:
        start_time – (ISO 8601)
        end_time – (ISO 8601)
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
    ask – price
    ask_size
    bid – price
    bid_size
    last – price
    last_size
    volume
    turnover
    open
    high
    low
    close
    change – Price change (last minus close)
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
trades – Array:
    trade_id
    mpid – Market participant identifier
    timestamp – (ISO 8601)
    price
    size
    side – (buy or sell)      
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
    rows – Array:
        price
        buy_size
        sell_size
        action – see enum://OrderBookAction
        mpid – Market participant identifier
        timestamp – (ISO 8601)      
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

  const server = new Server(
    {
      name: 'finam-trade-api',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
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
    const content = await handleReadResource(uri);
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
            const content = await handleReadResource(uri);
            result = {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: content,
                },
              ],
            };
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
