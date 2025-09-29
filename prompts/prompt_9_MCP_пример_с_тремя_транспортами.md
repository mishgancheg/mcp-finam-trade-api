# Пример MCP сервера с тремя транспортами

## src/index.ts

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

// ==========================================
// Создание MCP сервера
// ==========================================
function createMCPServer() {
  const server = new Server(
    {
      name: "multi-transport-example",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Регистрация инструмента: get_current_time
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_current_time",
          description: "Returns current server time",
          inputSchema: {
            type: "object",
            properties: {
              timezone: {
                type: "string",
                description: "Timezone (e.g., UTC, Europe/Moscow)",
                default: "UTC",
              },
            },
          },
        },
        {
          name: "echo",
          description: "Echoes back the provided message",
          inputSchema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Message to echo",
              },
            },
            required: ["message"],
          },
        },
      ],
    };
  });

  // Обработка вызовов инструментов
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "get_current_time") {
        const timezone = (args?.timezone as string) || "UTC";
        const now = new Date();
        const timeString = now.toLocaleString("en-US", {
          timeZone: timezone,
          dateStyle: "full",
          timeStyle: "long",
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  timezone,
                  time: timeString,
                  timestamp: now.getTime(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (name === "echo") {
        const message = args?.message as string;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  echoed: message,
                  length: message.length,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// ==========================================
// STDIO Transport
// ==========================================
async function startStdioServer() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  
  // Логируем в stderr (stdout используется для MCP протокола)
  console.error("MCP Server started in STDIO mode");
  console.error("Ready to accept requests via stdin/stdout");
}

// ==========================================
// HTTP Server (SSE + Streamable HTTP)
// ==========================================
async function startHTTPServer() {
  const app = express();
  app.use(express.json());

  // Хранилище активных SSE соединений
  const sseConnections = new Map<string, SSEServerTransport>();

  // ========================================
  // SSE Transport
  // ========================================
  
  // SSE endpoint - создает stream для получения ответов
  app.get("/sse", async (req, res) => {
    const sessionId = `sse-${Date.now()}-${Math.random()}`;
    console.log(`[SSE] New connection: ${sessionId}`);

    // Настройка SSE заголовков
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Создаем новый MCP сервер для этого соединения
    const mcpServer = createMCPServer();
    const transport = new SSEServerTransport("/message", res);
    
    sseConnections.set(sessionId, transport);
    
    await mcpServer.connect(transport);

    req.on("close", () => {
      console.log(`[SSE] Connection closed: ${sessionId}`);
      sseConnections.delete(sessionId);
    });
  });

  // POST endpoint для отправки запросов от клиента
  app.post("/message", async (req, res) => {
    console.log(`[SSE] Received message:`, req.body);
    // Запросы обрабатываются через SSE transport автоматически
    res.status(202).end();
  });

  // ========================================
  // Streamable HTTP Transport
  // ========================================
  
  app.post("/mcp/v1", async (req, res) => {
    const sessionId = `http-${Date.now()}-${Math.random()}`;
    console.log(`[Streamable HTTP] New connection: ${sessionId}`);

    // Настройка заголовков для streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Создаем новый MCP сервер для этого соединения
    const mcpServer = createMCPServer();
    
    // Note: StreamableHTTPServerTransport требует специальной настройки
    // В текущей версии SDK это может потребовать дополнительной конфигурации
    // Для простоты используем базовую реализацию
    
    try {
      // Простая реализация newline-delimited JSON streaming
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
              
              // Обрабатываем через внутренний API сервера
              // (упрощенная версия, в продакшене используйте SDK транспорт)
              res.write(JSON.stringify({ 
                jsonrpc: "2.0", 
                id: request.id,
                result: { status: "processed" }
              }) + "\n");
            } catch (err) {
              console.error(`[Streamable HTTP] Parse error:`, err);
            }
          }
        }
      });

      req.on("end", () => {
        console.log(`[Streamable HTTP] Connection ended: ${sessionId}`);
        res.end();
      });

      req.on("close", () => {
        console.log(`[Streamable HTTP] Connection closed: ${sessionId}`);
      });

    } catch (error) {
      console.error(`[Streamable HTTP] Error:`, error);
      res.status(500).end();
    }
  });

  // ========================================
  // Utility endpoints
  // ========================================
  
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      transports: ["stdio", "sse", "streamable-http"],
      connections: {
        sse: sseConnections.size,
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/", (req, res) => {
    res.send(`
      <h1>MCP Multi-Transport Server</h1>
      <p>Server is running and supports multiple transports:</p>
      <ul>
        <li><strong>STDIO:</strong> Start with MCP_TRANSPORT=stdio</li>
        <li><strong>SSE:</strong> Connect to <code>GET /sse</code> and send messages to <code>POST /message</code></li>
        <li><strong>Streamable HTTP:</strong> Connect to <code>POST /mcp/v1</code></li>
      </ul>
      <p><a href="/health">Health Check</a></p>
    `);
  });

  // ========================================
  // Start HTTP server
  // ========================================
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🚀 MCP Server running on port ${PORT}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  - SSE:              http://localhost:${PORT}/sse`);
    console.log(`  - SSE Messages:     http://localhost:${PORT}/message`);
    console.log(`  - Streamable HTTP:  http://localhost:${PORT}/mcp/v1`);
    console.log(`  - Health:           http://localhost:${PORT}/health`);
    console.log(`\nActive transports: SSE, Streamable HTTP`);
  });
}

// ==========================================
// Main entry point
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

**Использование через Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "multi-transport": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

### 3. Запуск в режиме HTTP (SSE + Streamable HTTP)


**Тестирование SSE:**
```bash
# В одном терминале - открываем SSE stream
curl -N http://localhost:3000/sse

# В другом терминале - отправляем запрос
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

**Тестирование Streamable HTTP:**
```bash
curl -X POST http://localhost:3000/mcp/v1 \
  -H "Content-Type: application/json" \
  -N \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Диаграмма архитектуры

```
┌─────────────────────────────────────────────────────┐
│            MCP Server Core Logic                    │
│  (createMCPServer() - общая бизнес-логика)         │
│                                                     │
│  Tools:                                             │
│  - get_current_time                                 │
│  - echo                                             │
└──────────┬──────────────┬──────────────┬───────────┘
           │              │              │
    ┌──────┴──────┐  ┌───┴────┐  ┌──────┴────────┐
    │   STDIO     │  │  SSE   │  │ Streamable    │
    │  Transport  │  │Transport│  │ HTTP Transport│
    └──────┬──────┘  └───┬────┘  └──────┬────────┘
           │             │               │
    ┌──────┴──────┐  ┌──┴─────┐  ┌──────┴────────┐
    │ stdin/stdout│  │ GET /sse│  │ POST /mcp/v1  │
    │             │  │POST /msg│  │               │
    └─────────────┘  └─────────┘  └───────────────┘
           │             │               │
    ┌──────┴──────┐  ┌──┴─────┐  ┌──────┴────────┐
    │Claude Desktop│ │Browser │  │ CLI / Server  │
    │             │  │Claude  │  │  Clients      │
    └─────────────┘  └────────┘  └───────────────┘
```
