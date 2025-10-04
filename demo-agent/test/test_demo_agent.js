// noinspection UnnecessaryLocalVariableJS

/**
 * Test demo-agent with data from test.csv
 *
 * How it works:
 * 1. Loads questions from demo-agent/test/data/test.csv
 * 2. Sends each question to demo-agent via REST API (/api/chat)
 * 3. Demo-agent uses Claude to understand and call MCP tools
 * 4. MCP Server returns result + list of called API endpoints
 * 5. Demo-agent extracts `endpoints` from MCP response
 * 6. Saves results to _test-data/<timestamp>_result.json and _test-data/<timestamp>_submission.csv
 */

import '../dist/init-config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { getToolEndpoints } from './tool-endpoints.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = process.env.DEMO_API_BASE || 'http://localhost:3002';
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 500;
const CSV_PATH = path.join(__dirname, 'data', 'test.csv');
const OUTPUT_DIR = path.join(__dirname, '..', '_test-data');

// Test credentials from environment variables
const TEST_ACCOUNT_ID = process.env.TEST_ACCOUNT_ID || '';
const TEST_API_SECRET_TOKEN = process.env.TEST_API_SECRET_TOKEN || '';

/**
 * Load questions from CSV file
 * @returns {Array<{uid: string, question: string}>}
 */
function loadQuestions() {
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';'
  });

  console.log(`✅ Loaded ${records.length} questions from ${CSV_PATH}`);
  return records;
}

/**
 * Create a new session
 * @param {string} userId
 * @returns {Promise<{sessionId: string, userId: string, createdAt: string}>}
 */
