#!/usr/bin/env node
/**
 * MCP HTTP (Streamable HTTP) Transport Tester
 *
 * Tests the MCP server using Streamable HTTP transport (POST /mcp/v1)
 * Calls all MCP tools and resources, saving results to _test-data/mcp/http/
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import {
  ensureOutputDir,
  saveTestResult,
  saveErrorResult,
  saveListingResult,
  testConfig,
  getAllTestCases,
  commonResources,
  logTestStart,
  logTestSummary,
} from './test-utils.js';

const { baseUrl, accountId } = testConfig;

// Load environment variables
dotenv.config();

const TRANSPORT_NAME = 'http';
const MCP_ENDPOINT = `${baseUrl}/mcp/v1`;

/**
 * Send MCP request via Streamable HTTP
 * @param {object} request - MCP request object
 * @returns {Promise<object>} Response data
 */
async function sendMcpRequest (request) {
  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${testConfig.secretToken}`,
      'X-Finam-Account-Id': accountId,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return await response.json();
}

/**
 * List all available tools
 * @returns {Promise<object>} Response with tools
 */
async function listTools () {
  const request = {
    jsonrpc: '2.0',
    id: 'list-tools',
    method: 'tools/list',
    params: {},
  };

  const response = await sendMcpRequest(request);
  return { request, response, tools: response.result?.tools || [] };
}

/**
 * Call a tool
 * @param {string} toolName - Tool name
 * @param {object} args - Tool arguments
 * @returns {Promise<object>} Tool response
 */
async function callTool (toolName, args) {
  const request = {
    jsonrpc: '2.0',
    id: `tool-${toolName}`,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: {
        ...args,
        // Add account_id if not present
        ...(args.account_id === undefined && { account_id: accountId }),
      },
    },
  };

  return await sendMcpRequest(request);
}

/**
 * List all available resources
 * @returns {Promise<object>} Response with resources
 */
async function listResources () {
  const request = {
    jsonrpc: '2.0',
    id: 'list-resources',
    method: 'resources/list',
    params: {},
  };

  const response = await sendMcpRequest(request);
  return { request, response, resources: response.result?.resources || [] };
}

/**
 * List all available prompts
 * @returns {Promise<object>} Response with prompts
 */
async function listPrompts () {
  const request = {
    jsonrpc: '2.0',
    id: 'list-prompts',
    method: 'prompts/list',
    params: {},
  };

  try {
    const response = await sendMcpRequest(request);
    return { request, response, prompts: response.result?.prompts || [] };
  } catch (error) {
    // Prompts not supported, return empty
    return { request, response: { error: error.message }, prompts: [] };
  }
}

/**
 * Read a resource
 * @param {string} uri - Resource URI
 * @returns {Promise<object>} Resource response
 */
async function readResource (uri) {
  const request = {
    jsonrpc: '2.0',
    id: `resource-${uri}`,
    method: 'resources/read',
    params: {
      uri,
    },
  };

  return await sendMcpRequest(request);
}

/**
 * Test all tools
 */
async function testTools (outputDir) {
  console.log('\n📋 Testing Tools...\n');

  let successCount = 0;
  let errorCount = 0;

  // Get all tools and save listing
  const toolsListing = await listTools();
  saveListingResult(outputDir, 'tools', toolsListing.request, toolsListing.response);
  console.log(`Found ${toolsListing.tools.length} tools\n`);

  const testCases = getAllTestCases();

  for (const testCase of testCases) {
    const { name, args } = testCase;

    try {
      console.log(`🔧 Testing tool: ${name}`);

      const request = {
        name,
        arguments: args,
      };

      const response = await callTool(name, args);

      saveTestResult(outputDir, 'tool', name, request, response);
      successCount++;
    } catch (error) {
      console.error(`❌ Error testing ${name}:`, error.message);
      saveErrorResult(outputDir, 'tool', name, { name, arguments: args }, error);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

/**
 * Test all resources
 */
async function testResources (outputDir) {
  console.log('\n📚 Testing Resources...\n');

  let successCount = 0;
  let errorCount = 0;

  // Get all resources and save listing
  const resourcesListing = await listResources();
  saveListingResult(outputDir, 'resources', resourcesListing.request, resourcesListing.response);
  console.log(`Found ${resourcesListing.resources.length} resources\n`);

  for (const uri of commonResources) {
    try {
      console.log(`📖 Testing resource: ${uri}`);

      const request = { uri };
      const response = await readResource(uri);

      const resourceName = uri.replace(/[:\/]/g, '_');
      saveTestResult(outputDir, 'resource', resourceName, request, response);
      successCount++;
    } catch (error) {
      console.error(`❌ Error testing ${uri}:`, error.message);
      const resourceName = uri.replace(/[:\/]/g, '_');
      saveErrorResult(outputDir, 'resource', resourceName, { uri }, error);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

/**
 * Test prompts listing
 */
async function testPrompts (outputDir) {
  console.log('\n💬 Testing Prompts...\n');

  try {
    // Get all prompts and save listing
    const promptsListing = await listPrompts();
    saveListingResult(outputDir, 'prompts', promptsListing.request, promptsListing.response);

    if (promptsListing.prompts.length > 0) {
      console.log(`Found ${promptsListing.prompts.length} prompts\n`);
      return { successCount: 1, errorCount: 0 };
    } else {
      console.log('No prompts available (or not supported by server)\n');
      return { successCount: 0, errorCount: 0 };
    }
  } catch {
    console.log('Prompts not supported by this MCP server\n');
    return { successCount: 0, errorCount: 0 };
  }
}

/**
 * Main test function
 */
async function runTests () {
  logTestStart(TRANSPORT_NAME);

  // Ensure output directory exists
  const outputDir = ensureOutputDir(TRANSPORT_NAME);
  console.log(`📁 Output directory: ${outputDir}\n`);

  // Check server is running
  try {
    const healthCheck = await fetch(`${baseUrl}/health`);
    if (!healthCheck.ok) {
      throw new Error('MCP server is not responding');
    }
    console.log('✅ MCP server is running\n');
  } catch {
    console.error('❌ Cannot connect to MCP server. Please start it with: npm run mcp:http');
    process.exit(1);
  }

  let totalSuccess = 0;
  let totalErrors = 0;

  // Test tools
  const toolResults = await testTools(outputDir);
  totalSuccess += toolResults.successCount;
  totalErrors += toolResults.errorCount;

  // Test resources
  const resourceResults = await testResources(outputDir);
  totalSuccess += resourceResults.successCount;
  totalErrors += resourceResults.errorCount;

  // Test prompts
  const promptResults = await testPrompts(outputDir);
  totalSuccess += promptResults.successCount;
  totalErrors += promptResults.errorCount;

  // Log summary
  logTestSummary(TRANSPORT_NAME, totalSuccess, totalErrors);

  process.exit(totalErrors > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
