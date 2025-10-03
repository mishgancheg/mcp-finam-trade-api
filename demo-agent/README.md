# FINAM Demo Agent

Демонстрационный агент-чатбот для взаимодействия с FINAM TRADE API через Claude Agent SDK и MCP сервер.

## Архитектура проекта

```
demo-agent/
├── src/
│   ├── agent/                 # AI-пайплайн на базе Claude Agent SDK
│   │   ├── AgentManager.ts    # Управление агентом и циклом agent loop
│   │   ├── Session.ts         # Управление сессиями и историей
│   │   └── MCPConnector.ts    # Подключение к MCP серверу
│   ├── api/                   # REST API сервер
│   │   └── server.ts          # Express сервер с эндпоинтами
│   ├── ui/                    # Веб-интерфейс чата (React)
│   │   ├── components/        # React компоненты
│   │   ├── hooks/             # React хуки
│   │   ├── services/          # API клиент
│   │   ├── App.tsx            # Главный компонент
│   │   ├── main.tsx           # Точка входа
│   │   ├── index.html         # HTML шаблон
│   │   └── styles.css         # Стили
│   └── types/                 # TypeScript типы
│       └── index.ts
├── package.json
├── tsconfig.json
├── tsconfig.api.json
├── vite.config.ts
└── .env.example
```

## Технологический стек

- **AI Framework**: Claude Agent SDK (@anthropic-ai/sdk)
- **MCP Client**: @modelcontextprotocol/sdk
- **API Framework**: Express.js
- **UI**: React + TypeScript
- **Build Tool**: Vite
- **Logging**: Winston

## Установка

1. Установите зависимости:

```bash
cd demo-agent
npm install
```

2. Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

3. Настройте переменные окружения в `.env`:

```env
# Claude API
ANTHROPIC_API_KEY=your_api_key_here
CLAUDE_MODEL=claude-sonnet-4-5-20250929

# MCP Server (выберите один вариант)
# Вариант 1: stdio transport (для локального MCP сервера)
MCP_SERVER_URL=stdio://path/to/dist/src/mcp/index.js

# Вариант 2: HTTP transport
# MCP_SERVER_URL=http://localhost:3000/mcp

# API Server
WEB_API_PORT=3002
WEB_API_HOST=localhost

# Agent Configuration
AGENT_MAX_TURNS=10
AGENT_TIMEOUT=30000
AGENT_MODE=streaming
```

## Запуск

### Разработка (одновременно API и UI)

```bash
npm run dev
```

Это запустит:
- API сервер на `http://localhost:3002`
- Vite dev сервер на `http://localhost:5173`

### Только API сервер

```bash
npm run dev:api
```

### Только UI

```bash
npm run dev:ui
```

### Production build

```bash
# Сборка всего проекта
npm run build

# Запуск собранного приложения
npm start
```

## API Endpoints

### Сессии

**POST /api/sessions**
Создание новой сессии чата

Request:
```json
{
  "userId": "user123"
}
```

Response:
```json
{
  "sessionId": "session_1234567890_abc123",
  "userId": "user123",
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

**GET /api/sessions/:sessionId/history**
Получение истории сообщений сессии

Response:
```json
{
  "sessionId": "session_1234567890_abc123",
  "messages": [
    {
      "role": "user",
      "content": "Покажи мой портфель",
      "timestamp": "2025-01-15T10:31:00.000Z"
    },
    {
      "role": "assistant",
      "content": "Ваш портфель содержит...",
      "timestamp": "2025-01-15T10:31:05.000Z"
    }
  ],
  "toolCalls": [
    {
      "name": "GetPortfolio",
      "params": {},
      "result": {...},
      "timestamp": "2025-01-15T10:31:03.000Z"
    }
  ]
}
```

**DELETE /api/sessions/:sessionId**
Удаление сессии

Response:
```json
{
  "success": true
}
```

### Чат

**POST /api/chat**
Отправка сообщения (не streaming)

Request:
```json
{
  "sessionId": "session_1234567890_abc123",
  "message": "Какая текущая цена YDEX?"
}
```

Response:
```json
{
  "sessionId": "session_1234567890_abc123",
  "message": "Текущая цена YDEX составляет...",
  "toolCalls": [
    {
      "name": "GetSecurityInfo",
      "params": {"symbol": "YDEX@MISX"},
      "result": {...}
    }
  ],
  "timestamp": "2025-01-15T10:32:00.000Z"
}
```

**GET /api/chat/stream**
Отправка сообщения (streaming через Server-Sent Events)

Query params:
- `sessionId`: ID сессии
- `message`: Текст сообщения

Response (SSE stream):
```
data: {"type":"connected"}

