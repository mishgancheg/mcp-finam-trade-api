# ТЗ: Доработка эмулятора FINAM API до мини-OMS

**Дата:** 2025-10-04
**Цель:** Превратить статичный эмулятор в полнофункциональную Order Management System с реалистичной историей торговли

---

## 1. Scope и ограничения

### Что делаем
✅ In-memory OMS с полным lifecycle управления ордерами, позициями, транзакциями  
✅ Реалистичная предзаполненная история (3-6 месяцев активной торговли)  
✅ Market data generator для исторических и текущих данных  
✅ Логика исполнения ордеров (matching, partial fills, commissions)  

### Что НЕ делаем
❌ Новые endpoints сверх существующих FINAM API  
❌ Persistent storage (SQLite/PostgreSQL) - только in-memory + optional JSON dump  
❌ WebSocket streaming (опционально для будущего)  
❌ Real-time market data feed  

### API Surface
Эмулятор реализует **ТОЛЬКО** существующие endpoints из `finam-trade-api-registry.js`:
- Auth (1-1, 1-2)
- Accounts (2-1, 2-2, 2-3)
- Assets (3-1 to 3-7)
- Orders (4-1, 4-2, 4-3, 4-4)
- Market Data (5-1, 5-2, 5-3, 5-4)

---

## 2. Текущее состояние

**Файл:** `test/emulator/emulator.js`

**Что уже есть:**
- Express server с базовыми routes
- JWT auth flow (генерация токенов)
- Статичные ответы для большинства endpoints
- Минимальное in-memory состояние (accounts, orders)
- Счетчики ID (orderId, tradeId, transactionId)

**Проблемы:**
- Нет реальной логики исполнения ордеров
- Нет связи между ордерами → trades → positions → cash
- Нет генерации транзакций
- Нет исторических данных
- Market data возвращает mock из `data/data.js`

---

## 3. Требования к доработке

### 3.1. Структура данных

**Расширить `dataStore`:**

```javascript
const dataStore = {
  // Existing
  accounts: new Map(),           // account_id → Account
  orders: new Map(),              // order_id → Order
  positions: new Map(),           // "account_id:symbol" → Position

  // New
  trades: new Map(),              // trade_id → Trade
  transactions: new Map(),        // transaction_id → Transaction
  marketData: new Map(),          // symbol → MarketData
  historicalBars: new Map(),      // symbol → Bar[]

  // Counters
  orderIdCounter: 68631684267,
  execIdCounter: 1753326668360281,
  tradeIdCounter: 1000000,
  transactionIdCounter: 2556733362,
};
```

**Типы данных:**

