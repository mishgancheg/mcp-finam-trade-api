// noinspection SpellCheckingInspection

/**
 * FINAM Trade API Emulator with Enhanced OMS Features
 * - Persistent state (save/load JSON)
 * - Admin reset endpoint
 * - Background price ticker (every 5s)
 * - Auto-execute LIMIT/STOP orders
 * - WebSocket streaming
 */
// noinspection ES6UnusedImports
import * as _c from '../../dist/src/init-config.js';

import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import {
  generateOrderBook,
  generateRecentTrades,
  executeOrder,
  recalculateAccountMetrics,
  gaussianRandom,
} from './oms-engine.js';
import { INSTRUMENTS, initializeDemoAccount } from './seed-data.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.EMULATOR_PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3006;
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
const DEFAULT_ACCOUNT_ID = process.env.TEST_ACCOUNT_ID;
const STATE_FILE = path.join(__dirname, '_state', 'emulator-state.json');

if (!DEFAULT_ACCOUNT_ID) {
  console.error('ERROR: Environment variable TEST_ACCOUNT_ID is not set');
  process.exit(1);
}

// Extended data store
let dataStore = {
  orders: new Map(),
  positions: new Map(),
  accounts: new Map(),
  trades: new Map(),
  transactions: new Map(),
  marketData: new Map(),
  historicalBars: new Map(),
  orderIdCounter: 68631684267,
  transactionIdCounter: 2556733362,
  tradeIdCounter: 1000000,
  execIdCounter: 1753326668360281,
};

// WebSocket clients
const wsClients = new Set();

// Broadcast to all WebSocket clients
function broadcast (message) {
  const data = JSON.stringify(message);
  wsClients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(data);
    }
  });
}

/**
 * Save state to JSON file
 */
