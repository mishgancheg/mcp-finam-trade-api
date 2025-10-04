import Anthropic from '@anthropic-ai/sdk';
import { Session } from './Session.js';
import { MCPConnector } from './MCPConnector.js';
import type { AgentResponse, StreamChunk, Tool, ToolCall } from '../types/index.js';
import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

export class AgentManager {
  private anthropic: Anthropic;
  private mcpConnector: MCPConnector;
  private sessions: Map<string, Session>;
  private tools: Tool[];
  private systemPrompt: string;
  private maxTurns: number;
  private timeout: number;
  private model: string;

  constructor () {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.anthropic = new Anthropic({ apiKey });
    this.mcpConnector = new MCPConnector();
    this.sessions = new Map();
    this.tools = [];
    this.maxTurns = parseInt(process.env.AGENT_MAX_TURNS || '10');
    this.timeout = parseInt(process.env.AGENT_TIMEOUT || '30000');
    this.model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';

    this.systemPrompt = `Вы - AI-ассистент для биржевой торговли через FINAM Trade API.

Доступные интенты (типы запросов):
- portfolio.view - текущий портфель (таблица позиций)
- portfolio.analyze - глубокий анализ с графиками (equity curve + бенчмарк, Sunburst)
- portfolio.rebalance - симуляция ребалансировки портфеля
- market.instrument_info - детальная информация об инструменте (графики, стакан)
- market.scan - поиск инструментов по критериям (таблица с sparklines)
- backtest.run - бэктест стратегии (equity curve с markers сделок, метрики)
- order.place - размещение заявки (ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ!)

Для запросов с визуализацией возвращайте RenderSpec JSON:
{
  "intent": "portfolio.analyze",
  "renderSpec": {
    "blocks": [
      { "type": "summary", "bullets": [...] },
      { "type": "chart", "engine": "echarts", "spec": {...} }
    ]
  }
}

Для критических операций (order.place) обязательно:
{
  "intent": "order.place",
  "params": {...},
  "requiresConfirm": true
}

При работе:
1. Всегда используйте доступные инструменты для получения актуальных данных
2. Перед размещением торговых заказов ОБЯЗАТЕЛЬНО запрашивайте подтверждение
3. Объясняйте свои действия понятным языком
4. Если информации недостаточно - задавайте уточняющие вопросы

Отвечайте на русском языке, четко и структурированно.`;
  }

  /**
   * Initialize agent and connect to MCP server
   */
  async initialize (mcpServerUrl: string): Promise<void> {
    await this.mcpConnector.connect(mcpServerUrl);
    this.tools = await this.mcpConnector.listTools();
    logger.info(`Connected to MCP server, loaded ${this.tools.length} tools`);
  }

  /**
   * Create a new session
   */
  createSession (userId: string): Session {
    const session = new Session(userId);
    this.sessions.set(session.id, session);
    logger.info(`Created session ${session.id} for user ${userId}`);
    return session;
  }

  /**
   * Get existing session
   */
  getSession (sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Delete session
   */
  deleteSession (sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      logger.info(`Deleted session ${sessionId}`);
    }
    return deleted;
  }

  /**
   * Process user message with agent loop
   */
  async processMessage (sessionId: string, message: string): Promise<AgentResponse> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.addMessage('user', message);

    // Build messages for Claude
    const messages: Anthropic.MessageParam[] = session.getHistory().map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Convert MCP tools to Claude tool format
    const claudeTools: Anthropic.Tool[] = this.tools.map(tool => ({
      name: tool.name,
      description: tool.description || '',
      input_schema: tool.inputSchema,
    }));

    let turn = 0;
    let continueLoop = true;
    const toolCallsInSession: ToolCall[] = [];