```javascript
// Account
{
  account_id: string,
  type: 'UNION' | 'IIS',
  status: 'ACCOUNT_ACTIVE',
  equity: Money,                  // cash + позиции по текущим ценам
  unrealized_profit: Money,       // sum(positions.unrealized_pnl)
  realized_profit: Money,         // sum(trades где позиция закрыта)
  positions: Position[],
  cash: Money[],                  // по валютам
  portfolio_mc: {
    available_cash: Money,
    initial_margin: Money,
    maintenance_margin: Money,
  }
}

// Position
{
  account_id: string,
  symbol: string,
  quantity: Decimal,              // положительное = long, отрицательное = short
  average_price: Decimal,         // средняя цена входа
  current_price: Decimal,         // текущая рыночная цена
  daily_pnl: Money,               // P&L за день
  unrealized_pnl: Money,          // (current_price - average_price) * quantity
  realized_pnl: Money,            // P&L от закрытых частей позиции
}

// Order
{
  order_id: string,
  exec_id: string,                // обновляется при каждом изменении статуса
  status: 'ORDER_STATUS_NEW' | 'ORDER_STATUS_PARTIALLY_FILLED' |
          'ORDER_STATUS_FILLED' | 'ORDER_STATUS_CANCELED',
  account_id: string,
  symbol: string,
  quantity: Decimal,
  filled_quantity: Decimal,
  remaining_quantity: Decimal,    // quantity - filled_quantity
  side: 'SIDE_BUY' | 'SIDE_SELL',
  type: 'ORDER_TYPE_MARKET' | 'ORDER_TYPE_LIMIT' | 'ORDER_TYPE_STOP',
  time_in_force: 'TIME_IN_FORCE_DAY' | 'TIME_IN_FORCE_GTC' | 'TIME_IN_FORCE_IOC',
  limit_price?: Decimal,
  stop_price?: Decimal,
  average_fill_price?: Decimal,   // weighted average fill price
  client_order_id: string,
  created_at: ISO8601,
  updated_at: ISO8601,
  transact_at: ISO8601,           // timestamp последнего изменения
  cancel_time?: ISO8601,
}

// Trade
{
  trade_id: string,
  order_id: string,
  exec_id: string,
  account_id: string,
  symbol: string,
  price: Decimal,
  size: Decimal,
  side: 'SIDE_BUY' | 'SIDE_SELL',
  timestamp: ISO8601,
  commission: Money,
}

// Transaction
{
  id: string,
  account_id: string,
  category: 'TRADE' | 'COMMISSION' | 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND',
  timestamp: ISO8601,
  symbol?: string,                // для TRADE
  change: Money,                  // положительное = приход, отрицательное = расход
  balance_after: Money,           // cash balance после транзакции
  trade_id?: string,              // ссылка на trade
  order_id?: string,              // ссылка на order
  description: string,
  transaction_category: string,   // дубликат category для совместимости с API
  transaction_name: string,       // человекочитаемое описание
}

// MarketData (current quote)
{
  symbol: string,
  timestamp: ISO8601,
  bid: Decimal,
  bid_size: Decimal,
  ask: Decimal,
  ask_size: Decimal,
  last: Decimal,
  last_size: Decimal,
  volume: Decimal,
  open: Decimal,
  high: Decimal,
  low: Decimal,
  close: Decimal,                 // = last для intraday
  change: Decimal,                // close - prev_close
}

// Bar (historical candle)
{
  timestamp: ISO8601,
  open: Decimal,
  high: Decimal,
  low: Decimal,
  close: Decimal,
  volume: Decimal,
}
```

### 3.2. Алгоритмы

**A. Order Execution (при PlaceOrder или периодически для active orders):**

```javascript
function executeOrder(order, currentMarketPrice) {
  // 1. Проверка условий исполнения
  if (order.type === 'ORDER_TYPE_MARKET') {
    return fillOrder(order, currentMarketPrice, order.remaining_quantity);
  }

  if (order.type === 'ORDER_TYPE_LIMIT') {
    // BUY LIMIT: исполняем если рынок <= limit_price
    if (order.side === 'SIDE_BUY' && currentMarketPrice <= order.limit_price) {
      return fillOrder(order, order.limit_price, order.remaining_quantity);
    }
    // SELL LIMIT: исполняем если рынок >= limit_price
    if (order.side === 'SIDE_SELL' && currentMarketPrice >= order.limit_price) {
      return fillOrder(order, order.limit_price, order.remaining_quantity);
    }
  }

  if (order.type === 'ORDER_TYPE_STOP') {
    // STOP orders триггерятся при достижении stop_price
    if (order.side === 'SIDE_BUY' && currentMarketPrice >= order.stop_price) {
      return fillOrder(order, currentMarketPrice, order.remaining_quantity);
    }
    if (order.side === 'SIDE_SELL' && currentMarketPrice <= order.stop_price) {
      return fillOrder(order, currentMarketPrice, order.remaining_quantity);
    }
  }

  return { status: 'pending' };
}

function fillOrder(order, fillPrice, fillQuantity) {
  // 1. Создать trade record
  const trade = createTrade(order, fillPrice, fillQuantity);
  dataStore.trades.set(trade.trade_id, trade);

  // 2. Обновить позицию
  updatePosition(order.account_id, order.symbol, order.side, fillQuantity, fillPrice);

  // 3. Рассчитать комиссию (0.05% от суммы сделки)
  const tradeAmount = fillPrice * fillQuantity;
  const commission = tradeAmount * 0.0005;

  // 4. Обновить cash balance
  const cashChange = order.side === 'SIDE_BUY'
    ? -(tradeAmount + commission)  // покупка: списываем деньги
    : (tradeAmount - commission);   // продажа: зачисляем деньги
  updateCashBalance(order.account_id, 'RUB', cashChange);

  // 5. Создать транзакции
  createTransaction({
    account_id: order.account_id,
    category: 'TRADE',
    change: cashChange,
    symbol: order.symbol,
    trade_id: trade.trade_id,
    order_id: order.order_id,
    description: `${order.side === 'SIDE_BUY' ? 'Покупка' : 'Продажа'} ${fillQuantity} ${order.symbol} @ ${fillPrice}`,
  });

  createTransaction({
    account_id: order.account_id,
    category: 'COMMISSION',
    change: -commission,
    trade_id: trade.trade_id,
    order_id: order.order_id,
    description: 'Брокерская комиссия',
  });

  // 6. Обновить статус ордера
  order.filled_quantity += fillQuantity;
  order.remaining_quantity -= fillQuantity;
  order.average_fill_price = calculateWeightedAverage(order);
  order.status = order.remaining_quantity === 0
    ? 'ORDER_STATUS_FILLED'
    : 'ORDER_STATUS_PARTIALLY_FILLED';
  order.exec_id = generateExecId();
  order.transact_at = new Date().toISOString();

  return { status: 'filled', trade };
}
```