function saveState () {
  try {
    const stateDir = path.dirname(STATE_FILE);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    const state = {
      timestamp: new Date().toISOString(),
      accounts: Array.from(dataStore.accounts.entries()),
      orders: Array.from(dataStore.orders.entries()),
      positions: Array.from(dataStore.positions.entries()),
      trades: Array.from(dataStore.trades.entries()),
      transactions: Array.from(dataStore.transactions.entries()),
      marketData: Array.from(dataStore.marketData.entries()),
      historicalBars: Array.from(dataStore.historicalBars.entries()),
      counters: {
        orderIdCounter: dataStore.orderIdCounter,
        transactionIdCounter: dataStore.transactionIdCounter,
        tradeIdCounter: dataStore.tradeIdCounter,
        execIdCounter: dataStore.execIdCounter,
      },
    };

    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log(`💾 State saved to ${STATE_FILE}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to save state:', error.message);
    return false;
  }
}

/**
 * Load state from JSON file
 */
function loadState () {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      console.log('📂 No saved state found, will initialize fresh data');
      return false;
    }

    const data = fs.readFileSync(STATE_FILE, 'utf-8');
    const state = JSON.parse(data);

    dataStore.accounts = new Map(state.accounts);
    dataStore.orders = new Map(state.orders);
    dataStore.positions = new Map(state.positions);
    dataStore.trades = new Map(state.trades);
    dataStore.transactions = new Map(state.transactions);
    dataStore.marketData = new Map(state.marketData);
    dataStore.historicalBars = new Map(state.historicalBars);

    if (state.counters) {
      dataStore.orderIdCounter = state.counters.orderIdCounter;
      dataStore.transactionIdCounter = state.counters.transactionIdCounter;
      dataStore.tradeIdCounter = state.counters.tradeIdCounter;
      dataStore.execIdCounter = state.counters.execIdCounter;
    }

    console.log(`📂 State loaded from ${STATE_FILE} (saved at ${state.timestamp})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to load state:', error.message);
    return false;
  }
}

/**
 * Reset state to initial
 */
function resetState () {
  console.log('\n🔄 Resetting state...');

  // Clear all data
  dataStore.accounts.clear();
  dataStore.orders.clear();
  dataStore.positions.clear();
  dataStore.trades.clear();
  dataStore.transactions.clear();
  dataStore.marketData.clear();
  dataStore.historicalBars.clear();

  // Reset counters
  dataStore.orderIdCounter = 68631684267;
  dataStore.transactionIdCounter = 2556733362;
  dataStore.tradeIdCounter = 1000000;
  dataStore.execIdCounter = 1753326668360281;

  // Initialize fresh data
  initializeDemoAccount(DEFAULT_ACCOUNT_ID, 3, dataStore);

  // Save new state
  saveState();

  // Broadcast reset event
  broadcast({
    type: 'system',
    event: 'reset',
    timestamp: new Date().toISOString(),
  });

  console.log('✅ State reset complete');
}

/**
 * Update market prices (background ticker)
 */
function updateMarketPrices () {
  let pricesUpdated = false;

  dataStore.marketData.forEach((quote) => {
    // Random price change: ±0.5% from current price
    const currentPrice = parseFloat(quote.last.value);
    const change = gaussianRandom(0, 0.005); // 0.5% volatility
    const newPrice = Math.max(currentPrice * (1 + change), 0.01);

    // Update quote
    quote.last.value = newPrice.toFixed(2);
    quote.bid.value = (newPrice - 0.01).toFixed(2);
    quote.ask.value = (newPrice + 0.01).toFixed(2);
    quote.timestamp = new Date().toISOString();
    quote.change.value = (newPrice - parseFloat(quote.open.value)).toFixed(2);

    pricesUpdated = true;
  });

  if (pricesUpdated) {
    // Broadcast price update
    broadcast({
      type: 'market_data',
      event: 'price_update',
      timestamp: new Date().toISOString(),
      quotes: Array.from(dataStore.marketData.entries()).map(([symbol, quote]) => ({
        symbol,
        last: quote.last.value,
        bid: quote.bid.value,
        ask: quote.ask.value,
      })),
    });

    // Check for LIMIT/STOP orders to execute
    autoExecuteOrders();
  }
}

/**
 * Auto-execute LIMIT and STOP orders when price conditions are met
 */
function autoExecuteOrders () {
  const activeOrders = Array.from(dataStore.orders.values())
    .filter(o => o.status === 'ORDER_STATUS_NEW' || o.status === 'ORDER_STATUS_PARTIALLY_FILLED');

  activeOrders.forEach(order => {
    const currentPrice = getCurrentMarketPrice(order.symbol);
    const result = executeOrder(order, currentPrice, dataStore);

    if (result.status === 'filled') {
      console.log(`⚡ Auto-executed: ${order.side} ${order.remaining_quantity} ${order.symbol} @ ${currentPrice}`);

      // Recalculate account metrics
      recalculateAccountMetrics(order.account_id, dataStore);

      // Broadcast order execution
      broadcast({
        type: 'order',
        event: 'executed',
        timestamp: new Date().toISOString(),
        order: {
          order_id: order.order_id,
          symbol: order.symbol,
          side: order.side,
          status: order.status,
          filled_quantity: order.filled_quantity,
        },
      });

      // Save state after execution
      saveState();
    }
  });
}

/**
 * Generate JWT token
 */
function generateJwtToken () {
  const payload = {
    area: 'tt',
    created: Date.now().toString(),
    exp: Math.floor(Date.now() / 1000) + 900,
    jti: crypto.randomUUID(),
    iss: 'emulator',
    scope: 'CAEQDQ',
  };
  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Verify authorization header
 */
function verifyAuthHeader (authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return false;
  }
  if (authHeader.startsWith('Bearer ')) {
    return false;
  }
  return authHeader.trim().length !== 0;
}

/**
 * Auth middleware
 */
function authMiddleware (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!verifyAuthHeader(authHeader)) {
    return res.status(401).json({
      code: 16,
      message: 'UNAUTHENTICATED: Authorization header must be present and not start with Bearer',
      details: [],
    });
  }
  next();
}

/**
 * Get current market price for symbol
 */
function getCurrentMarketPrice (symbol) {
  const quote = dataStore.marketData.get(symbol);
  return quote ? parseFloat(quote.last.value) : 250;
}

const { LOG_ACCOUNT } = process.env;
const logAccountId = (account_id) => {
  if (LOG_ACCOUNT) {
    console.log(chalk[account_id ? 'bgGreen' : 'bgRed'](`EMULATOR2: account_id ${account_id}`));
  }
};

