/**
 * Seed Data Generator for OMS Emulator
 * Generates realistic trading history, positions, and cash flow
 */

import {
  generateHistoricalBars,
  getPriceAtDate,
  createTransaction,
  fillOrder,
} from './oms-engine.js';

/**
 * Instrument definitions with different characteristics
 */
export const INSTRUMENTS = [
  {
    symbol: 'SBER@MISX',
    name: 'Сбербанк',
    id: 'SBER',
    ticker: 'SBER',
    mic: 'MISX',
    isin: 'RU0009029540',
    type: 'EQUITIES',
    board: 'TQBR',
    lot_size: { value: '10' },
    decimals: 2,
    min_step: '0.01',
    exchange: 'Московская биржа',
    currency: 'RUB',
    startPrice: 250,
    volatility: 0.015,
    trend: 0.0008, // 8% annual growth
    sector: 'Финансы',
    baseVolume: 500000,
  },
  {
    symbol: 'GAZP@MISX',
    name: 'Газпром',
    id: 'GAZP',
    ticker: 'GAZP',
    mic: 'MISX',
    isin: 'RU0007661625',
    type: 'EQUITIES',
    board: 'TQBR',
    lot_size: { value: '10' },
    decimals: 2,
    min_step: '0.01',
    exchange: 'Московская биржа',
    currency: 'RUB',
    startPrice: 175,
    volatility: 0.02,
    trend: -0.0003, // -3% annual decline
    sector: 'Энергетика',
    baseVolume: 800000,
  },
  {
    symbol: 'YNDX@MISX',
    name: 'Яндекс',
    id: 'YNDX',
    ticker: 'YNDX',
    mic: 'MISX',
    isin: 'RU0009092134',
    type: 'EQUITIES',
    board: 'TQBR',
    lot_size: { value: '1' },
    decimals: 1,
    min_step: '0.2',
    exchange: 'Московская биржа',
    currency: 'RUB',
    startPrice: 3500,
    volatility: 0.025,
    trend: 0.0012, // 12% annual growth
    sector: 'IT',
    baseVolume: 200000,
  },
  {
    symbol: 'LKOH@MISX',
    name: 'Лукойл',
    id: 'LKOH',
    ticker: 'LKOH',
    mic: 'MISX',
    isin: 'RU0009024277',
    type: 'EQUITIES',
    board: 'TQBR',
    lot_size: { value: '1' },
    decimals: 0,
    min_step: '1',
    exchange: 'Московская биржа',
    currency: 'RUB',
    startPrice: 6800,
    volatility: 0.018,
    trend: 0.0005, // 5% annual growth
    sector: 'Энергетика',
    baseVolume: 150000,
  },
  {
    symbol: 'VTBR@MISX',
    name: 'ВТБ',
    id: 'VTBR',
    ticker: 'VTBR',
    mic: 'MISX',
    isin: 'RU0007775219',
    type: 'EQUITIES',
    board: 'TQBR',
    lot_size: { value: '100' },
    decimals: 5,
    min_step: '0.00001',
    exchange: 'Московская биржа',
    currency: 'RUB',
    startPrice: 0.045,
    volatility: 0.022,
    trend: -0.0001, // -1% annual decline
    sector: 'Финансы',
    baseVolume: 1000000,
  },
  {
    symbol: 'MGNT@MISX',
    name: 'Магнит',
    id: 'MGNT',
    ticker: 'MGNT',
    mic: 'MISX',
    isin: 'RU000A0JKQU8',
    type: 'EQUITIES',
    board: 'TQBR',
    lot_size: { value: '1' },
    decimals: 1,
    min_step: '0.2',
    exchange: 'Московская биржа',
    currency: 'RUB',
    startPrice: 5200,
    volatility: 0.016,
    trend: 0.0006, // 6% annual growth
    sector: 'Ритейл',
    baseVolume: 100000,
  },
  {
    symbol: 'ROSN@MISX',
    name: 'Роснефть',
    id: 'ROSN',
    ticker: 'ROSN',
    mic: 'MISX',
    isin: 'RU000A0J2Q06',
    type: 'EQUITIES',
    board: 'TQBR',
    lot_size: { value: '1' },
    decimals: 1,
    min_step: '0.1',
    exchange: 'Московская биржа',
    currency: 'RUB',
    startPrice: 550,
    volatility: 0.019,
    trend: 0.0004, // 4% annual growth
    sector: 'Энергетика',
    baseVolume: 300000,
  },
  {
    symbol: 'AFLT@MISX',
    name: 'Аэрофлот',
    id: 'AFLT',
    ticker: 'AFLT',
    mic: 'MISX',
    isin: 'RU0009062285',
    type: 'EQUITIES',
    board: 'TQBR',
    lot_size: { value: '10' },
    decimals: 2,
    min_step: '0.01',
    exchange: 'Московская биржа',
    currency: 'RUB',
    startPrice: 62,
    volatility: 0.028,
    trend: 0.0002, // 2% annual growth
    sector: 'Транспорт',
    baseVolume: 250000,
  },
];