**B. Position Management:**

```javascript
function updatePosition(accountId, symbol, side, quantity, price) {
  const positionKey = `${accountId}:${symbol}`;
  let position = dataStore.positions.get(positionKey);

  if (!position) {
    position = {
      account_id: accountId,
      symbol,
      quantity: 0,
      average_price: 0,
      current_price: price,
      daily_pnl: { value: '0' },
      unrealized_pnl: { value: '0' },
      realized_pnl: { value: '0' },
    };
    dataStore.positions.set(positionKey, position);
  }

  if (side === 'SIDE_BUY') {
    // Увеличиваем позицию
    const totalCost = position.quantity * position.average_price + quantity * price;
    const totalQuantity = position.quantity + quantity;
    position.average_price = totalQuantity > 0 ? totalCost / totalQuantity : 0;
    position.quantity = totalQuantity;
  } else {
    // SIDE_SELL: уменьшаем позицию
    const realizedPnL = (price - position.average_price) * quantity;
    position.realized_pnl.value = String(
      parseFloat(position.realized_pnl.value) + realizedPnL
    );
    position.quantity -= quantity;

    // Если позиция закрыта полностью
    if (position.quantity === 0) {
      position.average_price = 0;
    }
  }

  // Обновить unrealized P&L
  const currentPrice = getCurrentMarketPrice(symbol);
  position.current_price = currentPrice;
  position.unrealized_pnl.value = String(
    (currentPrice - position.average_price) * position.quantity
  );

  // Удалить позицию, если quantity = 0 и нет unrealized P&L
  if (position.quantity === 0) {
    dataStore.positions.delete(positionKey);
  }
}
```

**C. Market Data Generator:**

```javascript
function generateHistoricalBars(symbol, numDays = 365, params = {}) {
  const {
    startPrice = 250,           // начальная цена
    volatility = 0.015,         // 1.5% дневная волатильность
    trend = 0.0005,             // 0.05% дневной рост
    baseVolume = 100000,        // базовый объем
  } = params;

  const bars = [];
  let price = startPrice;
  const now = new Date();

  for (let i = numDays - 1; i >= 0; i--) {
    // Random walk
    const randomChange = gaussianRandom(0, volatility);
    const trendChange = trend;
    const totalChange = randomChange + trendChange;

    const open = price;
    price = price * (1 + totalChange);
    const close = price;

    // High/Low с внутридневной волатильностью
    const intraVol = volatility / 2;
    const high = Math.max(open, close) * (1 + Math.abs(gaussianRandom(0, intraVol)));
    const low = Math.min(open, close) * (1 - Math.abs(gaussianRandom(0, intraVol)));

    // Volume коррелирует с изменением цены
    const volume = baseVolume * (1 + Math.abs(totalChange) * 10 + gaussianRandom(0, 0.5));

    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - i);
    timestamp.setHours(18, 45, 0, 0); // закрытие торгов

    bars.push({
      timestamp: timestamp.toISOString(),
      open: { value: open.toFixed(2) },
      high: { value: high.toFixed(2) },
      low: { value: low.toFixed(2) },
      close: { value: close.toFixed(2) },
      volume: { value: Math.floor(volume).toString() },
    });
  }

  return bars;
}

// Box-Muller transform для нормального распределения
function gaussianRandom(mean = 0, stdev = 1) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}
```

