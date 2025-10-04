import type { Message, ToolCall, SessionData } from '../types/index.js';

export class Session {
  public id: string;
  public userId: string;
  public messages: Message[];
  public toolCalls: ToolCall[];
  public createdAt: Date;
  public updatedAt: Date;

  constructor (userId: string, sessionId?: string) {
    this.id = sessionId || this.generateSessionId();
    this.userId = userId;
    this.messages = [];
    this.toolCalls = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Add a message to the session
   */
  addMessage (role: 'user' | 'assistant', content: string): void {
    this.messages.push({
      role,
      content,
      timestamp: new Date(),
    });
    this.updatedAt = new Date();
  }

  /**
   * Add a tool call to the session
   */
  addToolCall (toolCall: ToolCall): void {
    this.toolCalls.push(toolCall);
    this.updatedAt = new Date();
  }

  /**
   * Get conversation history
   */
  getHistory (): Message[] {
    return [...this.messages];
  }

  /**
   * Get tool call history
   */
  getToolCallHistory (): ToolCall[] {
    return [...this.toolCalls];
  }

  /**
   * Clear session history
   */
  clear (): void {
    this.messages = [];
    this.toolCalls = [];
    this.updatedAt = new Date();
  }

  /**
   * Export session data
   */
  toJSON (): SessionData {
    return {
      id: this.id,
      userId: this.userId,
      messages: this.messages,
      toolCalls: this.toolCalls,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId (): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Restore session from data
   */
  static fromJSON (data: SessionData): Session {
    const session = new Session(data.userId, data.id);
    session.messages = data.messages;
    session.toolCalls = data.toolCalls;
    session.createdAt = new Date(data.createdAt);
    session.updatedAt = new Date(data.updatedAt);
    return session;
  }
}
