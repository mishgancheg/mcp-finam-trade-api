Передача параметров через заголовки в MCP

```javascript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

// ==========================================
// Finam Trade API Client (пример)
// ==========================================
class FinamTradeClient {
  constructor(private accountId: string) {}

async getAccountInfo() {
  // Реальный API вызов к Finam
  return {
    accountId: this.accountId,
    balance: 100000,
    currency: "RUB",
  };
}

async getPositions() {
  return {
    accountId: this.accountId,
    positions: [
      { symbol: "SBER", quantity: 100, price: 250.5 },
    ],
  };
}

async placeOrder(symbol: string, quantity: number, price: number) {
  return {
    orderId: `ORD-${Date.now()}`,
    accountId: this.accountId,
    symbol,
    quantity,
    price,
    status: "placed",
  };
}
}

// ==========================================
// Создание MCP сервера с контекстом
// ==========================================
function createMCPServer(accountId: string) {
  const finamClient = new FinamTradeClient(accountId);

  const server = new Server(
    {
      name: "finam-trade-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Список инструментов
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_account_info",
          description: `Get account information for account ${accountId}`,
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_positions",
          description: `Get current positions for account ${accountId}`,
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "place_order",
          description: `Place an order for account ${accountId}`,
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "Stock symbol (e.g., SBER)",
              },
              quantity: {
                type: "number",
                description: "Number of shares",
              },
              price: {
                type: "number",
                description: "Price per share",
              },
            },
            required: ["symbol", "quantity", "price"],
          },
        },
      ],
    };
  });

  // Обработка вызовов инструментов
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_account_info": {
          const info = await finamClient.getAccountInfo();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(info, null, 2),
              },
            ],
          };
        }

        case "get_positions": {
          const positions = await finamClient.getPositions();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(positions, null, 2),
              },
            ],
          };
        }

        case "place_order": {
          const { symbol, quantity, price } = args as {
            symbol: string;
            quantity: number;
            price: number;
          };
          const order = await finamClient.placeOrder(symbol, quantity, price);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(order, null, 2),
              },
            ],
          };
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  return server;
}

// ==========================================
// STDIO Transport
// ==========================================
async function startStdioServer() {
  const accountId = process.env.FINAM_ACCOUNT_ID;

  if (!accountId) {
    console.error("Error: FINAM_ACCOUNT_ID environment variable is required");
    console.error("Example: FINAM_ACCOUNT_ID=12345678 node dist/index.js");
    process.exit(1);
  }

  console.error(`[STDIO] Starting with account ID: ${accountId}`);

  const server = createMCPServer(accountId);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("[STDIO] Server ready");
}

// ==========================================
// HTTP Server (SSE + Streamable HTTP)
// ==========================================
async function startHTTPServer() {
  const app = express();
  app.use(express.json());

  // ========================================
  // Middleware для проверки заголовка
  // ========================================
  const validateAccountId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const accountId = req.headers["x-finam-account-id"] as string;

    if (!accountId) {
      res.status(400).json({
        error: "X-Finam-Account-Id header is required",
        example: "curl -H 'X-Finam-Account-Id: 12345678' http://localhost:3000/sse"
      });
      return;
    }

    // Сохраняем accountId в req для дальнейшего использования
    (req as any).accountId = accountId;
    next();
  };

  // ========================================
  // SSE Transport
  // ========================================
  app.get("/sse", validateAccountId, async (req, res) => {
    const accountId = (req as any).accountId;
    const sessionId = `sse-${Date.now()}`;

    console.log(`[SSE] New connection - Session: ${sessionId}, Account: ${accountId}`);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const mcpServer = createMCPServer(accountId);
    const transport = new SSEServerTransport("/message", res);

    await mcpServer.connect(transport);

    req.on("close", () => {
      console.log(`[SSE] Connection closed - Session: ${sessionId}`);
    });
  });

  app.post("/message", async (req, res) => {
    console.log(`[SSE] Message received:`, req.body);
    res.status(202).end();
  });

  // ========================================
  // Streamable HTTP Transport
  // ========================================
  app.post("/mcp/v1", validateAccountId, async (req, res) => {
    const accountId = (req as any).accountId;
    const sessionId = `http-${Date.now()}`;

    console.log(`[Streamable HTTP] New connection - Session: ${sessionId}, Account: ${accountId}`);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const mcpServer = createMCPServer(accountId);

    // Simplified streaming implementation
    let buffer = "";

    req.on("data", async (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const request = JSON.parse(line);
            console.log(`[Streamable HTTP] Request:`, request);

            res.write(JSON.stringify({
              jsonrpc: "2.0",
              id: request.id,
              result: { status: "processed", accountId }
            }) + "\n");
          } catch (err) {
            console.error(`[Streamable HTTP] Parse error:`, err);
          }
        }
      }
    });

    req.on("end", () => {
      console.log(`[Streamable HTTP] Connection ended - Session: ${sessionId}`);
      res.end();
    });

    req.on("close", () => {
      console.log(`[Streamable HTTP] Connection closed - Session: ${sessionId}`);
    });
  });

  // ========================================
  // Utility endpoints
  // ========================================
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      transports: ["stdio", "sse", "streamable-http"],
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/", (req, res) => {
    res.send(`
      <h1>Finam Trade MCP Server</h1>
      <p>Server requires X-Finam-Account-Id header for HTTP transports</p>
      <h2>Usage Examples:</h2>
      <h3>SSE:</h3>
      <pre>curl -N -H "X-Finam-Account-Id: 12345678" http://localhost:3000/sse</pre>
      <h3>Streamable HTTP:</h3>
      <pre>curl -X POST -H "X-Finam-Account-Id: 12345678" http://localhost:3000/mcp/v1</pre>
      <h3>STDIO:</h3>
      <pre>FINAM_ACCOUNT_ID=12345678 node dist/index.js</pre>
      <p><a href="/health">Health Check</a></p>
    `);
  });

  // ========================================
  // Start server
  // ========================================
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🚀 Finam Trade MCP Server running on port ${PORT}`);
    console.log(`\nHTTP endpoints require X-Finam-Account-Id header`);
    console.log(`STDIO mode requires FINAM_ACCOUNT_ID env variable`);
    console.log(`\nEndpoints:`);
    console.log(`  - SSE:              http://localhost:${PORT}/sse`);
    console.log(`  - Streamable HTTP:  http://localhost:${PORT}/mcp/v1`);
    console.log(`  - Health:           http://localhost:${PORT}/health`);
  });
}

// ==========================================
// Main
// ==========================================
const transport = process.env.MCP_TRANSPORT || "http";

if (transport === "stdio") {
  startStdioServer().catch((error) => {
    console.error("Failed to start STDIO server:", error);
    process.exit(1);
  });
} else {
  startHTTPServer().catch((error) => {
    console.error("Failed to start HTTP server:", error);
    process.exit(1);
  });
}
```