### 3.3. Seed Data (предзаполненная история)

**При старте эмулятора генерировать:**

1. **Инструменты** (8 штук с разными характеристиками):

```javascript
const INSTRUMENTS = [
  {
    symbol: 'SBER@MISX',
    name: 'Сбербанк',
    startPrice: 250,
    volatility: 0.015,
    trend: 0.0008,  // рост 8% годовых
    sector: 'Финансы',
  },
  {
    symbol: 'GAZP@MISX',
    name: 'Газпром',
    startPrice: 175,
    volatility: 0.02,
    trend: -0.0003, // падение 3% годовых
    sector: 'Энергетика',
  },
  {
    symbol: 'YNDX@MISX',
    name: 'Яндекс',
    startPrice: 3500,
    volatility: 0.025,
    trend: 0.0012,  // рост 12% годовых
    sector: 'IT',
  },
  {
    symbol: 'LKOH@MISX',
    name: 'Лукойл',
    startPrice: 6800,
    volatility: 0.018,
    trend: 0.0005,
    sector: 'Энергетика',
  },
  {
    symbol: 'VTBR@MISX',
    name: 'ВТБ',
    startPrice: 0.045,
    volatility: 0.022,
    trend: -0.0001,
    sector: 'Финансы',
  },
  {
    symbol: 'MGNT@MISX',
    name: 'Магнит',
    startPrice: 5200,
    volatility: 0.016,
    trend: 0.0006,
    sector: 'Ритейл',
  },
  {
    symbol: 'ROSN@MISX',
    name: 'Роснефть',
    startPrice: 550,
    volatility: 0.019,
    trend: 0.0004,
    sector: 'Энергетика',
  },
  {
    symbol: 'AFLT@MISX',
    name: 'Аэрофлот',
    startPrice: 62,
    volatility: 0.028,
    trend: 0.0002,
    sector: 'Транспорт',
  },
];
```

2. **Исторические бары** (365 дней для каждого инструмента):

```javascript
// При инициализации
INSTRUMENTS.forEach(inst => {
  const bars = generateHistoricalBars(
    inst.symbol,
    365,
    {
      startPrice: inst.startPrice,
      volatility: inst.volatility,
      trend: inst.trend,
    }
  );
  dataStore.historicalBars.set(inst.symbol, bars);

  // Последний бар = текущая quote
  const lastBar = bars[bars.length - 1];
  dataStore.marketData.set(inst.symbol, {
    symbol: inst.symbol,
    timestamp: lastBar.timestamp,
    bid: { value: (parseFloat(lastBar.close.value) - 0.01).toFixed(2) },
    ask: { value: (parseFloat(lastBar.close.value) + 0.01).toFixed(2) },
    last: lastBar.close,
    volume: lastBar.volume,
    open: lastBar.open,
    high: lastBar.high,
    low: lastBar.low,
    close: lastBar.close,
    // ... другие поля
  });
});
```

3. **История торговли** (генерация 3-6 месяцев активности):

