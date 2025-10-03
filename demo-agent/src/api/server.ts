import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import winston from 'winston';
import { AgentManager } from '../agent/AgentManager.js';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const port = parseInt(process.env.WEB_API_PORT || '3002');
const host = process.env.WEB_API_HOST || 'localhost';

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Initialize agent manager
let agentManager: AgentManager | null = null;

async function initializeAgent() {
  try {
    const mcpServerUrl = process.env.MCP_SERVER_URL;
    if (!mcpServerUrl) {
      throw new Error('MCP_SERVER_URL environment variable is required');
    }

    agentManager = new AgentManager();
    await agentManager.initialize(mcpServerUrl);
    logger.info('Agent manager initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize agent manager:', error);
    process.exit(1);
  }
}

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    agentReady: agentManager !== null
  });
});

// Create new session
app.post('/api/sessions', (req: Request, res: Response) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent not ready' });
  }

  try {
    const userId = req.body.userId || 'anonymous';
    const session = agentManager.createSession(userId);

    res.json({
      sessionId: session.id,
      userId: session.userId,
      createdAt: session.createdAt
    });
  } catch (error) {
    logger.error('Error creating session:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get session history
app.get('/api/sessions/:sessionId/history', (req: Request, res: Response) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent not ready' });
  }

  try {
    const { sessionId } = req.params;
    const session = agentManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.id,
      messages: session.getHistory(),
      toolCalls: session.getToolCallHistory()
    });
  } catch (error) {
    logger.error('Error getting session history:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete session
app.delete('/api/sessions/:sessionId', (req: Request, res: Response) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent not ready' });
  }

  try {
    const { sessionId } = req.params;
    const deleted = agentManager.deleteSession(sessionId);

    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting session:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send message (non-streaming)
app.post('/api/chat', async (req: Request, res: Response) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent not ready' });
  }

  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    const session = agentManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const response = await agentManager.processMessage(sessionId, message);

    res.json({
      sessionId,
      message: response.message,
      toolCalls: response.toolCalls,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error processing message:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send message (streaming via Server-Sent Events)
app.get('/api/chat/stream', async (req: Request, res: Response) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent not ready' });
  }

  try {
    const sessionId = req.query.sessionId as string;
    const message = req.query.message as string;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    const session = agentManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connection event
    res.write('data: {"type":"connected"}\n\n');

    // Process message with streaming
    for await (const chunk of agentManager.processMessageStream(sessionId, message)) {
      const data = JSON.stringify(chunk);
      res.write(`data: ${data}\n\n`);

      if (chunk.type === 'done') {
        break;
      }
    }

    res.end();
  } catch (error) {
    logger.error('Error processing streaming message:', error);
    const errorData = JSON.stringify({
      type: 'error',
      content: error instanceof Error ? error.message : 'Unknown error'
    });
    res.write(`data: ${errorData}\n\n`);
    res.end();
  }
});

// Get available tools
app.get('/api/tools', (req: Request, res: Response) => {
  if (!agentManager) {
    return res.status(503).json({ error: 'Agent not ready' });
  }

  // Access tools through a public method (we'll need to add this)
  res.json({
    message: 'Tools are loaded in agent manager',
    note: 'Tool list available after agent initialization'
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
async function start() {
  await initializeAgent();

  app.listen(port, host, () => {
    logger.info(`API server running at http://${host}:${port}`);
  });
}

// Handle shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  if (agentManager) {
    await agentManager.shutdown();
  }
  process.exit(0);
});

start().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
