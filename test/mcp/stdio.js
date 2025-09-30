#!/usr/bin/env node
/**
 * MCP STDIO Transport Tester
 *
 * Tests the MCP server using STDIO transport (standard input/output)
 * Calls all MCP tools and resources, saving results to _test-data/mcp/stdio/
 */

import dotenv from 'dotenv';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSPORT_NAME = 'stdio';

/**
 * STDIO Client for MCP communication
 */
class McpStdioClient {
  constructor () {
    this.process = null;
    this.pendingRequests = new Map();
    this.requestIdCounter = 0;
    this.buffer = '';
  }

  /**
   * Start MCP server process
   */
  async start () {
    return new Promise((resolve, reject) => {
      const mcpServerPath = path.join(__dirname, '..', '..', 'dist', 'src', 'mcp', 'index.js');

      // Spawn MCP server process
      this.process = spawn('node', [mcpServerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          API_SECRET_TOKEN: testConfig.secretToken,
          ACCOUNT_ID: testConfig.accountId,
          RETURN_AS: process.env.RETURN_AS || 'json',
        },
      });

      // Handle stdout (responses)
      this.process.stdout.on('data', (data) => {
        this.handleData(data);
      });

      // Handle stderr (logs)
      this.process.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          console.error(`[MCP Server] ${message}`);
        }
      });

      // Handle process errors
      this.process.on('error', (error) => {
        console.error('❌ Process error:', error);
        reject(error);
      });

      // Handle process exit
      this.process.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`❌ Process exited with code ${code}`);
        }
      });

      // Wait a bit for server to initialize
      setTimeout(() => {
        console.log('✅ STDIO connection established\n');
        resolve();
      }, 1000);
    });
  }

  /**
   * Handle incoming data from stdout
   */
  handleData (data) {
    this.buffer += data.toString();

    // Try to parse complete JSON messages
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          this.handleResponse(response);
        } catch {
          // Ignore non-JSON lines (like log messages)
        }
      }
    }
  }

  /**
   * Handle response from server
   */
  handleResponse (response) {
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
  async sendRequest (method, params) {
    const requestId = `req-${++this.requestIdCounter}`;

    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject });

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      // Clear timeout when request completes
      const originalResolve = resolve;
      const originalReject = reject;
      this.pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timeout);
          originalResolve(data);
        },
        reject: (error) => {
          clearTimeout(timeout);
          originalReject(error);
        },
      });

      // Send request via stdin
      try {
        this.process.stdin.write(JSON.stringify(request) + '\n');
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
  async listTools () {
    const response = await this.sendRequest('tools/list', {});
    return {
      request: { method: 'tools/list', params: {} },
      response,
      tools: response.result?.tools || [],
    };
  }

  /**
   * Call a tool
   */
  async callTool (toolName, args) {
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
  async listResources () {
    const response = await this.sendRequest('resources/list', {});
    return {
      request: { method: 'resources/list', params: {} },
      response,
      resources: response.result?.resources || [],
    };
  }

  /**
   * List all prompts
   */
  async listPrompts () {
    try {
      const response = await this.sendRequest('prompts/list', {});
      return {
        request: { method: 'prompts/list', params: {} },
        response,
        prompts: response.result?.prompts || [],
      };
    } catch (error) {
      return {
        request: { method: 'prompts/list', params: {} },
        response: { error: error.message },
        prompts: [],
      };
    }
  }

  /**
   * Read a resource
   */
  async readResource (uri) {
    return await this.sendRequest('resources/read', { uri });
  }

  /**
   * Stop the server process
   */
  stop () {
    if (this.process) {
      this.process.kill();
      console.log('\n✅ STDIO connection closed');
    }
  }
}

/**
 * Test all tools
 */
async function testTools (client, outputDir) {
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
async function testResources (client, outputDir) {
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
async function testPrompts (client, outputDir) {
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

  // Create STDIO client
  const client = new McpStdioClient();

  try {
    // Start MCP server process
    await client.start();

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

    // Stop server
    client.stop();

    process.exit(totalErrors > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    client.stop();
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