```javascript
function generateTradingHistory(accountId, numMonths = 3) {
  const trades = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - numMonths);

  // Генерируем 20-40 сделок за период
  const numTrades = 20 + Math.floor(Math.random() * 20);

  for (let i = 0; i < numTrades; i++) {
    // Случайная дата
    const tradeDate = new Date(
      startDate.getTime() +
      Math.random() * (now.getTime() - startDate.getTime())
    );

    // Случайный инструмент
    const inst = INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)];

    // Случайная сторона (60% BUY, 40% SELL для формирования позиций)
    const side = Math.random() < 0.6 ? 'SIDE_BUY' : 'SIDE_SELL';

    // Случайное количество
    const quantity = [10, 20, 50, 100][Math.floor(Math.random() * 4)];

    // Цена на момент сделки (из исторических баров)
    const price = getPriceAtDate(inst.symbol, tradeDate);

    // Создаем ордер и сразу исполняем
    const order = createHistoricalOrder(accountId, inst.symbol, side, quantity, price, tradeDate);
    const trade = createHistoricalTrade(order, price, quantity, tradeDate);

    trades.push({ order, trade });
  }

  // Сортируем по времени
  trades.sort((a, b) =>
    new Date(a.trade.timestamp) - new Date(b.trade.timestamp)
  );

  // Применяем сделки к аккаунту (обновляем позиции, cash, транзакции)
  trades.forEach(({ order, trade }) => {
    fillOrder(order, trade.price, trade.size);
  });

  return trades;
}
```

4. **Транзакции депозит/вывод** (для формирования cash balance):

```javascript
function generateCashFlowHistory(accountId, numMonths = 3) {
  const transactions = [];

  // Начальный депозит
  transactions.push(createTransaction({
    account_id: accountId,
    category: 'DEPOSIT',
    timestamp: getDateMonthsAgo(numMonths),
    change: { currency_code: 'RUB', units: '100000', nanos: 0 },
    description: 'Пополнение счета',
  }));

  // 2-3 дополнительных депозита
  for (let i = 0; i < 2; i++) {
    transactions.push(createTransaction({
      account_id: accountId,
      category: 'DEPOSIT',
      timestamp: getRandomDateInPeriod(numMonths),
      change: { currency_code: 'RUB', units: String(20000 + Math.floor(Math.random() * 30000)), nanos: 0 },
      description: 'Пополнение счета',
    }));
  }

  // 1 вывод (опционально)
  if (Math.random() < 0.5) {
    transactions.push(createTransaction({
      account_id: accountId,
      category: 'WITHDRAWAL',
      timestamp: getRandomDateInPeriod(1), // последний месяц
      change: { currency_code: 'RUB', units: '-10000', nanos: 0 },
      description: 'Вывод средств',
    }));
  }

  return transactions;
}
```

5. **Итоговое состояние аккаунта:**

```javascript
function initializeDemoAccount(accountId) {
  // 1. Генерируем историю cash flow
  const cashTransactions = generateCashFlowHistory(accountId, 3);

  // 2. Генерируем историю торговли (это создаст позиции, trades, транзакции)
  const tradingHistory = generateTradingHistory(accountId, 3);

  // 3. Рассчитываем итоговый cash balance
  let cashBalance = 0;
  [...cashTransactions, ...getAllTradeTransactions(accountId)]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .forEach(txn => {
      const change = parseFloat(txn.change.units) + parseFloat(txn.change.nanos) / 1e9;
      cashBalance += change;
      txn.balance_after = {
        currency_code: 'RUB',
        units: String(Math.floor(cashBalance)),
        nanos: Math.floor((cashBalance % 1) * 1e9)
      };
    });

  // 4. Рассчитываем equity
  const positionsValue = Array.from(dataStore.positions.values())
    .filter(p => p.account_id === accountId)
    .reduce((sum, pos) => sum + pos.quantity * pos.current_price, 0);

  const equity = cashBalance + positionsValue;

  // 5. Создаем аккаунт
  const account = {
    account_id: accountId,
    type: 'UNION',
    status: 'ACCOUNT_ACTIVE',
    equity: { value: equity.toFixed(2) },
    unrealized_profit: { value: calculateTotalUnrealizedPnL(accountId).toFixed(2) },
    realized_profit: { value: calculateTotalRealizedPnL(accountId).toFixed(2) },
    positions: getAccountPositions(accountId),
    cash: [{ currency_code: 'RUB', units: String(Math.floor(cashBalance)), nanos: 0 }],
    portfolio_mc: {
      available_cash: { value: Math.max(0, cashBalance).toFixed(2) },
      initial_margin: { value: '0' },
      maintenance_margin: { value: '0' },
    },
  };

  dataStore.accounts.set(accountId, account);

  return account;
}
```