/**
 * Generate cash flow history (deposits/withdrawals)
 * @param {string} accountId - Account ID
 * @param {number} numMonths - Number of months to generate
 * @param {Object} dataStore - Data store
 * @returns {Array} Array of transaction objects
 */
export function generateCashFlowHistory(accountId, numMonths, dataStore) {
  const transactions = [];
  const now = new Date();

  // Initial deposit
  const initialDate = new Date(now);
  initialDate.setMonth(initialDate.getMonth() - numMonths);

  transactions.push(createTransaction({
    account_id: accountId,
    category: 'DEPOSIT',
    timestamp: initialDate.toISOString(),
    change: {
      currency_code: 'RUB',
      units: '100000',
      nanos: 0,
    },
    description: 'Начальное пополнение счета',
  }, dataStore.transactions, dataStore));

  // 2-3 additional deposits
  const numDeposits = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < numDeposits; i++) {
    const depositDate = new Date(now);
    const monthsAgo = Math.floor(Math.random() * numMonths);
    depositDate.setMonth(depositDate.getMonth() - monthsAgo);

    const amount = 20000 + Math.floor(Math.random() * 30000);

    transactions.push(createTransaction({
      account_id: accountId,
      category: 'DEPOSIT',
      timestamp: depositDate.toISOString(),
      change: {
        currency_code: 'RUB',
        units: amount.toString(),
        nanos: 0,
      },
      description: 'Пополнение счета',
    }, dataStore.transactions, dataStore));
  }

  // Optional withdrawal
  if (Math.random() < 0.5) {
    const withdrawalDate = new Date(now);
    withdrawalDate.setMonth(withdrawalDate.getMonth() - 1); // last month

    transactions.push(createTransaction({
      account_id: accountId,
      category: 'WITHDRAWAL',
      timestamp: withdrawalDate.toISOString(),
      change: {
        currency_code: 'RUB',
        units: '-10000',
        nanos: 0,
      },
      description: 'Вывод средств',
    }, dataStore.transactions, dataStore));
  }

  return transactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

/**
 * Generate trading history
 * @param {string} accountId - Account ID
 * @param {number} numMonths - Number of months to generate
 * @param {Object} dataStore - Data store
 * @returns {Array} Array of {order, trade} objects
 */
