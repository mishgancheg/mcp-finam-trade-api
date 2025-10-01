/**
 * API Library Tester
 *
 * Tests all API wrapper functions from dist/src/api.js
 * Supports both real API and emulator modes
 */

// noinspection ES6UnusedImports
import * as _c from '../dist/src/init-config.js';
import * as api from '../dist/src/api.js';
import chalk from 'chalk';
import { getJwtToken } from '../dist/src/lib/jwt-auth.js';

// ==================== Configuration ====================

function getTestConfig () {
  const secretToken = process.env.API_SECRET_TOKEN;
  const accountId = process.env.ACCOUNT_ID;
  const baseUrl = process.env.API_BASE_URL;

  if (!secretToken) {
    throw new Error('API_SECRET_TOKEN not set in .env');
  }

  if (!accountId) {
    throw new Error('ACCOUNT_ID not set in .env');
  }

  return {
    secretToken,
    accountId,
    baseUrl,
    symbol: 'YDEX@MISX', // Default test symbol
  };
}

// ==================== Test Runner ====================

async function runTest (fullId, name, testFn) {
  try {
    await testFn();
    console.log(chalk.green(`[${fullId}] ✅  ${name}`));
    return { fullId, name, success: true };
  } catch (error) {
    console.log(chalk.red(`[${fullId}] ❌  ${name}`));
    const errorMessage = error.message || String(error);
    console.log(errorMessage);
    return { fullId, name, success: false, error: errorMessage };
  }
}

// ==================== Test Cases ====================

function getTests (config) {
  const endTime = new Date().toISOString();
  const startTime30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const startTime7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  return [
    // Group 1: Authentication
    {
      fullId: '1-1',
      name: 'Auth',
      testFn: () => api.Auth({ secret_token: config.secretToken }),
    },
    {
      fullId: '1-2',
      name: 'TokenDetails',
      testFn: async () => {
        const jwt_token = await getJwtToken(config.secretToken);
        return api.TokenDetails({ jwt_token });
      },
    },
    // Group 2: Accounts
    {
      fullId: '2-1',
      name: 'GetAccount',
      testFn: () => api.GetAccount({ secret_token: config.secretToken, account_id: config.accountId }),
    },
    {
      fullId: '2-2',
      name: 'Trades',
      testFn: () => api.Trades({
        secret_token: config.secretToken,
        account_id: config.accountId,
        start_time: startTime30d,
        end_time: endTime,
      }),
    },
    {
      fullId: '2-3',
      name: 'Transactions',
      testFn: () => api.Transactions({
        secret_token: config.secretToken,
        account_id: config.accountId,
        start_time: startTime30d,
        end_time: endTime,
      }),
    },
    // Group 3: Instruments
    {
      fullId: '3-1',
      name: 'Assets',
      testFn: () => api.Assets({ secret_token: config.secretToken }),
    },
    {
      fullId: '3-2',
      name: 'Clock',
      testFn: () => api.Clock({ secret_token: config.secretToken }),
    },
    {
      fullId: '3-3',
      name: 'Exchanges',
      testFn: () => api.Exchanges({ secret_token: config.secretToken }),
    },
    {
      fullId: '3-4',
      name: 'GetAsset',
      testFn: () => api.GetAsset({
        secret_token: config.secretToken,
        account_id: config.accountId,
        symbol: config.symbol,
      }),
    },
    {
      fullId: '3-5',
      name: 'GetAssetParams',
      testFn: () => api.GetAssetParams({
        secret_token: config.secretToken,
        account_id: config.accountId,
        symbol: config.symbol,
      }),
    },
    {
      fullId: '3-6',
      name: 'OptionsChain',
      testFn: () => api.OptionsChain({ secret_token: config.secretToken, symbol: config.symbol }),
    },
    {
      fullId: '3-7',
      name: 'Schedule',
      testFn: () => api.Schedule({ secret_token: config.secretToken, symbol: config.symbol }),
    },
    // Group 4: Orders
    {
      fullId: '4-1',
      name: 'CancelOrder',
      testFn: () => api.CancelOrder({
        secret_token: config.secretToken,
        account_id: config.accountId,
        order_id: 'test-order-id', // Replace with real order_id
      }),
    },
    {
      fullId: '4-2',
      name: 'GetOrder',
      testFn: () => api.GetOrder({
        secret_token: config.secretToken,
        account_id: config.accountId,
        order_id: 'test-order-id', // Replace with real order_id
      }),
    },
    {
      fullId: '4-3',
      name: 'GetOrders',
      testFn: () => api.GetOrders({ secret_token: config.secretToken, account_id: config.accountId }),
    },
    {
      fullId: '4-4',
      name: 'PlaceOrder',
      testFn: () => api.PlaceOrder({
        secret_token: config.secretToken,
        account_id: config.accountId,
        symbol: config.symbol,
        quantity: '1',
        side: 'SIDE_BUY',
        type: 'ORDER_TYPE_LIMIT',
        time_in_force: 'TIME_IN_FORCE_DAY',
        limit_price: '1000',
      }),
    },

    // Group 5: Market Data
    {
      fullId: '5-1',
      name: 'Bars',
      testFn: () => api.Bars({
        secret_token: config.secretToken,
        symbol: config.symbol,
        start_time: startTime7d,
        end_time: endTime,
        timeframe: 'TIME_FRAME_D',
      }),
    },
    {
      fullId: '5-2',
      name: 'LastQuote',
      testFn: () => api.LastQuote({ secret_token: config.secretToken, symbol: config.symbol }),
    },
    {
      fullId: '5-3',
      name: 'LatestTrades',
      testFn: () => api.LatestTrades({ secret_token: config.secretToken, symbol: config.symbol }),
    },
    {
      fullId: '5-4',
      name: 'OrderBook',
      testFn: () => api.OrderBook({ secret_token: config.secretToken, symbol: config.symbol }),
    },
  ];
}

// ==================== Main Test Suite ====================

async function runAllTests () {
  const baseUrl = process.env.API_BASE_URL;
  console.log(`Testing ${baseUrl} through a layer of API functions`);
  const config = getTestConfig();
  const tests = getTests(config);
  const results = [];

  for (const test of tests) {
    const result = await runTest(test.fullId, test.name, test.testFn);
    results.push(result);
  }

  // Summary
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(chalk.cyan(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`));
}

// ==================== CLI Interface ====================

async function main () {
  try {
    await runAllTests();
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n❌ Fatal error:'), error);
    process.exit(1);
  }
}

main();