async function createSession(userId) {
  const response = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Send message to demo-agent
 * @param {string} sessionId
 * @param {string} message
 * @param {string} accountId - Account ID for MCP credentials
 * @param {string} secretKey - Secret token for MCP credentials
 * @returns {Promise<{sessionId: string, message: string, toolCalls: Array}>}
 */
async function sendMessage(sessionId, message, accountId, secretKey) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message,
      accountId,
      secretKey
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Replace placeholders in endpoint with actual values from params
 * @param {string} endpoint - Endpoint like "GET;/v1/accounts/{account_id}/orders"
 * @param {Object} params - Parameters object
 * @param {string} accountId - Account ID from environment
 * @returns {string} - Endpoint with replaced placeholders
 */
function replaceEndpointPlaceholders(endpoint, params, accountId) {
  let result = endpoint;

  // Replace {account_id} with accountId from environment
  if (accountId) {
    result = result.replace(/{account_id}/g, accountId);
  }

  // Replace {symbol} with symbol from params
  if (params && params.symbol) {
    result = result.replace(/{symbol}/g, params.symbol);
  }

  // Replace {order_id} with orderId from params
  if (params && params.orderId) {
    result = result.replace(/{order_id}/g, params.orderId);
  }

  return result;
}

/**
 * Extract endpoints from toolCalls array
 * @param {Array} toolCalls - Array of tool call objects from response
 * @param {string} accountId - Account ID from environment
 * @returns {Array<string>} - Array of endpoint strings like "GET;/v1/sessions"
 */
function extractEndpoints(toolCalls, accountId) {
  if (!toolCalls || !Array.isArray(toolCalls)) {
    return [];
  }

  const allEndpoints = [];

  for (const toolCall of toolCalls) {
    const toolName = toolCall.name;
    const params = toolCall.params || {};

    const endpoints = getToolEndpoints(toolName);

    // Replace placeholders in each endpoint
    for (const endpoint of endpoints) {
      const resolvedEndpoint = replaceEndpointPlaceholders(endpoint, params, accountId);
      allEndpoints.push([toolName, resolvedEndpoint]);
    }
  }

  return allEndpoints;
}

/**
 * Process a batch of questions with delay
 * @param {Array<{uid: string, question: string}>} questions
 * @param {string} sessionId
 * @param {number} batchIndex
 * @param {number} startIndex - Starting index in the full question list
 * @returns {Promise<Array<{uid: string, type: string, endpointsAndNames: Array<string>}>>}
 */
async function processBatch(questions, sessionId, batchIndex, startIndex) {
  const results = [];

  console.log(`\n📦 Processing batch ${batchIndex + 1} (${questions.length} questions)...`);

  for (let i = 0; i < questions.length; i++) {
    const { uid, question } = questions[i];
    const questionNumber = startIndex + i + 1;

    try {
      // Send message to API
      console.log(`\n  📤 [${questionNumber}] Sending: "${question.substring(0, 60)}${question.length > 60 ? '...' : ''}" (${uid})`);
      const requestTime = Date.now();

      const response = await sendMessage(sessionId, question, TEST_ACCOUNT_ID, TEST_API_SECRET_TOKEN);

      const responseTime = Date.now() - requestTime;

      const endpointsAndNames = extractEndpoints(response.toolCalls, TEST_ACCOUNT_ID);

      // Determine type (for now, we'll extract it from the first endpoint's method)
      const type = endpointsAndNames.length > 0
        ? endpointsAndNames[0][1].split(';')[0]
        : 'UNKNOWN';

      results.push({
        uid,
        type,
        question,
        endpointsAndNames
      });

      console.log(`  📥 [${questionNumber}] Response received (${responseTime}ms): ${
        endpointsAndNames.length} endpoint${endpointsAndNames.length !== 1 ? 's' : ''} - ${
        endpointsAndNames.map(([n, e]) => {
          return `${n}: ${e}`
        }).join(', ')
      }`);

      // Delay between requests in the same batch
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    } catch (error) {
      console.error(`  ❌ [${questionNumber}] Error (${uid}): ${error.message}`);
      results.push({
        uid,
        type: 'ERROR',
        endpointsAndNames: []
      });
    }
  }

  return results;
}

/**
 * Save results to JSON file
 * @param {Array} results
 * @param {string} timestamp
 */
function saveResultsJSON(results, timestamp) {
  const outputPath = path.join(OUTPUT_DIR, `${timestamp}_result.json`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n💾 Saved JSON results to: ${outputPath}`);
}

/**
 * Save submission CSV file
 * Format: uid;type;request
 * Takes only the first endpoint from each result
 * @param {Array} results
 * @param {string} timestamp
 */
function saveSubmissionCSV(results, timestamp) {
  const csvRecords = results.map(item => {
    // Take first endpoint or empty string
    const firstEndpoint = item.endpointsAndNames?.length
      ? item.endpointsAndNames[0][1]
      : ';';

    // Split into method and path
    const [method, requestPath] = firstEndpoint.split(';');

    return {
      uid: item.uid,
      type: method || item.type,
      request: requestPath || ''
    };
  });

  const csvContent = stringify(csvRecords, {
    header: true,
    columns: ['uid', 'type', 'request'],
    delimiter: ';'
  });

  const outputPath = path.join(OUTPUT_DIR, `${timestamp}_submission.csv`);
  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  console.log(`💾 Saved CSV submission to: ${outputPath}`);
}

/**
 * Main test function
 */
async function runTest() {
  console.log('🧪 Starting demo-agent test...\n');

  // Log credentials
  console.log('🔐 Credentials:');
  console.log(`   TEST_ACCOUNT_ID: ${TEST_ACCOUNT_ID ? '***' + TEST_ACCOUNT_ID.slice(-4) : 'NOT SET'}`);
  console.log(`   TEST_API_SECRET_TOKEN: ${TEST_API_SECRET_TOKEN ? '***' + TEST_API_SECRET_TOKEN.slice(-4) : 'NOT SET'}`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load questions from CSV
  const questions = loadQuestions();

  if (questions.length === 0) {
    console.error('❌ No questions found in CSV file');
    process.exit(1);
  }

  // Create session
  console.log('\n🔑 Creating session...');
  const session = await createSession('test-user');
  console.log(`✅ Session created: ${session.sessionId}`);

  // Process questions in batches
  const allResults = [];
  const batches = [];

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    batches.push(questions.slice(i, i + BATCH_SIZE));
  }

  console.log(`\n📊 Processing ${questions.length} questions in ${batches.length} batch${batches.length !== 1 ? 'es' : ''}...`);

  for (let i = 0; i < batches.length; i++) {
    const startIndex = i * BATCH_SIZE;
    const batchResults = await processBatch(batches[i], session.sessionId, i, startIndex);
    allResults.push(...batchResults);

    // Delay between batches
    if (i < batches.length - 1) {
      console.log(`\n⏳ Waiting ${BATCH_DELAY_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // Generate timestamp for filenames
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];

  // Save results
  saveResultsJSON(allResults, timestamp);
  saveSubmissionCSV(allResults, timestamp);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total questions: ${questions.length}`);
  console.log(`Successful: ${allResults.filter(r => r.endpoints.length > 0).length}`);
  console.log(`Failed: ${allResults.filter(r => r.endpoints.length === 0).length}`);
  console.log('='.repeat(60));
  console.log('\n✅ Test completed successfully!');
}

// Run the test
runTest().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
