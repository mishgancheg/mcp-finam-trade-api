// noinspection SpellCheckingInspection

/**
 * FINAM Trade API Emulator
 * Complete emulator for FINAM Trade API endpoints for testing and development
 */
// noinspection ES6UnusedImports
import * as _c from '../../dist/src/init-config.js';

import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import net from 'net';
import { getMockResponse } from './data/data.js';

// Configuration
const PORT = process.env.EMULATOR_PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
const DEFAULT_ACCOUNT_ID = process.env.ACCOUNT_ID || '1899011';

// Store for dynamic data
const dataStore = {
  orders: new Map(),
  positions: new Map(),
  accounts: new Map(),
  orderIdCounter: 68631684267,
  transactionIdCounter: 2556733362,
  tradeIdCounter: 1234567890,
  execIdCounter: 1753326668360281,
};

// Initialize default account
dataStore.accounts.set(DEFAULT_ACCOUNT_ID, {
  account_id: DEFAULT_ACCOUNT_ID,
  type: 'UNION',
  status: 'ACCOUNT_ACTIVE',
  equity: { value: '100000.00' },
  unrealized_profit: { value: '0.00' },
  positions: [],
  cash: [
    {
      currency_code: 'RUB',
      units: '100000',
      nanos: 0,
    },
  ],
  portfolio_mc: {
    available_cash: { value: '100000.00' },
    initial_margin: { value: '0.00' },
    maintenance_margin: { value: '0.00' },
  },
});

/**
 * Generate JWT token
 */
function generateJwtToken () {
  const payload = {
    area: 'tt',
    created: Date.now().toString(),
    exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
    jti: crypto.randomUUID(),
    iss: 'emulator',
    scope: 'CAEQDQ',
  };
  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Verify authorization header
 * Should contain a string but NOT start with "Bearer"
 */
function verifyAuthHeader (authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return false;
  }
  // Проверяем, что заголовок НЕ начинается с Bearer
  if (authHeader.startsWith('Bearer ')) {
    return false;
  }
  // Проверяем, что заголовок не пустой
  return authHeader.trim().length !== 0;
}

/**
 * Auth middleware for protected endpoints
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
 * Create Express application
 */
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
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

// ==================== Группа 1: Подключение ====================

