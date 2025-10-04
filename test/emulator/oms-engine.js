/**
 * OMS Engine - Order Management System logic for FINAM API Emulator
 * Handles order execution, position management, market data generation
 */

/**
 * Box-Muller transform for Gaussian (normal) distribution
 * @param {number} mean - Mean of the distribution (default 0)
 * @param {number} stdev - Standard deviation (default 1)
 * @returns {number} Random number from normal distribution
 */
export function gaussianRandom(mean = 0, stdev = 1) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

/**
 * Generate historical bars for an instrument using random walk
 * @param {string} symbol - Instrument symbol
 * @param {number} numDays - Number of days to generate
 * @param {Object} params - Generation parameters
 * @returns {Array} Array of bar objects
 */
export function generateHistoricalBars(symbol, numDays = 365, params = {}) {
  const {
    startPrice = 250,
    volatility = 0.015,
    trend = 0.0005,
    baseVolume = 100000,
  } = params;

  const bars = [];
  let price = startPrice;
  const now = new Date();

  for (let i = numDays - 1; i >= 0; i--) {
    // Random walk with trend
    const randomChange = gaussianRandom(0, volatility);
    const trendChange = trend;
    const totalChange = randomChange + trendChange;

    const open = price;
    price = price * (1 + totalChange);
    const close = price;

    // High/Low with intraday volatility
    const intraVol = volatility / 2;
    const high = Math.max(open, close) * (1 + Math.abs(gaussianRandom(0, intraVol)));
    const low = Math.min(open, close) * (1 - Math.abs(gaussianRandom(0, intraVol)));

    // Volume correlates with price change
    const volume = baseVolume * (1 + Math.abs(totalChange) * 10 + gaussianRandom(0, 0.5));

    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - i);
    timestamp.setHours(18, 45, 0, 0); // market close

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

/**
 * Generate order book levels around bid/ask
 * @param {string} symbol - Instrument symbol
 * @param {number} bidPrice - Bid price
 * @param {number} askPrice - Ask price
 * @param {number} levels - Number of levels per side
 * @returns {Object} Order book with bids and asks
 */
export function generateOrderBook(symbol, bidPrice, askPrice, levels = 10) {
  const bids = [];
  const asks = [];

  const priceStep = parseFloat(bidPrice) * 0.0001; // 0.01% steps

  for (let i = 0; i < levels; i++) {
    const bidPx = parseFloat(bidPrice) - i * priceStep;
    const askPx = parseFloat(askPrice) + i * priceStep;

    // Size decreases with distance from best price
    const baseSize = 100 * (1 - i / levels);
    const bidSize = Math.floor(baseSize * (1 + gaussianRandom(0, 0.3)));
    const askSize = Math.floor(baseSize * (1 + gaussianRandom(0, 0.3)));

    bids.push({
      price: { value: bidPx.toFixed(2) },
      quantity: { value: bidSize.toString() },
      action: 'ORDER_BOOK_ACTION_ADD',
    });

    asks.push({
      price: { value: askPx.toFixed(2) },
      quantity: { value: askSize.toString() },
      action: 'ORDER_BOOK_ACTION_ADD',
    });
  }

  return {
    symbol,
    bids: bids.sort((a, b) => parseFloat(b.price.value) - parseFloat(a.price.value)),
    asks: asks.sort((a, b) => parseFloat(a.price.value) - parseFloat(b.price.value)),
  };
}

/**
 * Generate recent trades around current price
 * @param {string} symbol - Instrument symbol
 * @param {number} lastPrice - Last trade price
 * @param {number} count - Number of trades
 * @returns {Array} Array of trade objects
 */
export function generateRecentTrades(symbol, lastPrice, count = 20) {
  const trades = [];
  const now = Date.now();
  const priceFloat = parseFloat(lastPrice);

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = new Date(now - i * 5000); // 5 second intervals
    const priceChange = gaussianRandom(0, 0.005); // 0.5% volatility
    const price = priceFloat * (1 + priceChange);
    const size = Math.floor(10 + Math.random() * 90);
    const side = Math.random() > 0.5 ? 'SIDE_BUY' : 'SIDE_SELL';

    trades.push({
      trade_id: `MKT${now - i * 5000}`,
      symbol,
      price: { value: price.toFixed(2) },
      size: { value: size.toString() },
      side,
      timestamp: timestamp.toISOString(),
    });
  }

  return trades;
}

/**
 * Get price at specific date from historical bars
 * @param {Map} historicalBars - Map of symbol to bars
 * @param {string} symbol - Instrument symbol
 * @param {Date} date - Target date
 * @returns {number} Price at that date
 */
