import Anthropic from '@anthropic-ai/sdk';
import { Session } from './Session.js';
import { MCPConnector } from './MCPConnector.js';
import { TagProcessor } from './services/tag-processor.js';
import type { AgentResponse, StreamChunk, Tool, ToolCall } from '../types/index.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    // winston.format.timestamp(),
    // winston.format.json(),
    // Единый человекочитаемый формат без поля timestamp в JSON
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: [
    new winston.transports.Console({
      // format: winston.format.simple(),
      // Транспорт берёт формат из корневого логгера
    }),
  ],
});
export class AgentManager {
  private anthropic: Anthropic;
  private mcpConnector: MCPConnector;
  private tagProcessor: TagProcessor;
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
    this.tagProcessor = new TagProcessor();
    this.sessions = new Map();
    this.tools = [];
    this.maxTurns = parseInt(process.env.AGENT_MAX_TURNS || '10');
    this.timeout = parseInt(process.env.AGENT_TIMEOUT || '30000');
    this.model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';

    this.systemPrompt = `Вы - AI-ассистент для биржевой торговли через FINAM Trade API.

Для визуализации данных используйте специальные теги в тексте ответа:

**Графики:**
- <chart type="portfolio-sunburst"/> - структура портфеля (Sunburst диаграмма)
- <chart type="equity-curve"/> - кривая капитала
- <chart type="equity-curve-benchmark"/> - кривая капитала с бенчмарком IMOEX
- <chart type="trades-chart" symbol="SBER@MISX"/> - график сделок по инструменту

**Таблицы:**
- <table type="positions"/> - таблица позиций портфеля
- <table type="trades"/> - таблица сделок
- <table type="scanner" criteria="..."/> - результаты сканирования рынка

**Блоки:**
- <rebalance target="equal"/> - симулятор ребалансировки (equal/custom)

Пример использования:
"Ваш портфель содержит 7 позиций общей стоимостью 150,000 ₽:

<table type="positions"/>

Структура распределения активов:

<chart type="portfolio-sunburst"/>

Динамика за последние 3 месяца:

<chart type="equity-curve-benchmark"/>"

При работе:
1. Используйте инструменты для получения актуальных данных
2. Вставляйте теги визуализации в текст естественным образом
3. Объясняйте данные человеческим языком, графики - для наглядности
4. Перед критическими операциями запрашивайте подтверждение

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
   * Process text with tags
   */
  private async processTagsInText(text: string, toolCalls: ToolCall[]): Promise<string> {
    try {
      return await this.tagProcessor.processText(text, toolCalls);
    } catch (error) {
      logger.error('Error processing tags:', error);
      return text;
    }
  }

  /**
   * Process user message with agent loop
   */
  async processMessage (sessionId: string, message: string, accountId?: string, secretKey?: string): Promise<AgentResponse> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Set MCP credentials if provided
    if (accountId || secretKey) {
      await this.mcpConnector.setCredentials(secretKey, accountId);
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

      logger.info(`🤖 Calling LLM (${this.model})...`);
      const startTime = Date.now();

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: this.systemPrompt,
        messages,
        tools: claudeTools,
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ LLM response received (${duration}ms, ${response.usage?.input_tokens || 0} input tokens, ${response.usage?.output_tokens || 0} output tokens, stop_reason: ${response.stop_reason})`);

      // Check stop reason
      if (response.stop_reason === 'end_turn') {
        // Extract text response
        let textContent = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        // Process tags if we have tool calls
        if (toolCallsInSession.length > 0) {
          textContent = await this.processTagsInText(textContent, toolCallsInSession);
        }

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
  async* processMessageStream (sessionId: string, message: string, accountId?: string, secretKey?: string): AsyncGenerator<StreamChunk> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Set MCP credentials if provided
    if (accountId || secretKey) {
      await this.mcpConnector.setCredentials(secretKey, accountId);
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
    const toolCallsInSession: ToolCall[] = [];

    while (continueLoop && turn < this.maxTurns) {
      turn++;
      logger.info(`🤖 Calling LLM stream (${this.model}, turn ${turn})...`);

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
      logger.info(`✅ LLM stream completed (${finalMessage.usage?.input_tokens || 0} input tokens, ${finalMessage.usage?.output_tokens || 0} output tokens, stop_reason: ${finalMessage.stop_reason})`);

      if (finalMessage.stop_reason === 'end_turn') {
        continueLoop = false;

        // Process tags if we have tool calls
        let finalContent = currentText;
        if (toolCallsInSession.length > 0 && currentText) {
          const processedText = await this.processTagsInText(currentText, toolCallsInSession);

          // If text changed (tags were processed), send update
          if (processedText !== currentText) {
            finalContent = processedText;

            // Send clear marker + processed text
            yield {
              type: 'text',
              content: '\x00CLEAR\x00' + processedText,
            };
          }
        }

        if (finalContent) {
          session.addMessage('assistant', finalContent);
        }

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
          toolCallsInSession.push(toolCall);
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
