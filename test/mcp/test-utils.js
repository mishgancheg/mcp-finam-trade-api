/**
 * Shared utilities for MCP transport testing
 * Provides common functionality for testing HTTP, SSE, and STDIO transports
 */

// noinspection ES6UnusedImports
import * as _c from '../../dist/src/init-config.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create output directory if it doesn't exist
 * @param {string} transportName - Transport name (http, sse, stdio)
 * @returns {string} Full path to output directory
 */
export function ensureOutputDir (transportName) {
  const outputDir = path.join(__dirname, '..', '..', '_test-data', 'mcp', transportName);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

/**
 * Try to parse text content as JSON
 * @param {object} response - Response object
 * @returns {object|null} Parsed JSON or null if not parseable
 */
function tryParseResponseText (response) {
  try {
    // Try to extract text from different possible locations
    // For tools: response.result.content[0].text
    // For resources: response.result.contents[0].text
    const r = response?.result || {};
    const where = r.content ? 'content' : 'contents';

    const text = r[where]?.[0]?.text;
    if (typeof text === 'string' && text.trim()) {
      const parsedContent = JSON.parse(text);
      return { parsedContent, where };
    }
  } catch {
    // Not valid JSON, return null
  }
  return {};
}

/**
 * Save test result to markdown file
 * @param {string} outputDir - Output directory path
 * @param {string} type - 'tool' or 'resource'
 * @param {string} name - Tool or resource name
 * @param {object} request - Request data
 * @param {object} response - Response data
 */
export function saveTestResult (outputDir, type, name, request, response) {
  const fileName = `${type}_${name}.md`;
  const filePath = path.join(outputDir, fileName);

  // Try to parse text content as JSON
  const { parsedContent, where } = tryParseResponseText(response);
  const res = { ...response };

  if (parsedContent !== null) {
    res.result[where][0].text = '📝';
  }
  let content = `# ${type.toUpperCase()}: ${name}

## Request
\`\`\`json
${JSON.stringify(request, null, 2)}
\`\`\`



## Response (Raw)
\`\`\`json
${JSON.stringify(res, null, 2)}
\`\`\`
`;

  // Add parsed content section if JSON was successfully parsed
  if (parsedContent !== null) {
    content += `
## 📝 Response Content (Parsed)
\`\`\`json
${JSON.stringify(parsedContent, null, 2)}
\`\`\`
`;
  }

  content += `
**Test Date:** ${new Date().toISOString()}
`;

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Saved: ${fileName}`);
}

/**
 * Save error result to markdown file
 * @param {string} outputDir - Output directory path
 * @param {string} type - 'tool' or 'resource'
 * @param {string} name - Tool or resource name
 * @param {object} request - Request data
 * @param {Error} error - Error object
 */
export function saveErrorResult (outputDir, type, name, request, error) {
  const fileName = `${type}_${name}.md`;
  const filePath = path.join(outputDir, fileName);

  const content = `# ${type.toUpperCase()}: ${name}

## Request
\`\`\`json
${JSON.stringify(request, null, 2)}
\`\`\`

## Error
\`\`\`
${error.message}
${error.stack || ''}
\`\`\`

**Test Date:** ${new Date().toISOString()}
`;

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`❌ Error saved: ${fileName}`);
}

/**
 * Save MCP listing result to markdown file
 * @param {string} outputDir - Output directory path
 * @param {string} listType - 'tools', 'resources', or 'prompts'
 * @param {object} request - Request data
 * @param {object} response - Response data
 */
export function saveListingResult (outputDir, listType, request, response) {
  const fileName = `_listing_${listType}.md`;
  const filePath = path.join(outputDir, fileName);

  const content = `# MCP ${listType.toUpperCase()} LISTING

## Request
\`\`\`json
${JSON.stringify(request, null, 2)}
\`\`\`

## Response
\`\`\`json
${JSON.stringify(response, null, 2)}
\`\`\`

**Test Date:** ${new Date().toISOString()}
`;

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`📋 Saved listing: ${fileName}`);
}

const mcpHttpPort = parseInt(process.env.MCP_HTTP_PORT || '3001', 10);
/**
 * Test configuration with credentials from environment
 */
export const testConfig = {
  secretToken: process.env.TEST_API_SECRET_TOKEN,
  accountId: process.env.TEST_ACCOUNT_ID,
  mcpHttpPort,
  baseUrl: `http://localhost:${mcpHttpPort}`,
};

/**
 * Common test tools definitions
 * These are the tools that should be available on all transports
 */