/**
 * Create Express application
 */
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);

  if (req.body && Object.keys(req.body).length > 0) {
    console.log('  Body:', JSON.stringify(req.body, null, 2));
  }
  if (Object.keys(req.query).length > 0) {
    console.log('  Query:', req.query);
  }
  if (req.headers.authorization) {
    console.log('  Auth:', req.headers.authorization.substring(0, 30) + '...');
  }

  next();
});

// ==================== ADMIN ENDPOINTS ====================

// Admin: Reset state
app.post('/admin/reset', (req, res) => {
  resetState();
  res.json({
    success: true,
    message: 'State reset successfully',
    timestamp: new Date().toISOString(),
  });
});

// Admin: Save state
app.post('/admin/save', (req, res) => {
  const success = saveState();
  res.json({
    success,
    message: success ? 'State saved successfully' : 'Failed to save state',
    file: STATE_FILE,
    timestamp: new Date().toISOString(),
  });
});

// Admin: Get status
app.get('/admin/status', (req, res) => {
  const account = dataStore.accounts.get(DEFAULT_ACCOUNT_ID);

  res.json({
    uptime: process.uptime(),
    state_file: STATE_FILE,
    state_exists: fs.existsSync(STATE_FILE),
    ws_clients: wsClients.size,
    account: {
      id: DEFAULT_ACCOUNT_ID,
      equity: account?.equity?.value,
      positions: account?.positions?.length || 0,
    },
    data: {
      orders: dataStore.orders.size,
      trades: dataStore.trades.size,
      transactions: dataStore.transactions.size,
      instruments: dataStore.marketData.size,
    },
  });
});

// ==================== GROUP 1: Authentication ====================

app.post('/v1/sessions', (req, res) => {
  const { secret } = req.body;

  if (!secret || secret.length < 100) {
    return res.status(401).json({
      code: 16,
      message: 'UNAUTHENTICATED: Invalid secret token',
      details: [],
    });
  }

  const token = generateJwtToken();
  res.json({ token });
});

app.post('/v1/sessions/details', (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return res.status(401).json({
      code: 16,
      message: 'UNAUTHENTICATED: Token is required',
      details: [],
    });
  }

  res.json({
    created_at: new Date(Date.now() - 900000).toISOString(),
    expires_at: new Date(Date.now() + 900000).toISOString(),
    md_permissions: ['EQUITIES'],
    account_ids: [`TRQD05:${DEFAULT_ACCOUNT_ID}`],
    readonly: false,
  });
});

// ==================== GROUP 2: Accounts ====================

app.get('/v1/accounts/:account_id', authMiddleware, (req, res) => {
  const { account_id } = req.params;
  logAccountId(req.params.account_id);

  recalculateAccountMetrics(account_id, dataStore);

  const account = dataStore.accounts.get(account_id);
  if (!account) {
    return res.status(404).json({
      code: 5,
      message: 'NOT_FOUND: Account not found',
      details: [],
    });
  }

  res.json(account);
});

app.get('/v1/accounts/:account_id/trades', authMiddleware, (req, res) => {
  const { account_id } = req.params;
  logAccountId(req.params.account_id);

  const { 'interval.start_time': startTime, 'interval.end_time': endTime } = req.query;

  let trades = Array.from(dataStore.trades.values())
    .filter(t => t.account_id === account_id);

  if (startTime) {
    trades = trades.filter(t => new Date(t.timestamp) >= new Date(startTime));
  }
  if (endTime) {
    trades = trades.filter(t => new Date(t.timestamp) <= new Date(endTime));
  }

  trades.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({ trades, total: trades.length });
});

app.get('/v1/accounts/:account_id/transactions', authMiddleware, (req, res) => {
  const { account_id } = req.params;
  logAccountId(req.params.account_id);

  const { 'interval.start_time': startTime, 'interval.end_time': endTime } = req.query;

  let transactions = Array.from(dataStore.transactions.values())
    .filter(t => t.account_id === account_id);

  if (startTime) {
    transactions = transactions.filter(t => new Date(t.timestamp) >= new Date(startTime));
  }
  if (endTime) {
    transactions = transactions.filter(t => new Date(t.timestamp) <= new Date(endTime));
  }

  transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({ transactions, total: transactions.length });
});

// ==================== GROUP 3: Instruments ====================