### 3.4. Endpoints Implementation

**Изменения в существующих endpoints:**

```javascript
// 2-1: GetAccount
app.get('/v1/accounts/:account_id', authMiddleware, (req, res) => {
  const { account_id } = req.params;

  // Пересчитать equity и unrealized P&L на лету
  recalculateAccountMetrics(account_id);

  const account = dataStore.accounts.get(account_id);
  if (!account) {
    return res.status(404).json({
      code: 5,
      message: 'NOT_FOUND: Account not found',
    });
  }

  res.json(account);
});

// 2-2: Trades - реальная история сделок
app.get('/v1/accounts/:account_id/trades', authMiddleware, (req, res) => {
  const { account_id } = req.params;
  const { 'interval.start_time': startTime, 'interval.end_time': endTime } = req.query;

  let trades = Array.from(dataStore.trades.values())
    .filter(t => t.account_id === account_id);

  // Фильтр по датам
  if (startTime) {
    trades = trades.filter(t => new Date(t.timestamp) >= new Date(startTime));
  }
  if (endTime) {
    trades = trades.filter(t => new Date(t.timestamp) <= new Date(endTime));
  }

  trades.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({ trades, total: trades.length });
});

// 2-3: Transactions - реальная история транзакций
app.get('/v1/accounts/:account_id/transactions', authMiddleware, (req, res) => {
  const { account_id } = req.params;
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

// 4-3: GetOrders - активные и исторические ордера
app.get('/v1/accounts/:account_id/orders', authMiddleware, (req, res) => {
  const { account_id } = req.params;
  const { status } = req.query; // опциональная фильтрация

  let orders = Array.from(dataStore.orders.values())
    .filter(o => o.account_id === account_id);

  if (status) {
    orders = orders.filter(o => o.status === status);
  }

  orders.sort((a, b) => new Date(b.transact_at) - new Date(a.transact_at));

  res.json({ orders, total: orders.length });
});

// 4-4: PlaceOrder - с реальным исполнением
app.post('/v1/accounts/:account_id/orders', authMiddleware, (req, res) => {
  const { account_id } = req.params;
  const orderData = req.body;

  // Создать ордер
  const order = createOrder(account_id, orderData);
  dataStore.orders.set(order.order_id, order);

  // Попытаться исполнить немедленно
  const currentPrice = getCurrentMarketPrice(order.symbol);
  const executionResult = executeOrder(order, currentPrice);

  res.json(order);
});

// 4-1: CancelOrder
app.delete('/v1/accounts/:account_id/orders/:order_id', authMiddleware, (req, res) => {
  const { order_id } = req.params;
  const order = dataStore.orders.get(order_id);

  if (!order) {
    return res.status(404).json({ code: 5, message: 'Order not found' });
  }

  if (order.status === 'ORDER_STATUS_FILLED' || order.status === 'ORDER_STATUS_CANCELED') {
    return res.status(400).json({ code: 3, message: 'Order cannot be canceled' });
  }

  order.status = 'ORDER_STATUS_CANCELED';
  order.cancel_time = new Date().toISOString();
  order.exec_id = generateExecId();
  order.transact_at = new Date().toISOString();

  res.json(order);
});

// 5-1: Bars - из предзагруженных исторических данных
app.get('/v1/instruments/:symbol/bars', authMiddleware, (req, res) => {
  const { symbol } = req.params;
  const { 'interval.start_time': startTime, 'interval.end_time': endTime, timeframe } = req.query;

  let bars = dataStore.historicalBars.get(symbol) || [];

  // Фильтр по датам
  if (startTime) {
    bars = bars.filter(b => new Date(b.timestamp) >= new Date(startTime));
  }
  if (endTime) {
    bars = bars.filter(b => new Date(b.timestamp) <= new Date(endTime));
  }

  // TODO: support different timeframes (M, H, D, W)
  // Сейчас все bars в формате D (daily)

  res.json({ symbol, bars });
});

// 5-2: LastQuote - из текущих рыночных данных
app.get('/v1/instruments/:symbol/quotes/latest', authMiddleware, (req, res) => {
  const { symbol } = req.params;
  const quote = dataStore.marketData.get(symbol);

  if (!quote) {
    return res.status(404).json({ code: 5, message: 'Symbol not found' });
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

// 5-3: LatestTrades - генерируем из исторических баров
app.get('/v1/instruments/:symbol/trades/latest', authMiddleware, (req, res) => {
  const { symbol } = req.params;
  const quote = dataStore.marketData.get(symbol);

  if (!quote) {
    return res.status(404).json({ code: 5, message: 'Symbol not found' });
  }

  // Генерируем 20 последних сделок вокруг текущей цены
  const trades = generateRecentTrades(symbol, quote.last.value, 20);

  res.json({ symbol, trades });
});

// 5-4: OrderBook - генерируем стакан вокруг текущей цены
app.get('/v1/instruments/:symbol/orderbook', authMiddleware, (req, res) => {
  const { symbol } = req.params;
  const quote = dataStore.marketData.get(symbol);

  if (!quote) {
    return res.status(404).json({ code: 5, message: 'Symbol not found' });
  }

  const orderbook = generateOrderBook(symbol, quote.bid.value, quote.ask.value, 10);

  res.json({ symbol, orderbook });
});
```