data: {"type":"text","content":"Сейчас проверю"}

data: {"type":"tool_call","content":{"name":"GetSecurityInfo","params":{...}}}

data: {"type":"text","content":" цену..."}

data: {"type":"done","content":""}
```

### Утилиты

**GET /api/health**
Проверка работоспособности сервера

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "agentReady": true
}
```

**GET /api/tools**
Получение списка доступных инструментов MCP

## Использование

1. Откройте браузер на `http://localhost:5173`
2. Интерфейс автоматически создаст новую сессию
3. Введите сообщение в поле ввода и нажмите "Отправить" или Enter
4. Агент обработает ваш запрос, при необходимости используя инструменты MCP
5. Ответ будет отображен в реальном времени (streaming mode)

### Примеры запросов

```
Покажи мой портфель

Какая текущая цена GAZP?

Купи 10 акций SBER по рыночной цене

Покажи историю моих заказов

Какие инструменты доступны для торговли?
```

## Архитектурные особенности

### AI-пайплайн (Agent Module)

- **AgentManager**: Управляет жизненным циклом агента, сессиями, и циклом agent loop
- **Session**: Хранит историю сообщений и вызовов инструментов
- **MCPConnector**: Обеспечивает подключение к MCP серверу через stdio transport

### Agent Loop

1. Пользователь отправляет сообщение
2. Сообщение добавляется в историю сессии
3. AgentManager передает контекст Claude API с доступными инструментами
4. Claude анализирует запрос и при необходимости вызывает инструменты
5. MCPConnector выполняет вызовы инструментов на MCP сервере
6. Результаты добавляются в контекст
7. Цикл повторяется до получения финального ответа (max 10 итераций)
8. Финальный ответ возвращается пользователю

### REST API Server

- Express сервер с CORS
- Middleware для логирования и обработки ошибок
- Валидация входных данных
- Поддержка как обычного, так и streaming режима через SSE

### Web UI

- Telegram-подобный дизайн
- Автоскролл к последнему сообщению
- Индикатор "печатает..." при обработке
- Отображение вызовов инструментов
- Поддержка Markdown в ответах
- Real-time streaming обновления

## Troubleshooting

### API сервер не запускается

- Проверьте, что `ANTHROPIC_API_KEY` указан в `.env`
- Проверьте, что `MCP_SERVER_URL` указывает на корректный путь к MCP серверу
- Убедитесь, что порт 3002 свободен

### UI не подключается к API

- Проверьте, что API сервер запущен на `http://localhost:3002`
- Проверьте настройки CORS в `server.ts`
- Проверьте прокси в `vite.config.ts`

### MCP сервер не подключается

- Для stdio transport: убедитесь, что путь к `index.js` корректный
- Для HTTP transport: убедитесь, что MCP сервер запущен
- Проверьте логи API сервера на наличие ошибок подключения

### Агент не использует инструменты

- Проверьте, что MCP сервер предоставляет инструменты
- Проверьте логи на наличие ошибок при вызове инструментов
- Убедитесь, что системный промпт корректно настроен

## Лицензия

MIT
