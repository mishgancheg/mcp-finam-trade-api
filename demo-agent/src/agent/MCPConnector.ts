import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { Tool } from '../types/index.js';

export class MCPConnector {
  private client: Client | null = null;
  private transport: StdioClientTransport | SSEClientTransport | null = null;

  /**
   * Connect to MCP server using stdio or HTTP(SSE) transport
   * @param serverUrl - URL or command path for the MCP server
   */
  async connect (serverUrl: string): Promise<void> {
    // Trim and validate serverUrl
    serverUrl = serverUrl.trim();

    // If HTTP(S) URL provided, use SSE transport
    if (/^https?:\/\//i.test(serverUrl)) {
      // Allow URLs like http://host:port, http://host:port/mcp or /mcp/v1
      const url = new URL(serverUrl);
      const baseOrigin = `${url.protocol}//${url.host}`;
      // If path already points to /sse, use as-is; otherwise, connect to /sse on same origin
      const sseUrl = new URL(url.pathname === '/sse' ? url.href : `${baseOrigin}/sse`);

      this.transport = new SSEClientTransport(sseUrl);

      this.client = new Client({
        name: 'finam-demo-agent',
        version: '1.0.0',
      });

      await this.client.connect(this.transport);
      return;
    }

    // Default: stdio transport (stdio://path/to/server)
    const command = serverUrl.replace('stdio://', '');

    // Pass environment variables to MCP server subprocess
    const env = {
      ...process.env,
      // Pass SHOW_MCP_ENDPOINTS from demo-agent env to MCP server
      SHOW_MCP_ENDPOINTS: process.env.SHOW_MCP_ENDPOINTS || 'false'
    };

    this.transport = new StdioClientTransport({
      command: 'node',
      args: [command],
      env
    });

    this.client = new Client({
      name: 'finam-demo-agent',
      version: '1.0.0',
    });

    await this.client.connect(this.transport);
  }

  /**
   * Get list of available tools from MCP server
   */
  async listTools (): Promise<Tool[]> {
    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    const response = await this.client.listTools();

    return response.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Call a tool on the MCP server
   * @param name - Tool name
   * @param params - Tool parameters
   */
  async callTool (name: string, params: any): Promise<any> {
    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    const result = await this.client.callTool({
      name,
      arguments: params,
    });

    return result;
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect (): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }

    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }
}