app.get('/v1/assets', authMiddleware, (req, res) => {
  const assets = INSTRUMENTS.map(inst => {
    // eslint-disable-next-line no-unused-vars
    const { mic, startPrice, volatility, trend, sector, baseVolume, ...asset } = inst;
    return asset;
  }).slice(0, 1000);

  res.json({ assets });
});

app.get('/v1/assets/clock', authMiddleware, (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
  });
});

app.get('/v1/exchanges', authMiddleware, (req, res) => {
  res.json({
    exchanges: [
      {
        name: 'Московская биржа',
        code: 'MISX',
        country: 'RU',
      },
    ],
  });
});

app.get('/v1/assets/:symbol', authMiddleware, (req, res) => {
  const { symbol } = req.params;

  const instrument = INSTRUMENTS.find(i => i.symbol === symbol);
  if (!instrument) {
    return res.status(404).json({
      code: 5,
      message: `NOT_FOUND: Instrument ${symbol} not found`,
      details: [],
    });
  }

  // eslint-disable-next-line no-unused-vars
  const { startPrice, volatility, trend, sector, baseVolume, ...asset } = instrument;
  res.json(asset);
});

app.get('/v1/assets/:symbol/params', authMiddleware, (req, res) => {
  const { account_id } = req.query;
  logAccountId(req.query.account_id);

  res.json({
    account_id: account_id || DEFAULT_ACCOUNT_ID,
    min_lot_size: { value: '1' },
    max_lot_size: { value: '1000' },
  });
});

app.get('/v1/assets/:symbol/options', authMiddleware, (req, res) => {
  const { symbol } = req.params;

  res.json({
    symbol,
    options: [],
  });
});

app.get('/v1/assets/:symbol/schedule', authMiddleware, (req, res) => {
  const { symbol } = req.params;

  res.json({
    symbol,
    sessions: [
      {
        type: 'CORE_TRADING',
        interval: {
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        },
      },
    ],
  });
});

// ==================== GROUP 4: Orders ====================

app.delete('/v1/accounts/:account_id/orders/:order_id', authMiddleware, (req, res) => {
  const { order_id } = req.params;
  logAccountId(req.params.account_id);

  const order = dataStore.orders.get(order_id);
  if (!order) {
    return res.status(404).json({
      code: 5,
      message: 'NOT_FOUND: Order not found',
      details: [],
    });
  }

  if (order.status === 'ORDER_STATUS_FILLED' || order.status === 'ORDER_STATUS_CANCELED') {
    return res.status(400).json({
      code: 3,
      message: 'Order cannot be canceled',
    });
  }

  order.status = 'ORDER_STATUS_CANCELED';
  order.cancel_time = new Date().toISOString();
  order.exec_id = `ord.${order.order_id}.${dataStore.execIdCounter++}`;
  order.transact_at = new Date().toISOString();

  // Save state and broadcast
  saveState();
  broadcast({
    type: 'order',
    event: 'canceled',
    timestamp: new Date().toISOString(),
    order: { order_id: order.order_id, status: order.status },
  });

  res.json(order);
});

app.get('/v1/accounts/:account_id/orders/:order_id', authMiddleware, (req, res) => {
  const { order_id } = req.params;
  logAccountId(req.params.account_id);

  const order = dataStore.orders.get(order_id);
  if (!order) {
    return res.status(404).json({
      code: 5,
      message: 'NOT_FOUND: Order not found',
      details: [],
    });
  }

  res.json(order);
});

app.get('/v1/accounts/:account_id/orders', authMiddleware, (req, res) => {
  const { account_id } = req.params;
  logAccountId(req.params.account_id);
  const { status } = req.query;

  let orders = Array.from(dataStore.orders.values())
    .filter(o => o.account_id === account_id);

  if (status) {
    orders = orders.filter(o => o.status === status);
  }

  orders.sort((a, b) => new Date(b.transact_at) - new Date(a.transact_at));

  res.json({ orders, total: orders.length });
});

