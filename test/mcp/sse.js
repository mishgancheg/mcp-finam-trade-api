#!/usr/bin/env node
/**
 * MCP SSE Transport Tester
 *
 * Tests the MCP server using SSE (Server-Sent Events) transport
 * Calls all MCP tools and resources, saving results to _test-data/mcp/sse/
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import EventSource from 'eventsource';
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

// Load environment variables
dotenv.config();

const TRANSPORT_NAME = 'sse';
const SSE_ENDPOINT = `${testConfig.baseUrl}/sse`;
const MESSAGE_ENDPOINT = `${testConfig.baseUrl}/message`;

/**
 * SSE Client for MCP communication
 */
class McpSseClient {
  constructor() {
    this.eventSource = null;
    this.pendingRequests = new Map();
    this.requestIdCounter = 0;
  }

  /**
   * Connect to SSE endpoint
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.eventSource = new EventSource(SSE_ENDPOINT, {
        headers: {
          'Authorization': `Bearer ${testConfig.secretToken}`,
          'X-Finam-Account-Id': testConfig.accountId,
        },
      });

      this.eventSource.onopen = () => {
        console.log('✅ SSE connection established\n');
        resolve();
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        reject(error);
      };

      this.eventSource.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          this.handleResponse(response);
        } catch (error) {
          console.error('❌ Error parsing SSE message:', error);
        }
      };

      // Timeout if connection doesn't establish
      setTimeout(() => {
        if (this.eventSource.readyState !== EventSource.OPEN) {
          reject(new Error('SSE connection timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Handle response from server
   */
  handleResponse(response) {
    const requestId = response.id;
    const pending = this.pendingRequests.get(requestId);

    if (pending) {
      if (response.error) {
        pending.reject(new Error(response.error.message || JSON.stringify(response.error)));
      } else {
        pending.resolve(response);
      }
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Send MCP request
   */
  async sendRequest(method, params) {
    const requestId = `req-${++this.requestIdCounter}`;

    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    };

    return new Promise(async (resolve, reject) => {
      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject });

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      try {
        // Send request via POST to /message
        const response = await fetch(MESSAGE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testConfig.secretToken}`,
            'X-Finam-Account-Id': testConfig.accountId,
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          reject(new Error(`HTTP ${response.status}: ${await response.text()}`));
        }
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * List all tools
   */
  async listTools() {
    const response = await this.sendRequest('tools/list', {});
    return {
      request: { method: 'tools/list', params: {} },
      response,
      tools: response.result?.tools || []
    };
  }

  /**
   * Call a tool
   */
  async callTool(toolName, args) {
    return await this.sendRequest('tools/call', {
      name: toolName,
      arguments: {
        ...args,
        ...(args.account_id === undefined && { account_id: testConfig.accountId }),
      },
    });
  }

  /**
   * List all resources
   */
  async listResources() {
    const response = await this.sendRequest('resources/list', {});
    return {
      request: { method: 'resources/list', params: {} },
      response,
      resources: response.result?.resources || []
    };
  }

  /**
   * List all prompts
   */
  async listPrompts() {
    try {
      const response = await this.sendRequest('prompts/list', {});
      return {
        request: { method: 'prompts/list', params: {} },
        response,
        prompts: response.result?.prompts || []
      };
    } catch (error) {
      return {
        request: { method: 'prompts/list', params: {} },
        response: { error: error.message },
        prompts: []
      };
    }
  }

  /**
   * Read a resource
   */
  async readResource(uri) {
    return await this.sendRequest('resources/read', { uri });
  }

  /**
   * Close connection
   */
  close() {
    if (this.eventSource) {
      this.eventSource.close();
      console.log('\n✅ SSE connection closed');
    }
  }
}

/**
 * Test all tools
 */
async function testTools(client, outputDir) {
  console.log('\n📋 Testing Tools...\n');

  let successCount = 0;
  let errorCount = 0;

  // Get all tools and save listing
  const toolsListing = await client.listTools();
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

      const response = await client.callTool(name, args);

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
async function testResources(client, outputDir) {
  console.log('\n📚 Testing Resources...\n');

  let successCount = 0;
  let errorCount = 0;

  // Get all resources and save listing
  const resourcesListing = await client.listResources();
  saveListingResult(outputDir, 'resources', resourcesListing.request, resourcesListing.response);
  console.log(`Found ${resourcesListing.resources.length} resources\n`);

  for (const uri of commonResources) {
    try {
      console.log(`📖 Testing resource: ${uri}`);

      const request = { uri };
      const response = await client.readResource(uri);

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
async function testPrompts(client, outputDir) {
  console.log('\n💬 Testing Prompts...\n');

  try {
    // Get all prompts and save listing
    const promptsListing = await client.listPrompts();
    saveListingResult(outputDir, 'prompts', promptsListing.request, promptsListing.response);

    if (promptsListing.prompts.length > 0) {
      console.log(`Found ${promptsListing.prompts.length} prompts\n`);
      return { successCount: 1, errorCount: 0 };
    } else {
      console.log('No prompts available (or not supported by server)\n');
      return { successCount: 0, errorCount: 0 };
    }
  } catch (error) {
    console.log('Prompts not supported by this MCP server\n');
    return { successCount: 0, errorCount: 0 };
  }
}

/**
 * Main test function
 */
async function runTests() {
  logTestStart(TRANSPORT_NAME);

  // Ensure output directory exists
  const outputDir = ensureOutputDir(TRANSPORT_NAME);
  console.log(`📁 Output directory: ${outputDir}\n`);

  // Check server is running
  try {
    const healthCheck = await fetch(`${testConfig.baseUrl}/health`);
    if (!healthCheck.ok) {
      throw new Error('MCP server is not responding');
    }
    console.log('✅ MCP server is running\n');
  } catch (error) {
    console.error('❌ Cannot connect to MCP server. Please start it with: npm run mcp:http');
    process.exit(1);
  }

  // Create SSE client
  const client = new McpSseClient();

  try {
    // Connect to SSE endpoint
    await client.connect();

    let totalSuccess = 0;
    let totalErrors = 0;

    // Test tools
    const toolResults = await testTools(client, outputDir);
    totalSuccess += toolResults.successCount;
    totalErrors += toolResults.errorCount;

    // Test resources
    const resourceResults = await testResources(client, outputDir);
    totalSuccess += resourceResults.successCount;
    totalErrors += resourceResults.errorCount;

    // Test prompts
    const promptResults = await testPrompts(client, outputDir);
    totalSuccess += promptResults.successCount;
    totalErrors += promptResults.errorCount;

    // Log summary
    logTestSummary(TRANSPORT_NAME, totalSuccess, totalErrors);

    // Close connection
    client.close();

    process.exit(totalErrors > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    client.close();
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