---

## 4. Plan реализации

### Шаг 1: Структура данных
- [ ] Определить все типы в комментариях
- [ ] Расширить `dataStore`
- [ ] Добавить helper функции для создания объектов

### Шаг 2: Market Data Generator 
- [ ] `gaussianRandom()` - нормальное распределение
- [ ] `generateHistoricalBars()` - генерация свечей
- [ ] `generateOrderBook()` - генерация стакана
- [ ] `generateRecentTrades()` - генерация последних сделок
- [ ] Инициализация для всех 8 инструментов

### Шаг 3: Order Execution Engine
- [ ] `executeOrder()` - проверка условий исполнения
- [ ] `fillOrder()` - исполнение ордера
- [ ] `updatePosition()` - обновление позиции
- [ ] `updateCashBalance()` - обновление cash
- [ ] `createTrade()` - создание trade record
- [ ] `createTransaction()` - создание транзакции
- [ ] `calculateCommission()` - расчет комиссии

### Шаг 4: Seed Data Generation 
- [ ] `generateCashFlowHistory()` - депозиты/выводы
- [ ] `generateTradingHistory()` - история сделок (20-40 штук)
- [ ] `initializeDemoAccount()` - сборка всего вместе
- [ ] Запуск при старте эмулятора
- [ ] Логирование итогового состояния

### Шаг 5: Endpoints Update 
- [ ] GetAccount - пересчет метрик
- [ ] Trades - фильтрация по датам
- [ ] Transactions - фильтрация по датам
- [ ] GetOrders - фильтрация по статусу
- [ ] PlaceOrder - интеграция execution engine
- [ ] CancelOrder - обновление статуса
- [ ] Bars - фильтрация исторических данных
- [ ] LastQuote, LatestTrades, OrderBook - из generated data

### Шаг 6: Тестирование 
- [ ] Запуск эмулятора
- [ ] Проверка seed data (аккаунт, позиции, история)
- [ ] Размещение тестового ордера
- [ ] Проверка обновления позиции
- [ ] Проверка транзакций
- [ ] Проверка исторических данных

---

## 5. Acceptance Criteria

**✅ OMS работает если:**

1. При старте эмулятора создается аккаунт с:
   - 3-5 позициями (разные инструменты)
   - Cash balance ~50,000-100,000 ₽
   - Equity ~150,000-200,000 ₽
   - История: 80-160 сделок за 1 год
   - История: 12-20 транзакций deposit/withdrawal
   - Unrealized P&L ≠ 0 (позиции с прибылью и убытком)