export function getPriceAtDate(historicalBars, symbol, date) {
  const bars = historicalBars.get(symbol) || [];

  // Find the closest bar to the target date
  const targetTime = date.getTime();
  let closestBar = bars[0];
  let minDiff = Math.abs(new Date(closestBar.timestamp).getTime() - targetTime);

  for (const bar of bars) {
    const diff = Math.abs(new Date(bar.timestamp).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closestBar = bar;
    }
  }

  return parseFloat(closestBar.close.value);
}

/**
 * Create transaction record
 * @param {Object} params - Transaction parameters
 * @param {Map} transactions - Transactions store
 * @param {Object} counters - ID counters
 * @returns {Object} Created transaction
 */
export function createTransaction(params, transactions, counters) {
  const {
    account_id,
    category,
    timestamp = new Date().toISOString(),
    change,
    balance_after,
    symbol = '',
    trade_id = '',
    order_id = '',
    description = '',
  } = params;

  const txn = {
    id: `${counters.transactionIdCounter++}`,
    account_id,
    category,
    timestamp,
    symbol,
    change,
    balance_after: balance_after || { currency_code: 'RUB', units: '0', nanos: 0 },
    trade_id,
    order_id,
    description,
    transaction_category: category,
    transaction_name: description || getCategoryName(category),
  };

  transactions.set(txn.id, txn);
  return txn;
}

/**
 * Get human-readable name for transaction category
 */
function getCategoryName(category) {
  const names = {
    TRADE: 'Сделка',
    COMMISSION: 'Брокерская комиссия',
    DEPOSIT: 'Пополнение счета',
    WITHDRAWAL: 'Вывод средств',
    DIVIDEND: 'Дивиденды',
  };
  return names[category] || category;
}

/**
 * Create trade record
 * @param {Object} order - Order object
 * @param {number} fillPrice - Fill price
 * @param {number} fillQuantity - Fill quantity
 * @param {Date} timestamp - Trade timestamp
 * @param {Object} counters - ID counters
 * @returns {Object} Created trade
 */
export function createTrade(order, fillPrice, fillQuantity, timestamp, counters) {
  const commission = fillPrice * fillQuantity * 0.0005; // 0.05% commission

  return {
    trade_id: `${counters.tradeIdCounter++}`,
    order_id: order.order_id,
    exec_id: order.exec_id,
    account_id: order.account_id,
    symbol: order.symbol,
    price: { value: fillPrice.toFixed(2) },
    size: { value: fillQuantity.toString() },
    side: order.side,
    timestamp: timestamp.toISOString(),
    commission: {
      currency_code: 'RUB',
      units: Math.floor(commission).toString(),
      nanos: Math.floor((commission % 1) * 1e9),
    },
  };
}

/**
 * Update position after trade
 * @param {Object} params - Update parameters
 * @param {Map} positions - Positions store
 * @param {Map} marketData - Market data store
 */
export function updatePosition(params, positions, marketData) {
  const { accountId, symbol, side, quantity, price } = params;
  const positionKey = `${accountId}:${symbol}`;
  let position = positions.get(positionKey);

  if (!position) {
    position = {
      account_id: accountId,
      symbol,
      quantity: { value: '0' },
      average_price: { value: '0' },
      current_price: { value: price.toFixed(2) },
      daily_pnl: { value: '0' },
      unrealized_pnl: { value: '0' },
      realized_pnl: { value: '0' },
    };
    positions.set(positionKey, position);
  }

  const currentQty = parseFloat(position.quantity.value);
  const avgPrice = parseFloat(position.average_price.value);

  if (side === 'SIDE_BUY') {
    // Increase position
    const totalCost = currentQty * avgPrice + quantity * price;
    const totalQuantity = currentQty + quantity;
    position.average_price.value = totalQuantity > 0 ? (totalCost / totalQuantity).toFixed(2) : '0';
    position.quantity.value = totalQuantity.toString();
  } else {
    // SIDE_SELL: decrease position
    const realizedPnL = (price - avgPrice) * quantity;
    const currentRealized = parseFloat(position.realized_pnl.value);
    position.realized_pnl.value = (currentRealized + realizedPnL).toFixed(2);
    position.quantity.value = (currentQty - quantity).toString();

    // If position closed completely
    if (parseFloat(position.quantity.value) === 0) {
      position.average_price.value = '0';
    }
  }

  // Update unrealized P&L
  const quote = marketData.get(symbol);
  const currentPrice = quote ? parseFloat(quote.last.value) : price;
  position.current_price.value = currentPrice.toFixed(2);

  const unrealizedPnL = (currentPrice - parseFloat(position.average_price.value)) * parseFloat(position.quantity.value);
  position.unrealized_pnl.value = unrealizedPnL.toFixed(2);

  // Remove position if quantity is 0
  if (parseFloat(position.quantity.value) === 0) {
    positions.delete(positionKey);
  }

  return position;
}