app.post('/v1/accounts/:account_id/orders', authMiddleware, (req, res) => {
  const { account_id } = req.params;
  logAccountId(req.params.account_id);
  const orderData = req.body;

  const orderId = `${dataStore.orderIdCounter++}`;
  const execId = `ord.${orderId}.${dataStore.execIdCounter++}`;

  const order = {
    order_id: orderId,
    exec_id: execId,
    status: 'ORDER_STATUS_NEW',
    account_id,
    symbol: orderData.symbol,
    quantity: orderData.quantity,
    filled_quantity: '0',
    remaining_quantity: orderData.quantity.value,
    side: orderData.side,
    type: orderData.type,
    time_in_force: orderData.time_in_force,
    limit_price: orderData.limit_price,
    stop_price: orderData.stop_price,
    client_order_id: orderData.client_order_id || `CLT${orderId}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    transact_at: new Date().toISOString(),
  };

  dataStore.orders.set(orderId, order);

  // Try to execute immediately
  const currentPrice = getCurrentMarketPrice(order.symbol);
  executeOrder(order, currentPrice, dataStore);

  // Save state and broadcast
  saveState();
  broadcast({
    type: 'order',
    event: 'placed',
    timestamp: new Date().toISOString(),
    order: {
      order_id: order.order_id,
      symbol: order.symbol,
      side: order.side,
      status: order.status,
    },
  });

  res.json(order);
});

// ==================== GROUP 5: Market Data ====================

app.get('/v1/instruments/:symbol/bars', authMiddleware, (req, res) => {
  const { symbol } = req.params;
  const { 'interval.start_time': startTime, 'interval.end_time': endTime } = req.query;

  let bars = dataStore.historicalBars.get(symbol) || [];

  if (startTime) {
    bars = bars.filter(b => new Date(b.timestamp) >= new Date(startTime));
  }
  if (endTime) {
    bars = bars.filter(b => new Date(b.timestamp) <= new Date(endTime));
  }

  res.json({ symbol, bars });
});

app.get('/v1/instruments/:symbol/quotes/latest', authMiddleware, (req, res) => {
  const { symbol } = req.params;
  const quote = dataStore.marketData.get(symbol);

  if (!quote) {
    return res.status(404).json({
      code: 5,
      message: `Symbol ${symbol} not found`,
    });
  }

  res.json({
    symbol,
    quote,
    bid: quote.bid,
    ask: quote.ask,
    last_price: quote.last,
    volume: quote.volume,
  });
});

app.get('/v1/instruments/:symbol/trades/latest', authMiddleware, (req, res) => {
  const { symbol } = req.params;
  const quote = dataStore.marketData.get(symbol);

  if (!quote) {
    return res.status(404).json({
      code: 5,
      message: `Symbol ${symbol} not found`,
    });
  }

  const trades = generateRecentTrades(symbol, quote.last.value, 100);

  res.json({ symbol, trades });
});

app.get('/v1/instruments/:symbol/orderbook', authMiddleware, (req, res) => {
  const { symbol } = req.params;
  const quote = dataStore.marketData.get(symbol);

  if (!quote) {
    return res.status(404).json({
      code: 5,
      message: `Symbol ${symbol} not found`,
    });
  }

  const orderbook = generateOrderBook(symbol, quote.bid.value, quote.ask.value, 10);

  res.json({
    symbol,
    orderbook: {
      rows: [
        ...orderbook.bids.map(b => ({
          price: b.price,
          buy_size: b.quantity,
          action: b.action,
          mpid: 'MISX',
          timestamp: new Date().toISOString(),
        })),
        ...orderbook.asks.map(a => ({
          price: a.price,
          sell_size: a.quantity,
          action: a.action,
          mpid: 'MISX',
          timestamp: new Date().toISOString(),
        })),
      ],
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    code: 5,
    message: `NOT_FOUND: Endpoint ${req.method} ${req.path} not found`,
    details: [],
  });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({
    code: 13,
    message: 'INTERNAL: Internal server error',
    details: [],
  });
});

/**
 * Check if port is available
 */
function checkPort (port) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          reject(err);
        }
      })
      .once('listening', () => {
        tester.once('close', () => {
          resolve(true);
        }).close();
      })
      .listen(port);
  });
}

// Initialize and start server
checkPort(PORT)
  .then((isAvailable) => {
    if (!isAvailable) {
      console.error(`\n❌ Error: Port ${PORT} is already in use`);
      console.error(`\n💡 To free the port, run: node scripts\\kill-port.js ${PORT}`);
      console.error(`   or: scripts\\kill-emulator.bat\n`);
      process.exit(1);
    }

    // Try to load saved state
    console.log('\n🚀 Initializing Enhanced OMS Emulator...');
    const stateLoaded = loadState();

    if (!stateLoaded) {
      // Initialize fresh data
      initializeDemoAccount(DEFAULT_ACCOUNT_ID, 3, dataStore);
      // Save initial state
      saveState();
    }

    // Start background price ticker (every 5 seconds)
    setInterval(() => {
      updateMarketPrices();
    }, 5000);
    console.log('⏰  Background price ticker started (every 5s)');

    // Start WebSocket server
    const wss = new WebSocketServer({ port: WS_PORT });

    wss.on('connection', (ws) => {
      wsClients.add(ws);
      console.log(`📡 WebSocket client connected (total: ${wsClients.size})`);

      // Send initial data
      ws.send(JSON.stringify({
        type: 'system',
        event: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Connected to FINAM OMS Emulator',
      }));

      ws.on('close', () => {
        wsClients.delete(ws);
        console.log(`📡 WebSocket client disconnected (total: ${wsClients.size})`);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        wsClients.delete(ws);
      });
    });

    console.log(`📡 WebSocket server started on port ${WS_PORT}`);

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`\n✅  FINAM Trade API Emulator (Enhanced OMS) started`);
      console.log('\n📍 Available endpoints:');
      console.log('  POST   /admin/reset                                     - Reset state');
      console.log('  POST   /admin/save                                      - Save state');
      console.log('  GET    /admin/status                                    - Get status');
      console.log('  POST   /v1/sessions                                     - Get JWT token');
      console.log('  POST   /v1/sessions/details                             - Token details');
      console.log('  GET    /v1/accounts/{account_id}                        - Account info');
      console.log('  GET    /v1/accounts/{account_id}/trades                 - Trade history');
      console.log('  GET    /v1/accounts/{account_id}/transactions           - Transactions');
      console.log('  GET    /v1/assets                                       - List instruments');
      console.log('  GET    /v1/assets/clock                                 - Server time');
      console.log('  GET    /v1/exchanges                                    - List exchanges');
      console.log('  GET    /v1/assets/{symbol}                              - Instrument info');
      console.log('  GET    /v1/assets/{symbol}/params                       - Trading params');
      console.log('  GET    /v1/assets/{symbol}/options                      - Options chain');
      console.log('  GET    /v1/assets/{symbol}/schedule                     - Trading schedule');
      console.log('  POST   /v1/accounts/{account_id}/orders                 - Place order');
      console.log('  DELETE /v1/accounts/{account_id}/orders/{order_id}      - Cancel order');
      console.log('  GET    /v1/accounts/{account_id}/orders                 - List orders');
      console.log('  GET    /v1/accounts/{account_id}/orders/{order_id}      - Order info');
      console.log('  GET    /v1/instruments/{symbol}/bars                    - Historical bars');
      console.log('  GET    /v1/instruments/{symbol}/quotes/latest           - Latest quote');
      console.log('  GET    /v1/instruments/{symbol}/trades/latest           - Latest trades');
      console.log('  GET    /v1/instruments/{symbol}/orderbook               - Order book');
      console.log(`\n🔗 HTTP API: http://localhost:${PORT}`);
      console.log(`📡 WebSocket: ws://localhost:${WS_PORT}`);
      console.log(`🔑 JWT Secret: ${JWT_SECRET}`);
      console.log(`📝 Default Account ID: ${DEFAULT_ACCOUNT_ID}`);
      console.log(`💾 State File: ${STATE_FILE}`);
      console.log('\n⚡ Ready with enhanced features:');
      console.log('   ✅  Persistent state (auto-save on changes)');
      console.log('   ✅  Admin endpoints (/admin/reset, /admin/save, /admin/status)');
      console.log('   ✅  Background price ticker (every 5s)');
      console.log('   ✅  Auto-execute LIMIT/STOP orders');
      console.log('   ✅  WebSocket streaming\n');
    });
  })
  .catch((err) => {
    console.error(`\n❌  Error checking port ${PORT}:`, err.message);
    process.exit(1);
  });
