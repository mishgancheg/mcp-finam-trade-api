export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ToolCall {
  name: string;
  params: any;
  result?: any;
  endpoints?: string[]; // API endpoints called by this tool (from SHOW_MCP_ENDPOINTS)
  timestamp: Date;
}

export interface SessionData {
  id: string;
  userId: string;
  messages: Message[];
  toolCalls: ToolCall[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentResponse {
  message: string;
  toolCalls: ToolCall[];
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'done';
  content: string | ToolCall;
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema: any;
}

// Re-export RenderSpec types
export * from './renderspec.js';