/**
 * Update cash balance
 * @param {Map} accounts - Accounts store
 * @param {string} accountId - Account ID
 * @param {string} currency - Currency code
 * @param {number} change - Amount to add/subtract
 */
export function updateCashBalance(accounts, accountId, currency, change) {
  const account = accounts.get(accountId);
  if (!account) return;

  const cashEntry = account.cash.find(c => c.currency_code === currency);
  if (cashEntry) {
    const currentUnits = parseInt(cashEntry.units);
    const currentNanos = cashEntry.nanos;
    const currentTotal = currentUnits + currentNanos / 1e9;
    const newTotal = currentTotal + change;

    cashEntry.units = Math.floor(newTotal).toString();
    cashEntry.nanos = Math.floor((newTotal % 1) * 1e9);
  }
}

/**
 * Fill order (execute trade)
 * @param {Object} params - Fill parameters
 * @returns {Object} Fill result
 */
export function fillOrder(params) {
  const {
    order,
    fillPrice,
    fillQuantity,
    timestamp = new Date(),
    dataStore
  } = params;

  // 1. Create trade record
  const trade = createTrade(order, fillPrice, fillQuantity, timestamp, dataStore);
  dataStore.trades.set(trade.trade_id, trade);

  // 2. Update position
  updatePosition({
    accountId: order.account_id,
    symbol: order.symbol,
    side: order.side,
    quantity: fillQuantity,
    price: fillPrice,
  }, dataStore.positions, dataStore.marketData);

  // 3. Calculate commission
  const tradeAmount = fillPrice * fillQuantity;
  const commission = tradeAmount * 0.0005; // 0.05%

  // 4. Update cash balance
  const cashChange = order.side === 'SIDE_BUY'
    ? -(tradeAmount + commission)
    : (tradeAmount - commission);

  updateCashBalance(dataStore.accounts, order.account_id, 'RUB', cashChange);

  // 5. Get current cash balance for transaction
  const account = dataStore.accounts.get(order.account_id);
  const cashEntry = account.cash.find(c => c.currency_code === 'RUB');
  const currentBalance = parseInt(cashEntry.units) + cashEntry.nanos / 1e9;

  // 6. Create transactions
  createTransaction({
    account_id: order.account_id,
    category: 'TRADE',
    timestamp: timestamp.toISOString(),
    change: {
      currency_code: 'RUB',
      units: Math.floor(cashChange).toString(),
      nanos: Math.floor((cashChange % 1) * 1e9),
    },
    balance_after: {
      currency_code: 'RUB',
      units: Math.floor(currentBalance).toString(),
      nanos: Math.floor((currentBalance % 1) * 1e9),
    },
    symbol: order.symbol,
    trade_id: trade.trade_id,
    order_id: order.order_id,
    description: `${order.side === 'SIDE_BUY' ? 'Покупка' : 'Продажа'} ${fillQuantity} ${order.symbol} @ ${fillPrice.toFixed(2)}`,
  }, dataStore.transactions, dataStore);

  createTransaction({
    account_id: order.account_id,
    category: 'COMMISSION',
    timestamp: timestamp.toISOString(),
    change: {
      currency_code: 'RUB',
      units: Math.floor(-commission).toString(),
      nanos: Math.floor((-commission % 1) * 1e9),
    },
    balance_after: {
      currency_code: 'RUB',
      units: Math.floor(currentBalance).toString(),
      nanos: Math.floor((currentBalance % 1) * 1e9),
    },
    trade_id: trade.trade_id,
    order_id: order.order_id,
    description: 'Брокерская комиссия',
  }, dataStore.transactions, dataStore);

  // 7. Update order status
  order.filled_quantity = (parseFloat(order.filled_quantity?.value || '0') + fillQuantity).toString();
  order.remaining_quantity = (parseFloat(order.quantity.value) - parseFloat(order.filled_quantity)).toString();

  // Calculate weighted average fill price
  const prevFilled = parseFloat(order.filled_quantity) - fillQuantity;
  const prevAvg = parseFloat(order.average_fill_price?.value || '0');
  const newAvg = prevFilled > 0
    ? ((prevAvg * prevFilled + fillPrice * fillQuantity) / parseFloat(order.filled_quantity)).toFixed(2)
    : fillPrice.toFixed(2);

  order.average_fill_price = { value: newAvg };
  order.status = parseFloat(order.remaining_quantity) === 0
    ? 'ORDER_STATUS_FILLED'
    : 'ORDER_STATUS_PARTIALLY_FILLED';
  order.exec_id = `ord.${order.order_id}.${dataStore.execIdCounter++}`;
  order.transact_at = timestamp.toISOString();

  return { status: 'filled', trade };
}