export function generateTradingHistory(accountId, numMonths, dataStore) {
  const trades = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - numMonths);

  // Generate 20-40 trades
  const numTrades = 20 + Math.floor(Math.random() * 20);

  for (let i = 0; i < numTrades; i++) {
    // Random date
    const tradeDate = new Date(
      startDate.getTime() +
      Math.random() * (now.getTime() - startDate.getTime())
    );

    // Random instrument
    const inst = INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)];

    // Random side (60% BUY, 40% SELL to build positions)
    const side = Math.random() < 0.6 ? 'SIDE_BUY' : 'SIDE_SELL';

    // Random quantity based on lot size
    const lotSize = parseInt(inst.lot_size.value);
    const numLots = [1, 2, 5, 10][Math.floor(Math.random() * 4)];
    const quantity = lotSize * numLots;

    // Price at trade date
    const price = getPriceAtDate(dataStore.historicalBars, inst.symbol, tradeDate);

    // Create order
    const orderId = `${dataStore.orderIdCounter++}`;
    const execId = `ord.${orderId}.${dataStore.execIdCounter++}`;

    const order = {
      order_id: orderId,
      exec_id: execId,
      status: 'ORDER_STATUS_NEW',
      account_id: accountId,
      symbol: inst.symbol,
      quantity: { value: quantity.toString() },
      filled_quantity: '0',
      remaining_quantity: quantity.toString(),
      side,
      type: 'ORDER_TYPE_MARKET',
      time_in_force: 'TIME_IN_FORCE_DAY',
      client_order_id: `CLT${orderId}`,
      created_at: tradeDate.toISOString(),
      updated_at: tradeDate.toISOString(),
      transact_at: tradeDate.toISOString(),
    };

    // Execute immediately
    const result = fillOrder({
      order,
      fillPrice: price,
      fillQuantity: quantity,
      timestamp: tradeDate,
      dataStore,
    });

    dataStore.orders.set(orderId, order);

    trades.push({ order, trade: result.trade, date: tradeDate });
  }

  // Sort by date
  trades.sort((a, b) => a.date - b.date);

  return trades;
}

/**
 * Initialize demo account with realistic history
 * @param {string} accountId - Account ID
 * @param {number} numMonths - Number of months of history
 * @param {Object} dataStore - Data store
 * @returns {Object} Initialized account
 */