    while (continueLoop && turn < this.maxTurns) {
      turn++;
      logger.info(`Processing turn ${turn} for session ${sessionId}`);

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: this.systemPrompt,
        messages,
        tools: claudeTools,
      });

      // Check stop reason
      if (response.stop_reason === 'end_turn') {
        // Extract text response
        const textContent = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        session.addMessage('assistant', textContent);
        continueLoop = false;

        return {
          message: textContent,
          toolCalls: toolCallsInSession,
        };
      }

      if (response.stop_reason === 'tool_use') {
        // Process tool calls
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
        );

        // Execute all tool calls
        const toolResults: Anthropic.MessageParam[] = [];

        for (const toolUse of toolUseBlocks) {
          logger.info(`Calling tool ${toolUse.name} with params:`, toolUse.input);

          const toolCall: ToolCall = {
            name: toolUse.name,
            params: toolUse.input,
            timestamp: new Date(),
          };

          try {
            const result = await this.mcpConnector.callTool(toolUse.name, toolUse.input);
            toolCall.result = result;
            logger.info(`Tool ${toolUse.name} completed successfully`);

            // Add tool result to messages
            toolResults.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: JSON.stringify(result),
                },
              ],
            });
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`Tool ${toolUse.name} failed:`, errorMsg);

            toolCall.result = { error: errorMsg };

            toolResults.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: JSON.stringify({ error: errorMsg }),
                  is_error: true,
                },
              ],
            });
          }

          toolCallsInSession.push(toolCall);
          session.addToolCall(toolCall);
        }

        // Add assistant message with tool uses
        messages.push({
          role: 'assistant',
          content: response.content,
        });

        // Add tool results
        messages.push(...toolResults);
      }
    }

    // Max turns reached
    const finalMessage = 'Достигнут лимит итераций агента';
    session.addMessage('assistant', finalMessage);

    return {
      message: finalMessage,
      toolCalls: toolCallsInSession,
    };
  }

  /**
   * Process message with streaming
   */
  async* processMessageStream (sessionId: string, message: string): AsyncGenerator<StreamChunk> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.addMessage('user', message);

    const messages: Anthropic.MessageParam[] = session.getHistory().map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const claudeTools: Anthropic.Tool[] = this.tools.map(tool => ({
      name: tool.name,
      description: tool.description || '',
      input_schema: tool.inputSchema,
    }));

    let turn = 0;
    let continueLoop = true;

    while (continueLoop && turn < this.maxTurns) {
      turn++;

      const stream = await this.anthropic.messages.stream({
        model: this.model,
        max_tokens: 4096,
        system: this.systemPrompt,
        messages,
        tools: claudeTools,
      });

      let currentText = '';
      let toolUses: Anthropic.ToolUseBlock[] = [];

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            currentText += event.delta.text;
            yield {
              type: 'text',
              content: event.delta.text,
            };
          }
        }

        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            toolUses.push(event.content_block);
          }
        }
      }

      const finalMessage = await stream.finalMessage();

      if (finalMessage.stop_reason === 'end_turn') {
        if (currentText) {
          session.addMessage('assistant', currentText);
        }
        continueLoop = false;

        yield {
          type: 'done',
          content: '',
        };
        break;
      }

      if (finalMessage.stop_reason === 'tool_use') {
        const toolUseBlocks = finalMessage.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
        );

        const toolResults: Anthropic.MessageParam[] = [];

        for (const toolUse of toolUseBlocks) {
          const toolCall: ToolCall = {
            name: toolUse.name,
            params: toolUse.input,
            timestamp: new Date(),
          };

          yield {
            type: 'tool_call',
            content: toolCall,
          };

          try {
            const result = await this.mcpConnector.callTool(toolUse.name, toolUse.input);
            toolCall.result = result;

            toolResults.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: JSON.stringify(result),
                },
              ],
            });
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            toolCall.result = { error: errorMsg };

            toolResults.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: JSON.stringify({ error: errorMsg }),
                  is_error: true,
                },
              ],
            });
          }

          session.addToolCall(toolCall);
        }

        messages.push({
          role: 'assistant',
          content: finalMessage.content,
        });

        messages.push(...toolResults);
      }
    }
  }

  /**
   * Disconnect from MCP server
   */
  async shutdown (): Promise<void> {
    await this.mcpConnector.disconnect();
    logger.info('Agent manager shut down');
  }
}