/**
 * Execute order based on current market price
 * @param {Object} order - Order to execute
 * @param {number} currentMarketPrice - Current market price
 * @param {Object} dataStore - Data store
 * @returns {Object} Execution result
 */
export function executeOrder(order, currentMarketPrice, dataStore) {
  // Check execution conditions
  if (order.type === 'ORDER_TYPE_MARKET') {
    return fillOrder({
      order,
      fillPrice: currentMarketPrice,
      fillQuantity: parseFloat(order.remaining_quantity || order.quantity.value),
      dataStore,
    });
  }

  if (order.type === 'ORDER_TYPE_LIMIT') {
    const limitPrice = parseFloat(order.limit_price.value);

    // BUY LIMIT: execute if market <= limit_price
    if (order.side === 'SIDE_BUY' && currentMarketPrice <= limitPrice) {
      return fillOrder({
        order,
        fillPrice: limitPrice,
        fillQuantity: parseFloat(order.remaining_quantity || order.quantity.value),
        dataStore,
      });
    }

    // SELL LIMIT: execute if market >= limit_price
    if (order.side === 'SIDE_SELL' && currentMarketPrice >= limitPrice) {
      return fillOrder({
        order,
        fillPrice: limitPrice,
        fillQuantity: parseFloat(order.remaining_quantity || order.quantity.value),
        dataStore,
      });
    }
  }

  if (order.type === 'ORDER_TYPE_STOP') {
    const stopPrice = parseFloat(order.stop_price.value);

    // STOP orders trigger when stop price is reached
    if (order.side === 'SIDE_BUY' && currentMarketPrice >= stopPrice) {
      return fillOrder({
        order,
        fillPrice: currentMarketPrice,
        fillQuantity: parseFloat(order.remaining_quantity || order.quantity.value),
        dataStore,
      });
    }

    if (order.side === 'SIDE_SELL' && currentMarketPrice <= stopPrice) {
      return fillOrder({
        order,
        fillPrice: currentMarketPrice,
        fillQuantity: parseFloat(order.remaining_quantity || order.quantity.value),
        dataStore,
      });
    }
  }

  return { status: 'pending' };
}

/**
 * Recalculate account metrics (equity, unrealized P&L)
 * @param {string} accountId - Account ID
 * @param {Object} dataStore - Data store
 */
export function recalculateAccountMetrics(accountId, dataStore) {
  const account = dataStore.accounts.get(accountId);
  if (!account) return;

  // Get all positions for this account
  const accountPositions = Array.from(dataStore.positions.values())
    .filter(p => p.account_id === accountId);

  // Calculate positions value
  let positionsValue = 0;
  let totalUnrealizedPnL = 0;

  accountPositions.forEach(pos => {
    const qty = parseFloat(pos.quantity.value);
    const currentPrice = parseFloat(pos.current_price.value);
    const unrealizedPnL = parseFloat(pos.unrealized_pnl.value);

    positionsValue += qty * currentPrice;
    totalUnrealizedPnL += unrealizedPnL;
  });

  // Get cash balance
  const cashEntry = account.cash.find(c => c.currency_code === 'RUB');
  const cashBalance = cashEntry ? parseInt(cashEntry.units) + cashEntry.nanos / 1e9 : 0;

  // Calculate equity
  const equity = cashBalance + positionsValue;

  // Calculate realized P&L from all trades
  const realizedPnL = accountPositions.reduce((sum, pos) =>
    sum + parseFloat(pos.realized_pnl.value), 0);

  // Update account
  account.equity = { value: equity.toFixed(2) };
  account.unrealized_profit = { value: totalUnrealizedPnL.toFixed(2) };
  account.realized_profit = { value: realizedPnL.toFixed(2) };
  account.positions = accountPositions;
  account.portfolio_mc.available_cash = { value: Math.max(0, cashBalance).toFixed(2) };
}
