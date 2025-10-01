#!/usr/bin/env node
/**
 * Direct Instrument Search Tester
 *
 * Tests the InstrumentSearch service directly without HTTP transport
 * Initializes search engine and runs tests by calling search() directly
 */

import chalk from 'chalk';
import { getInstrumentSearch } from '../../dist/src/services/instrument-search.js';
import { getOutputDir, saveResult, TEST_SEARCHES } from './test-cases.js';

export const OUTPUT_DIR = getOutputDir('direct');

/**
 * Initialize instrument search
 */
async function initializeSearch () {
  console.log(chalk.cyan('🔍 Initializing instrument search...'));

  const instrumentSearch = getInstrumentSearch();

  // Set transport to 'http' to enable vector search
  instrumentSearch.setTransport('http');

  // Initialize search engine
  await instrumentSearch.initialize();

  return instrumentSearch;
}

/**
 * Run all search tests
 */
async function runTests (instrumentSearch) {
  console.log(chalk.cyan('\n📋 Running search tests...\n'));

  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_SEARCHES) {
    try {
      console.log(chalk.blue(`Testing: ${testCase.description} (${testCase.query})`));

      // Call search directly
      const results = await instrumentSearch.search(testCase.query);

      if (Array.isArray(results)) {
        console.log(chalk.green(`  ✓ Found ${results.length} results`));

        saveResult(testCase, results, true, OUTPUT_DIR);
        passed++;
      } else {
        console.log(chalk.red(`  ❌ Invalid result format`));
        saveResult(testCase, { error: 'Invalid result format', results }, false, OUTPUT_DIR);
        failed++;
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ Exception: ${error.message}`));
      saveResult(testCase, { error: error.message, stack: error.stack }, false, OUTPUT_DIR);
      failed++;
    }
  }

  return { passed, failed };
}

/**
 * Main test runner
 */
async function main () {
  console.log(chalk.bold.cyan('🧪 Direct Instrument Search Test\n'));

  try {
    // Initialize search
    const instrumentSearch = await initializeSearch();

    // Run tests
    const { passed, failed } = await runTests(instrumentSearch);

    // Print summary
    console.log(chalk.bold.cyan('\n📊 Test Summary:'));
    console.log(chalk.green(`  ✅  Passed: ${passed}`));
    if (failed) {
      console.log(chalk.red(`  ❌  Failed: ${failed}`));
    }
    console.log(chalk.gray(`  📁 Results saved to: ${OUTPUT_DIR}`));

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(chalk.red('\n❌ Fatal error:'), error);
    process.exit(1);
  }
}

// Run tests
main();
