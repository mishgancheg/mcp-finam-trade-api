#!/usr/bin/env node
// noinspection UnnecessaryLocalVariableJS

/**
 * Instrument Search STDIO Transport Tester
 *
 * Tests the SearchInstruments MCP tool via STDIO transport
 * Uses exact search only (no vector database initialization)
 */


// noinspection ES6UnusedImports
import { getOutputDir, saveResult, TEST_SEARCHES } from './test-cases.js';
import { spawn } from 'child_process';
import chalk from 'chalk';

export const OUTPUT_DIR = getOutputDir('stdio');

/**
 * Send MCP request via STDIO
 */
function sendMcpRequest(mcpProcess, request) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 10000);

    const dataHandler = (data) => {
      const responseData = data.toString();
      console.log(chalk.bgGrey(responseData));
      // Try to parse complete JSON-RPC response
      try {
        const lines = responseData.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            const response = JSON.parse(line);
            clearTimeout(timeout);
            mcpProcess.stdout.off('data', dataHandler);
            mcpProcess.stderr.off('data', errorHandler);
            resolve(response);
            return;
          }
        }
      } catch {
        // Continue collecting data
      }
    };

    const errorHandler = (data) => {
      const errData = data.toString();
      console.log(chalk.bgRedBright(errData));
      // Errors go to stderr, we just collect them
    };

    mcpProcess.stdout.on('data', dataHandler);
    mcpProcess.stderr.on('data', errorHandler);

    // Send request
    mcpProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}

/**
 * Start MCP server process
 */
function startMcpServer() {
  const mcpProcess = spawn('node', ['dist/src/mcp/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      RETURN_AS: 'json',
    },
  });

  // Let initialization messages pass
  setTimeout(() => {}, 1000);

  return mcpProcess;
}

/**
 * Search for instruments
 */
async function searchInstruments(mcpProcess, query) {
  const request = {
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 1000000),
    method: 'tools/call',
    params: {
      name: 'SearchInstruments',
      arguments: { query },
    },
  };

  const res = await sendMcpRequest(mcpProcess, request);
  return res;
}

/**
 * Run all search tests
 */
async function runTests(mcpProcess) {
  console.log('\n📋 Running search tests (STDIO - exact match only)...\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_SEARCHES) {
    try {
      console.log(`🔍 Testing: ${testCase.description} (${testCase.query})`);
      const result = await searchInstruments(mcpProcess, testCase.query);

      if (result.error) {
        console.log(`  ❌ Error: ${result.error.message}`);
        saveResult(testCase, result, false, OUTPUT_DIR);
        failed++;
      } else {
        const instruments = JSON.parse(result.result.content[0].text);
        console.log(`  ✅ Found ${instruments.length} results`);
        saveResult(testCase, result, true, OUTPUT_DIR);
        passed++;
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.log(`  ❌ Exception: ${error.message}`);
      saveResult(testCase, { error: error.message }, false, OUTPUT_DIR);
      failed++;
    }
  }

  console.log(`\n📊 Test Summary:`);
  console.log(`  ✅ Passed: ${passed}`);
  if (failed) {
    console.log(`  ❌ Failed: ${failed}`);
  }
  console.log(`  📁 Results saved to: ${OUTPUT_DIR}`);

  return { passed, failed };
}

/**
 * Main test runner
 */
async function main() {
  console.log('🧪 Instrument Search STDIO Transport Test\n');

  // Start MCP server
  console.log('🚀 Starting MCP server (STDIO)...');
  const mcpProcess = startMcpServer();

  // Wait for server to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Run tests
    const { failed } = await runTests(mcpProcess);

    // Shutdown
    console.log('\n🛑 Shutting down MCP server...');
    mcpProcess.kill();

    // Exit with appropriate code
    if (failed === 0) {
      console.log('\n✅ All tests passed');
      process.exit(0);
    } else {
      console.log(`\n⚠️  Some tests failed (${failed})`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test error:', error);
    mcpProcess.kill();
    process.exit(1);
  }
}

main();