// 1-1: Auth - Получение JWT токена
app.post('/v1/sessions', (req, res) => {
  const { secret } = req.body;

  // Простая проверка секретного токена
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

// 1-2: TokenDetails - Информация о JWT токене
app.post('/v1/sessions/details', (req, res) => {
  const { token } = req.body;

  // Просто проверяем наличие токена, без валидации
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return res.status(401).json({
      code: 16,
      message: 'UNAUTHENTICATED: Token is required',
      details: [],
    });
  }
  const result = {
    created_at: new Date(Date.now() - 900000).toISOString(),
    expires_at: new Date(Date.now() + 900000).toISOString(),
    md_permissions: getMockResponse('1-2').data.md_permissions,
    account_ids: [`TRQD05:${DEFAULT_ACCOUNT_ID}`],
    readonly: false,
  };
  res.json(result);
});

// ==================== Группа 2: Счета ====================

// 2-1: GetAccount - Информация по аккаунту
app.get('/v1/accounts/:account_id', authMiddleware, (req, res) => {
  const { account_id } = req.params;

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

// 2-2: Trades - История сделок
app.get('/v1/accounts/:account_id/trades', authMiddleware, (req, res) => {
  const { account_id } = req.params;

  res.json({
    trades: [
      {
        trade_id: `T${dataStore.tradeIdCounter++}`,
        symbol: 'SBER@MISX',
        price: { value: '250.00' },
        size: { value: '10' },
        side: 'SIDE_BUY',
        timestamp: new Date().toISOString(),
        order_id: 'O123456',
        account_id,
      },
    ],
    total: 1,
  });
});

// 2-3: Transactions - Список транзакций
app.get('/v1/accounts/:account_id/transactions', authMiddleware, (req, res) => {
  // const { account_id } = req.params;

  res.json({
    transactions: [
      {
        id: `${dataStore.transactionIdCounter++}`,
        category: 'COMMISSION',
        timestamp: new Date().toISOString(),
        symbol: '',
        change: {
          currency_code: 'RUB',
          units: '-1',
          nanos: -6400000,
        },
        transaction_category: 'COMMISSION',
        transaction_name: 'Брокерская комиссия',
      },
    ],
    total: 1,
  });
});

// ==================== Группа 3: Инструменты ====================

// 3-1: Assets - Список доступных инструментов
app.get('/v1/assets', authMiddleware, (req, res) => {
  const { assets } = getMockResponse('3-1').data;
  res.json({ assets });
});

// 3-2: Clock - Время на сервере
app.get('/v1/assets/clock', authMiddleware, (req, res) => {
  const now = new Date();
  res.json({
    timestamp: now.toISOString(),
  });
});

// 3-3: Exchanges - Список доступных бирж
app.get('/v1/exchanges', authMiddleware, (req, res) => {
  const { exchanges } = getMockResponse('3-3').data;
  res.json({ exchanges });
});

// 3-4: GetAsset - Информация по конкретному инструменту
app.get('/v1/assets/:symbol', authMiddleware, (req, res) => {
  const { symbol } = req.params;

  const instruments = {
    'SBER@MISX': {
      symbol: 'SBER@MISX',
      id: 'SBER',
      ticker: 'SBER',
      mic: 'MISX',
      isin: 'RU0009029540',
      type: 'EQUITIES',
      name: 'Сбербанк',
      board: 'TQBR',
      lot_size: { value: '10' },
      decimals: 2,
      min_step: '0.01',
      exchange: 'Московская биржа',
      currency: 'RUB',
    },
    'YDEX@MISX': {
      symbol: 'YDEX@MISX',
      id: 'YDEX',
      ticker: 'YDEX',
      mic: 'MISX',
      isin: 'RU0009092134',
      type: 'EQUITIES',
      name: 'Яндекс',
      board: 'TQBR',
      lot_size: { value: '1' },
      decimals: 1,
      min_step: '0.2',
      exchange: 'Московская биржа',
      currency: 'RUB',
    },
    'AFLT@MISX': {
      symbol: 'AFLT@MISX',
      id: 'AFLT',
      ticker: 'AFLT',
      mic: 'MISX',
      isin: 'RU0009062285',
      type: 'EQUITIES',
      name: 'Аэрофлот',
      board: 'TQBR',
      lot_size: { value: '10' },
      decimals: 2,
      min_step: '0.01',
      exchange: 'Московская биржа',
      currency: 'RUB',
    },
  };

  const instrument = instruments[symbol];
  if (!instrument) {
    return res.status(404).json({
      code: 5,
      message: `NOT_FOUND: Instrument ${symbol} not found`,
      details: [],
    });
  }

  res.json(instrument);
});

// 3-5: GetAssetParams - Торговые параметры инструмента
app.get('/v1/assets/:symbol/params', authMiddleware, (req, res) => {
  const { symbol } = req.params;
  const { account_id } = req.query;
  const { data } = getMockResponse('3-5');
  data.account_id = account_id || DEFAULT_ACCOUNT_ID;
  res.json(data);
});

// 3-6: OptionsChain - Цепочка опционов
app.get('/v1/assets/:symbol/options', authMiddleware, (req, res) => {
  const { symbol } = req.params;

  res.json({
    symbol,
    options: [
      {
        symbol: `${symbol.split('@')[0]}15000BA5@MISX`,
        type: 'TYPE_CALL',
        contract_size: { value: '1' },
        trade_last_day: { year: 2025, month: 3, day: 20 },
        strike: { value: '15000' },
        expiration_first_day: { year: 2025, month: 3, day: 1 },
        expiration_last_day: { year: 2025, month: 3, day: 20 },
      },
    ],
  });
});

// 3-7: Schedule - Расписание торгов
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

// ==================== Группа 4: Заявки ====================

// 4-1: CancelOrder - Отмена заявки
app.delete('/v1/accounts/:account_id/orders/:order_id', authMiddleware, (req, res) => {
  // const { account_id } = req.params;
  const { order_id } = req.params;

  const order = dataStore.orders.get(order_id);
  if (!order) {
    return res.status(404).json({
      code: 5,
      message: 'NOT_FOUND: Order not found',
      details: [],
    });
  }

  order.status = 'ORDER_STATUS_CANCELED';
  order.cancel_time = new Date().toISOString();

  res.json(order);
});

// 4-2: GetOrder - Информация по заявке
app.get('/v1/accounts/:account_id/orders/:order_id', authMiddleware, (req, res) => {
  const { order_id } = req.params;

  const order = dataStore.orders.get(order_id);
  if (!order) {
    return res.status(404).json({
      code: 5,
      message: 'NOT_FOUND: Order not found',
      details: [],
    });
  }

  res.json({
    ...order,
    filled_quantity: { value: '0' },
  });
});

// 4-3: GetOrders - Список заявок
app.get('/v1/accounts/:account_id/orders', authMiddleware, (req, res) => {
  const { account_id } = req.params;

  const accountOrders = Array.from(dataStore.orders.values())
    .filter(order => order.order.account_id === account_id);

  res.json({
    orders: accountOrders,
    total: accountOrders.length,
  });
});

// 4-4: PlaceOrder - Размещение заявки
app.post('/v1/accounts/:account_id/orders', authMiddleware, (req, res) => {
  const { account_id } = req.params;
  const order = req.body;

  const orderId = `${dataStore.orderIdCounter++}`;
  const execId = `ord.${orderId}.${dataStore.execIdCounter++}`;

  const newOrder = {
    order_id: orderId,
    exec_id: execId,
    status: 'ORDER_STATUS_NEW',
    order: {
      account_id,
      ...order,
    },
    transact_at: new Date().toISOString(),
  };

  dataStore.orders.set(orderId, newOrder);
  res.json(newOrder);
});

// ==================== Группа 5: Рыночные данные ====================

// 5-1: Bars - Исторические данные (свечи)
app.get('/v1/instruments/:symbol/bars', authMiddleware, (req, res) => {
  const { symbol } = req.params;

  const bars = [];
  const startTime = new Date(req.query['interval.start_time'] || Date.now() - 7 * 24 * 60 * 60 * 1000);
  const endTime = new Date(req.query['interval.end_time'] || Date.now());
  const currentDate = new Date(startTime);

  while (currentDate <= endTime) {
    bars.push({
      timestamp: currentDate.toISOString(),
      open: { value: (3200 + Math.random() * 100).toFixed(2) },
      high: { value: (3250 + Math.random() * 100).toFixed(2) },
      low: { value: (3180 + Math.random() * 100).toFixed(2) },
      close: { value: (3230 + Math.random() * 100).toFixed(2) },
      volume: { value: Math.floor(100000 + Math.random() * 50000).toString() },
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  res.json({
    symbol,
    bars,
  });
});

// 5-2: LastQuote - Последняя котировка
app.get('/v1/instruments/:symbol/quotes/latest', authMiddleware, (req, res) => {
  const { symbol } = req.params;

  const price = (250 + Math.random() * 10).toFixed(2);

  res.json({
    symbol,
    quote: {
      symbol,
      timestamp: new Date().toISOString(),
      ask: { value: (parseFloat(price) + 0.5).toFixed(2) },
      ask_size: { value: '50' },
      bid: { value: price },
      bid_size: { value: '100' },
      last: { value: price },
      last_size: { value: '25' },
      volume: { value: '150000' },
      turnover: { value: '37500000.00' },
      open: { value: (parseFloat(price) - 5).toFixed(2) },
      high: { value: (parseFloat(price) + 10).toFixed(2) },
      low: { value: (parseFloat(price) - 10).toFixed(2) },
      close: { value: price },
      change: { value: '5.00' },
    },
    bid: { value: price },
    ask: { value: (parseFloat(price) + 0.5).toFixed(2) },
    last_price: { value: price },
    volume: { value: '150000' },
  });
});

// 5-3: LatestTrades - Последние сделки
app.get('/v1/instruments/:symbol/trades/latest', authMiddleware, (req, res) => {
  const { symbol } = req.params;

  const trades = [];
  for (let i = 0; i < 5; i++) {
    trades.push({
      trade_id: `T${dataStore.tradeIdCounter++}`,
      mpid: 'MISX',
      timestamp: new Date(Date.now() - i * 5000).toISOString(),
      price: { value: (250 + Math.random() * 10).toFixed(2) },
      size: { value: Math.floor(10 + Math.random() * 100).toString() },
      side: Math.random() > 0.5 ? 'SIDE_BUY' : 'SIDE_SELL',
    });
  }

  res.json({
    symbol,
    trades,
  });
});

// 5-4: OrderBook - Стакан заявок
app.get('/v1/instruments/:symbol/orderbook', authMiddleware, (req, res) => {
  const { symbol } = req.params;

  const rows = [];
  const basePrice = 250;

  // Генерируем заявки на продажу
  for (let i = 0; i < 5; i++) {
    rows.push({
      price: { value: (basePrice + i * 0.5).toFixed(2) },
      sell_size: { value: Math.floor(10 + Math.random() * 100).toString() },
      action: 'ACTION_ADD',
      mpid: 'MISX',
      timestamp: new Date().toISOString(),
    });
  }

  // Генерируем заявки на покупку
  for (let i = 1; i <= 5; i++) {
    rows.push({
      price: { value: (basePrice - i * 0.5).toFixed(2) },
      buy_size: { value: Math.floor(10 + Math.random() * 100).toString() },
      action: 'ACTION_ADD',
      mpid: 'MISX',
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    symbol,
    orderbook: {
      rows,
    },
  });
});

// Обработка несуществующих маршрутов
app.use((req, res) => {
  res.status(404).json({
    code: 5,
    message: `NOT_FOUND: Endpoint ${req.method} ${req.path} not found`,
    details: [],
  });
});

// Обработка ошибок
app.use((err, req, res) => {
  console.error('Error:', err);
  // noinspection JSUnresolvedReference
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

// Check port before starting
checkPort(PORT)
  .then((isAvailable) => {
    if (!isAvailable) {
      console.error(`\n❌ Error: Port ${PORT} is already in use`);
      console.error(`\n💡 To free the port, run: scripts\\kill-port.bat ${PORT}`);
      console.error(`   or: scripts\\kill-emulator.bat\n`);
      process.exit(1);
    }

    // Start server if port is available
    app.listen(PORT, () => {
      console.log(`\n✅ FINAM Trade API Emulator started`);
      console.log('\n📍 Available endpoints:');
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
      console.log(`\n🔗 Base URL: http://localhost:${PORT}`);
      console.log(`🔑 JWT Secret: ${JWT_SECRET}`);
      console.log(`📝 Default Account ID: ${DEFAULT_ACCOUNT_ID}`);
      console.log('\n⚡ Ready to accept requests\n');
    });
  })
  .catch((err) => {
    console.error(`\n❌ Error checking port ${PORT}:`, err.message);
    process.exit(1);
  });