export const commonTestCases = {
  // Tools that require no parameters except credentials
  simple: [
    { name: 'Auth', args: {} },
    { name: 'Clock', args: {} },
    { name: 'Assets', args: {} },
  ],

  // Tools that require symbol parameter
  withSymbol: [
    { name: 'LastQuote', args: { symbol: 'YDEX@MISX' } },
    { name: 'LatestTrades', args: { symbol: 'YDEX@MISX' } },
    { name: 'OrderBook', args: { symbol: 'YDEX@MISX' } },
    { name: 'GetAssetDetails', args: { symbol: 'YDEX@MISX' } },
    { name: 'Schedule', args: { symbol: 'YDEX@MISX' } },
    { name: 'OptionsChain', args: { symbol: 'YDEX@MISX' } },
  ],

  // Tools that require query parameter
  withQuery: [
    { name: 'SearchInstruments', args: { query: 'YDEX' } },
  ],

  // Tools that require account_id
  withAccount: [
    { name: 'GetAccount', args: {} },
    { name: 'GetOrders', args: {} },
  ],

  // Tools that require time range
  withTimeRange: [
    {
      name: 'Trades',
      args: {
        start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
      },
    },
    {
      name: 'Transactions',
      args: {
        start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
      },
    },
    {
      name: 'Bars',
      args: {
        symbol: 'YDEX@MISX',
        start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        timeframe: 'TIME_FRAME_D',
      },
    },
  ],
};

/**
 * Optional test cases that require special parameters
 * These tests need to be run separately with real data
 *
 * To test these manually:
 * 1. TokenDetails - requires jwt_token from Auth tool
 * 2. GetOrder - requires existing order_id
 * 3. CancelOrder - requires existing order_id (will cancel the order!)
 * 4. PlaceOrder - requires valid trading parameters (will create real order!)
 */
export const optionalTestCases = {
  // Requires jwt_token from Auth response
  withJwtToken: [
    {
      name: 'TokenDetails',
      args: { jwt_token: 'REPLACE_WITH_JWT_TOKEN' },
      description: 'Get jwt_token from Auth tool first',
    },
  ],

  // Requires existing order_id (read-only)
  withOrderId: [
    {
      name: 'GetOrder',
      args: { order_id: 'REPLACE_WITH_ORDER_ID' },
      description: 'Get order_id from GetOrders tool first',
    },
  ],

  // WARNING: These operations modify real data!
  dangerous: [
    {
      name: 'PlaceOrder',
      args: {
        symbol: 'YDEX@MISX',
        quantity: 1,
        side: 'SIDE_BUY',
        type: 'ORDER_TYPE_LIMIT',
        time_in_force: 'TIME_IN_FORCE_DAY',
        limit_price: 1000.0,
      },
      description: 'WARNING: Creates real order! Use only on test account',
    },
    {
      name: 'CancelOrder',
      args: { order_id: 'REPLACE_WITH_ORDER_ID' },
      description: 'WARNING: Cancels real order! Get order_id from PlaceOrder first',
    },
  ],
};

/**
 * Common resource definitions
 */
export const commonResources = [
  'enum://OrderType',
  'enum://TimeInForce',
  'enum://OrderStatus',
  'enum://StopCondition',
  'enum://QuoteLevel',
  'enum://AccountType',
  'enum://AccountStatus',
  'enum://AssetType',
  'enum://OptionType',
  'enum://SessionType',
  'enum://TimeFrame',
  'enum://TransactionCategory',
  'enum://OrderBookAction',
  'exchange://list',
];

/**
 * Flatten all test cases into a single array
 * @returns {Array} Array of all test cases
 */
export function getAllTestCases () {
  return [
    ...commonTestCases.simple,
    ...commonTestCases.withSymbol,
    ...commonTestCases.withQuery,
    ...commonTestCases.withAccount,
    ...commonTestCases.withTimeRange,
  ];
}

/**
 * Log test start
 * @param {string} transport - Transport name
 */
export function logTestStart (transport) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Starting MCP ${transport.toUpperCase()} Transport Tests`);
  console.log(`${'='.repeat(60)}\n`);
}

/**
 * Log test summary
 * @param {string} transport - Transport name
 * @param {number} successCount - Number of successful tests
 * @param {number} errorCount - Number of failed tests
 */
export function logTestSummary (transport, successCount, errorCount) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${transport.toUpperCase()} Test Summary`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📁 Total: ${successCount + errorCount}`);
  console.log(`${'='.repeat(60)}\n`);
}