export function initializeDemoAccount(accountId, numMonths, dataStore) {
  console.log(`\n🔧 Initializing demo account ${accountId} with ${numMonths} months history...`);

  // 1. Create initial account with cash
  const initialAccount = {
    account_id: accountId,
    type: 'UNION',
    status: 'ACCOUNT_ACTIVE',
    equity: { value: '0' },
    unrealized_profit: { value: '0' },
    realized_profit: { value: '0' },
    positions: [],
    cash: [
      {
        currency_code: 'RUB',
        units: '0',
        nanos: 0,
      },
    ],
    portfolio_mc: {
      available_cash: { value: '0' },
      initial_margin: { value: '0' },
      maintenance_margin: { value: '0' },
    },
  };
  dataStore.accounts.set(accountId, initialAccount);

  // 2. Generate historical bars for all instruments
  console.log('📊 Generating historical market data...');
  INSTRUMENTS.forEach(inst => {
    const bars = generateHistoricalBars(
      inst.symbol,
      365, // 1 year of data
      {
        startPrice: inst.startPrice,
        volatility: inst.volatility,
        trend: inst.trend,
        baseVolume: inst.baseVolume,
      }
    );
    dataStore.historicalBars.set(inst.symbol, bars);

    // Last bar = current quote
    const lastBar = bars[bars.length - 1];
    const closePrice = parseFloat(lastBar.close.value);

    dataStore.marketData.set(inst.symbol, {
      symbol: inst.symbol,
      timestamp: lastBar.timestamp,
      bid: { value: (closePrice - 0.01).toFixed(2) },
      bid_size: { value: '100' },
      ask: { value: (closePrice + 0.01).toFixed(2) },
      ask_size: { value: '100' },
      last: lastBar.close,
      last_size: { value: '10' },
      volume: lastBar.volume,
      open: lastBar.open,
      high: lastBar.high,
      low: lastBar.low,
      close: lastBar.close,
      change: {
        value: (closePrice - parseFloat(lastBar.open.value)).toFixed(2)
      },
    });

    console.log(`  ✓ ${inst.symbol}: ${bars.length} bars, current price ${closePrice.toFixed(2)}`);
  });

  // 3. Generate cash flow history
  console.log('\n💰 Generating cash flow history...');
  const cashTransactions = generateCashFlowHistory(accountId, numMonths, dataStore);
  console.log(`  ✓ Generated ${cashTransactions.length} deposit/withdrawal transactions`);

  // 4. Generate trading history
  console.log('\n📈 Generating trading history...');
  const tradingHistory = generateTradingHistory(accountId, numMonths, dataStore);
  console.log(`  ✓ Generated ${tradingHistory.length} trades`);

  // 5. Calculate final cash balance
  let cashBalance = 0;

  // Apply all transactions in chronological order
  const allTransactions = Array.from(dataStore.transactions.values())
    .filter(t => t.account_id === accountId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  allTransactions.forEach(txn => {
    const units = parseInt(txn.change.units || '0');
    const nanos = txn.change.nanos || 0;
    const change = units + nanos / 1e9;
    cashBalance += change;

    txn.balance_after = {
      currency_code: 'RUB',
      units: Math.floor(cashBalance).toString(),
      nanos: Math.floor((cashBalance % 1) * 1e9),
    };
  });

  // 6. Calculate positions value
  const accountPositions = Array.from(dataStore.positions.values())
    .filter(p => p.account_id === accountId);

  let positionsValue = 0;
  let totalUnrealizedPnL = 0;
  let totalRealizedPnL = 0;

  accountPositions.forEach(pos => {
    const qty = parseFloat(pos.quantity.value);
    const currentPrice = parseFloat(pos.current_price.value);
    const unrealizedPnL = parseFloat(pos.unrealized_pnl.value);
    const realizedPnL = parseFloat(pos.realized_pnl.value);

    positionsValue += qty * currentPrice;
    totalUnrealizedPnL += unrealizedPnL;
    totalRealizedPnL += realizedPnL;
  });

  const equity = cashBalance + positionsValue;

  // 7. Update account with final values
  const account = {
    account_id: accountId,
    type: 'UNION',
    status: 'ACCOUNT_ACTIVE',
    equity: { value: equity.toFixed(2) },
    unrealized_profit: { value: totalUnrealizedPnL.toFixed(2) },
    realized_profit: { value: totalRealizedPnL.toFixed(2) },
    positions: accountPositions,
    cash: [
      {
        currency_code: 'RUB',
        units: Math.floor(cashBalance).toString(),
        nanos: Math.floor((cashBalance % 1) * 1e9),
      },
    ],
    portfolio_mc: {
      available_cash: { value: Math.max(0, cashBalance).toFixed(2) },
      initial_margin: { value: '0' },
      maintenance_margin: { value: '0' },
    },
  };

  dataStore.accounts.set(accountId, account);

  // 8. Summary
  console.log('\n✅ Account initialized:');
  console.log(`  Account ID: ${accountId}`);
  console.log(`  Equity: ${equity.toFixed(2)} ₽`);
  console.log(`  Cash: ${cashBalance.toFixed(2)} ₽`);
  console.log(`  Positions Value: ${positionsValue.toFixed(2)} ₽`);
  console.log(`  Unrealized P&L: ${totalUnrealizedPnL.toFixed(2)} ₽`);
  console.log(`  Realized P&L: ${totalRealizedPnL.toFixed(2)} ₽`);
  console.log(`  Positions: ${accountPositions.length}`);
  console.log(`  Trades: ${tradingHistory.length}`);
  console.log(`  Transactions: ${allTransactions.length}`);

  if (accountPositions.length > 0) {
    console.log('\n📊 Current positions:');
    accountPositions.forEach(pos => {
      const qty = parseFloat(pos.quantity.value);
      const avgPrice = parseFloat(pos.average_price.value);
      const currentPrice = parseFloat(pos.current_price.value);
      const unrealizedPnL = parseFloat(pos.unrealized_pnl.value);
      const pnlPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice * 100).toFixed(2) : '0.00';

      console.log(`  ${pos.symbol}: ${qty} @ ${avgPrice.toFixed(2)} (current: ${currentPrice.toFixed(2)}, P&L: ${unrealizedPnL.toFixed(2)} / ${pnlPercent}%)`);
    });
  }

  return account;
}
