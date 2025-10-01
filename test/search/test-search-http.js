#!/usr/bin/env node
/**
 * Instrument Search HTTP Transport Tester
 *
 * Tests the SearchInstruments MCP tool via HTTP transport
 * IMPORTANT: Server must be running before executing this test!
 * Start server: npm run mcp:http
 */

import chalk from 'chalk';
import { getOutputDir, saveResult, TEST_SEARCHES } from './test-cases.js';
import fetch from 'node-fetch';

export const OUTPUT_DIR = getOutputDir('http');

const BASE_URL = process.env.MCP_HTTP_BASE_URL || 'http://localhost:3001';
const SECRET_TOKEN = process.env.API_SECRET_TOKEN;
const ACCOUNT_ID = process.env.ACCOUNT_ID;

/**
 * Check if server is running
 */
async function checkServerAvailability () {
  console.log(`✓  Checking server availability: ${BASE_URL}/health ...`);
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const health = await response.json();
    console.log(chalk.green(`✅  Server is running: ${health.status}`));
    return true;
  } catch {
    return false;
  }
}

/**
 * Search for instruments via HTTP
 */
async function searchInstruments (query) {
  const request = {
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 1000000),
    method: 'tools/call',
    params: {
      name: 'SearchInstruments',
      arguments: {
        query,
      },
    },
  };

  const response = await fetch(`${BASE_URL}/mcp/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECRET_TOKEN}`,
      'X-Finam-Account-Id': ACCOUNT_ID,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`MCP Error ${data.error.code}: ${data.error.message}`);
  }

  return data.result;
}

/**
 * Main test execution
 */
async function main () {
  console.log(chalk.bold.cyan('\n🧪 Instrument Search HTTP Transport Test\n'));

  // Check server availability
  const isAvailable = await checkServerAvailability();

  if (!isAvailable) {
    console.error(chalk.red('\n❌  Error: MCP server is not running!'));
    console.error(chalk.yellow('\nPlease start the server first:'));
    console.error(chalk.white('  npm run mcp:http\n'));
    process.exit(1);
  }

  console.log(chalk.cyan('\n📋 Running search tests...\n'));

  let successCount = 0;
  let failCount = 0;

  for (const { query, description } of TEST_SEARCHES) {
    try {
      console.log(chalk.blue(`Testing: ${description} (${query})`));

      const result = await searchInstruments(query);
      const content = result.content?.[0]?.text || result;
      const results = (typeof content === 'string' ? JSON.parse(content) : content) || [];

      console.log(chalk.green(`  ✓ Found ${results.length} result(s)`));

      saveResult({ query, description }, results, true, OUTPUT_DIR);
      successCount++;
    } catch (error) {
      console.log(chalk.red(`  ✗ Error: ${error.message}`));
      failCount++;
    }
  }

  console.log(chalk.bold.cyan(`\n📊 Test Summary:`));
  console.log(chalk.green(`  ✓ Success: ${successCount}`));
  if (failCount) {
    console.log(chalk.red(`  ✗ Failed: ${failCount}`));
  }
  console.log(chalk.white(`  📁 Results saved to: ${OUTPUT_DIR}\n`));

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error(chalk.red('\n❌ Fatal error:'), error);
  process.exit(1);
});
