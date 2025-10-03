import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool } from '../types/index.js';

export class MCPConnector {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  /**
   * Connect to MCP server using stdio transport
   * @param serverUrl - URL or command path for the MCP server
   */
  async connect(serverUrl: string): Promise<void> {
    // Parse stdio:// URL format
    const command = serverUrl.replace('stdio://', '');

    this.transport = new StdioClientTransport({
      command: 'node',
      args: [command]
    });

    this.client = new Client({
      name: 'finam-demo-agent',
      version: '1.0.0'
    });

    await this.client.connect(this.transport);
  }

  /**
   * Get list of available tools from MCP server
   */
  async listTools(): Promise<Tool[]> {
    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    const response = await this.client.listTools();

    return response.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
  }

  /**
   * Call a tool on the MCP server
   * @param name - Tool name
   * @param params - Tool parameters
   */
  async callTool(name: string, params: any): Promise<any> {
    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    const result = await this.client.callTool({
      name,
      arguments: params
    });

    return result;
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
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
