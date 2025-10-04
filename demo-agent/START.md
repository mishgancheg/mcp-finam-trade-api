# Demo Agent Setup Guide



## пример .env файла

```bash
# Claude API
ANTHROPIC_API_KEY=your_api_key_here
CLAUDE_MODEL=claude-sonnet-4-5-20250929

# MCP Server
# MCP сервер по умолчанию работает на порту 3001
MCP_SERVER_URL=http://localhost:3001

# API Server
WEB_API_PORT=3002
WEB_API_HOST=localhost

# Agent Configuration
AGENT_MAX_TURNS=10
AGENT_TIMEOUT=30000
AGENT_MODE=streaming
```

## Порядок запуска

### Терминал 1: MCP Сервер
```bash
npm run mcp:http
```

Должно появиться:
```
🚀 MCP Server running on port 3001

Available endpoints:
  - SSE:              http://localhost:3001/sse
  - SSE Messages:     http://localhost:3001/message
  - Streamable HTTP:  http://localhost:3001/mcp/v1
  - Health:           http://localhost:3001/health
```

### Терминал 2: OMS Emulator (опционально, для тестирования API)
```bash
npm run emulator
```

### Терминал 3: Demo Agent API
```bash
cd demo-agent
npm start
```

Должно появиться:
```
info: Connecting to MCP server via HTTP: http://localhost:3001
info: Connected to MCP server, loaded XX tools
info: API server running at http://localhost:3002
```

### Терминал 4: Demo Agent UI (в режиме разработки)
```bash
cd demo-agent
npm run dev:ui
```

Затем откройте http://localhost:5173 в браузере.

## Проверка работоспособности

### Проверить MCP сервер
```bash
curl http://localhost:3001/health
```

Ответ:
```json
{"status":"ok","transports":["stdio","sse","streamable-http"],"returnAs":"json"}
```

### Проверить Demo Agent API
```bash
curl http://localhost:3002/api/health
```

## Остановка процессов

### Остановить процесс на конкретном порту
```bash
node scripts/kill-port.js 3000  # OMS emulator
node scripts/kill-port.js 3001  # MCP server
node scripts/kill-port.js 3002  # Demo agent API
```

### Остановить OMS emulator (все порты)
```bash
node scripts/kill-emulator.js
```

## Архитектура портов

- **3000** - OMS Emulator HTTP API
- **3001** - MCP Server (HTTP/SSE transport)
- **3002** - Demo Agent REST API
- **3006** - OMS Emulator WebSocket
- **5173** - Vite Dev Server (UI в режиме разработки)

## Troubleshooting

### Ошибка: "ECONNREFUSED ::1:3000"
- MCP сервер не запущен или использует неправильный порт
- Проверьте, что `MCP_SERVER_URL=http://localhost:3001` в .env
- Запустите `npm run mcp:http` для старта MCP сервера

### Ошибка: "SSE error: Non-200 status code (404)"
- В .env указан неправильный URL (например, `http://localhost:3000/mcp`)
- Исправьте на `http://localhost:3001`

### Ошибка: "Port XXXX is already in use"
- Используйте `node scripts/kill-port.js XXXX` для остановки процесса на порту

### MCP сервер не подключается к API
- Убедитесь, что в `.env` файле в корне проекта указан `API_BASE_URL=http://localhost:3000`
- Запустите OMS emulator: `npm run emulator`