2. `GET /v1/accounts/{id}` возвращает:
   - Актуальные позиции с текущими ценами
   - Правильный equity (cash + позиции)
   - Правильный unrealized_profit

3. `GET /v1/accounts/{id}/trades?interval.start_time=...&interval.end_time=...`:
   - Возвращает реальные сделки в диапазоне дат
   - Sorted by timestamp DESC

4. `GET /v1/accounts/{id}/transactions?interval.start_time=...&interval.end_time=...`:
   - Возвращает все транзакции (TRADE, COMMISSION, DEPOSIT, WITHDRAWAL)
   - С корректным balance_after для каждой

5. `POST /v1/accounts/{id}/orders` (PlaceOrder):
   - Создает ордер
   - MARKET order исполняется немедленно
   - LIMIT order исполняется если цена подходит
   - Создается Trade record
   - Обновляется Position
   - Обновляется Cash balance
   - Создаются Transaction records (TRADE + COMMISSION)

6. `DELETE /v1/accounts/{id}/orders/{order_id}` (CancelOrder):
   - Меняет статус на CANCELED
   - Не исполняет ордер

7. `GET /v1/instruments/{symbol}/bars`:
   - Возвращает исторические свечи (365 дней)
   - Фильтрация по датам работает

8. `GET /v1/instruments/{symbol}/quotes/latest`:
   - Возвращает актуальную котировку
   - Bid/Ask spread ~0.02-0.1% от цены

9. `GET /v1/instruments/{symbol}/trades/latest`:
   - Возвращает 20+ последних сделок
   - Цены вокруг last price

10. `GET /v1/instruments/{symbol}/orderbook`:
    - Возвращает стакан (10+ уровней bid/ask)
    - Реалистичные размеры заявок

**✅ Seed data валиден если:**

- Все 8 инструментов имеют бары за год на часовом таймфрейме
- Цены в барах логичные (не скачут на 1000%)
- Позиции в портфеле соответствуют истории сделок
- Cash balance = deposits - withdrawals - (buys + commissions) + (sells - commissions)
- Sum(positions value @ current prices) + cash = equity

---

## 6. Дополнительные соображения

### Производительность
- In-memory структуры достаточно быстры для single-user эмулятора
- При генерации seed data: 8 instruments × 365 days * 24 bars = ~5MB
- История: 150 trades × 8 возможных инструментов = max 120 trade records
- Все умещается в <50MB RAM

### Дополнительные фичи
- Endpoint `POST /admin/reset` для сброса к начальному состоянию
- Background tick для обновления текущих цен (± random walk каждые 5 секунд)
- Автоматическое исполнение LIMIT/STOP ордеров при изменении цены

### Опциональные фичи (если время есть)
- [ ] Сохранение состояния в JSON при shutdown (`dataStore → emulator-state.json`)
- [ ] Загрузка состояния при startup (если файл существует)

### Ограничения
- Не поддерживаем SHORT позиции (только LONG)
- Не поддерживаем маржу (только cash trading)
- Не поддерживаем опционы (только акции)
- Нет multi-currency (только RUB)
- Нет дивидендов

---

## 7. Готовность к использованию

После реализации эмулятор можно использовать для:

✅ **Кейс 1: Портфельный аналитик**
- `GetAccount` → текущий портфель с позициями
- `Trades` → история сделок за 3 месяца
- `Bars` → исторические данные для equity curve

✅ **Кейс 2: Рыночный сканер**
- `Assets` → список всех инструментов
- `Bars` → данные для расчета недельного роста
- `LastQuote` → текущие цены и объемы

✅ **Кейс 3: Бэктест стратегии**
- `Bars` → исторические данные для симуляции

✅ **Кейс 4: Размещение заявки**
- `PlaceOrder` → реальное исполнение с обновлением портфеля

✅ **Кейс 5: Анализ инструмента**
- `GetAsset` → информация
- `Bars` → график за месяц
- `OrderBook` → стакан
- `LatestTrades` → последние сделки

---

**Конец ТЗ**
