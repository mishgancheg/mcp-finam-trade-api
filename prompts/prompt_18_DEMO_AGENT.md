# Техническое задание: Демонстрационный агент для FINAM TRADE API

## Обзор проекта

Необходимо разработать полнофункциональный демонстрационный агент-чатбот,
который использует Claude Agent SDK для взаимодействия с MCP сервером FINAM TRADE API.
Проект должен включать AI-пайплайн, REST API сервер и веб-интерфейс чата.

## Архитектура проекта

```
demo-agent/
├── src/
│   ├── agent/           # AI-пайплайн на базе Claude Agent SDK
│   ├── api/             # REST API сервер
│   ├── ui/              # Веб-интерфейс чата
│   └── types/           # TypeScript типы
└── README.md
```

Все дополнительные npm пакеты для этой функциональности разместить в devDependencies


## Технологический стек

- **Язык**: TypeScript/Node.js
- **AI Framework**: Claude Agent SDK (@anthropic-ai/sdk)
- **API Framework**: Express.js
- **UI**: Vue.js + TypeScript
- **MCP Client**: @modelcontextprotocol/sdk

## Требования к компонентам

### 1. AI-пайплайн (Agent Module)

**Расположение**: `demo-agent/src/agent/`

**Обязательное изучение документации**:
- https://docs.claude.com/en/api/agent-sdk/overview
- https://docs.claude.com/en/api/agent-sdk/typescript
- https://docs.claude.com/en/api/agent-sdk/streaming-vs-single-mode
- https://docs.claude.com/en/api/agent-sdk/permissions
- https://docs.claude.com/en/api/agent-sdk/sessions
- https://docs.claude.com/en/api/agent-sdk/modifying-system-prompts
- https://docs.claude.com/en/api/agent-sdk/mcp
- https://docs.claude.com/en/api/agent-sdk/custom-tools
- https://docs.claude.com/en/api/agent-sdk/subagents
- https://docs.claude.com/en/api/messages-examples
- https://docs.claude.com/en/api/messages-batch-examples


**Функциональность**:

1. **Инициализация агента**
  - Создание экземпляра Claude Agent с использованием Claude Agent SDK
  - Подключение к MCP серверу FINAM TRADE API
  - Автоматическое считывание и регистрация доступных инструментов (tools) из MCP
  - Настройка системного промпта для финансовой тематики

2. **Управление сессиями**
  - Создание и управление сессиями пользователей
  - Хранение истории переписки в рамках сессии
  - Персистентность истории (сохранение в памяти или БД) - НЕ ТРЕБУЕТСЯ: хранится в кеше пока работает приложение
  - Возможность очистки истории сессии

3. **Обработка сообщений**
  - Прием текстового сообщения от пользователя
  - Добавление сообщения в историю сессии
  - Передача контекста (истории + доступные tools) Claude API
  - Организация цикла вызова инструментов (agent loop):
    - Claude анализирует запрос
    - При необходимости вызывает tools из MCP
    - Обрабатывает результаты вызовов
    - Может делать несколько последовательных вызовов
  - Формирование финального ответа пользователю

4. **Работа с инструментами MCP**
  - Автоматическое обнаружение доступных tools через MCP
  - Прокси-механизм для вызова tools на MCP сервере
  - Обработка ошибок при вызове tools
  - Логирование вызовов инструментов

5. **Режимы работы**
  - Поддержка как streaming, так и single mode ответов
  - Возможность переключения режима через конфигурацию

**Основные классы/модули**:

```typescript
// agent/AgentManager.ts
class AgentManager {
  // Инициализация агента с MCP
  async initialize(mcpServerUrl: string): Promise<void>
  
  // Создание новой сессии
  createSession(userId: string): Session
  
  // Получение сессии
  getSession(sessionId: string): Session | null
  
  // Обработка сообщения
  async processMessage(
    sessionId: string, 
    message: string
  ): Promise<AgentResponse>
  
  // Streaming обработка
  async processMessageStream(
    sessionId: string,
    message: string
  ): AsyncGenerator<StreamChunk>
}

// agent/Session.ts
class Session {
  id: string
  userId: string
  messages: Message[]
  toolCalls: ToolCall[]
  createdAt: Date
  updatedAt: Date
  
  addMessage(role: 'user' | 'assistant', content: string): void
  addToolCall(toolCall: ToolCall): void
  getHistory(): Message[]
  clear(): void
}

// agent/MCPConnector.ts
class MCPConnector {
  // Подключение к MCP серверу
  async connect(serverUrl: string): Promise<void>
  
  // Получение списка доступных tools
  async listTools(): Promise<Tool[]>
  
  // Вызов tool через MCP
  async callTool(name: string, params: any): Promise<any>
}
```

### 2. REST API сервер

**Расположение**: `demo-agent/src/api/`

**Функциональность**:

1. **Эндпоинты**:

```
POST /api/sessions
- Создание новой сессии чата
- Возвращает sessionId

POST /api/chat
- Отправка сообщения агенту
Body: { sessionId: string, message: string }
- Возвращает ответ агента и историю вызовов tools

GET /api/chat/stream
- Streaming версия чата (Server-Sent Events или WebSocket)
Query: ?sessionId=xxx&message=yyy

GET /api/sessions/:sessionId/history
- Получение истории сообщений сессии

DELETE /api/sessions/:sessionId
- Удаление сессии и её истории

GET /api/tools
- Получение списка доступных инструментов MCP

GET /api/health
- Проверка работоспособности сервера
```

2. **Middleware**:
  - CORS для доступа с фронтенда
  - Логирование запросов
  - Обработка ошибок
  - Валидация входных данных

3. **Конфигурация**:
  - Порт сервера (по умолчанию 3002)
  - URL MCP сервера (из переменных окружения)
  - Claude API ключ (из переменных окружения)

**Пример использования**:

```bash
# Создание сессии
curl -X POST http://localhost:3002/api/sessions

# Отправка сообщения
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc123", "message": "Покажи мой портфель"}'
```

### 3. Веб-интерфейс чата

**Расположение**: `demo-agent/src/ui/`

**Дизайн**: Аналог интерфейса Telegram чата

**Функциональность**:

1. **Основной интерфейс**:
  - Список сообщений (история чата)
  - Поле ввода сообщения
  - Кнопка отправки
  - Индикатор "печатает..." при обработке
  - Автоскролл к последнему сообщению

2. **Отображение сообщений**:
  - Сообщения пользователя (справа, синий фон)
  - Сообщения ассистента (слева, серый фон)
  - Временные метки
  - Индикатор вызова tools (например, "🔧 Используется инструмент: getPortfolio")

3. **Дополнительные функции**:
  - Кнопка "Новый чат" (создание новой сессии)
  - Кнопка "Очистить историю"
  - Отображение доступных инструментов (боковая панель или модальное окно)
  - Поддержка markdown в ответах ассистента
  - Копирование сообщений

4. **Streaming режим**:
  - Отображение ответа по мере поступления
  - Плавная анимация появления текста

**Технологии UI**:
- React + TypeScript
- CSS/SCSS или styled-components для стилей
- Axios или Fetch API для запросов
- EventSource для SSE (streaming)
- React Markdown для отображения форматированного текста

**Компонентная структура**:
```
ui/
├── components/
│   ├── ChatWindow.tsx         # Главный компонент чата
│   ├── MessageList.tsx        # Список сообщений
│   ├── Message.tsx            # Отдельное сообщение
│   ├── InputField.tsx         # Поле ввода
│   ├── ToolIndicator.tsx      # Индикатор вызова tool
│   └── Sidebar.tsx            # Боковая панель с инструментами
├── hooks/
│   ├── useChat.ts             # Хук для работы с API
│   └── useSession.ts          # Управление сессией
├── services/
│   └── api.ts                 # API клиент
├── types/
│   └── index.ts               # TypeScript типы
└── App.tsx
```

## Интеграция с MCP сервером

**Важно**: Код агента должен быть полностью независим от кода MCP сервера FINAM TRADE API.

**Способ подключения**:
- MCP сервер запускается отдельным процессом
- Агент подключается к MCP через стандартный MCP протокол
- URL MCP сервера задается через переменные окружения

**Переменные окружения** (`demo-agent/.env`):
```env
# Claude API
ANTHROPIC_API_KEY=your_api_key_here
CLAUDE_MODEL=claude-sonnet-4-5-20250929

# MCP Server
MCP_SERVER_URL=stdio://path/to/finam-mcp-server
# или
MCP_SERVER_URL=http://localhost:3000/mcp

# API Server
WEB_API_PORT=3002
WEB_API_HOST=localhost

# Agent Configuration
AGENT_MAX_TURNS=10
AGENT_TIMEOUT=30000
AGENT_MODE=streaming
```

## Системный промпт агента

Агент должен иметь настроенный системный промпт, который:
- Объясняет, что он является помощником для работы с FINAM TRADE API
- Описывает доступные возможности
- Устанавливает дружелюбный, но профессиональный тон
- Указывает на необходимость подтверждения для критических операций (торговые сделки)

**Пример промпта** (можно улучшить):
```
Вы - AI-ассистент для работы с торговой платформой FINAM через TRADE API.

Ваши возможности:
- Получение информации о портфеле и позициях
- Анализ рынка и инструментов
- Размещение торговых заказов
- Получение исторических данных
- Расчет показателей

При работе:
1. Всегда используйте доступные инструменты для получения актуальных данных
2. Перед размещением торговых заказов уточняйте детали у пользователя
3. Объясняйте свои действия понятным языком
4. Если информации недостаточно - задавайте уточняющие вопросы

Отвечайте на русском языке, четко и структурированно.
```

## Требования к коду

1. **TypeScript**:
  - Строгая типизация (strict mode)
  - Явные типы для всех функций и переменных
  - Интерфейсы для всех API объектов

2. **Обработка ошибок**:
  - Try-catch для всех async операций
  - Понятные сообщения об ошибках для пользователя
  - Логирование ошибок на сервере

3. **Логирование**:
  - Использовать библиотеку логирования (winston, pino)
  - Логировать все вызовы tools
  - Логировать ошибки с контекстом

4. **Тестирование**:
  - Unit тесты для критичных функций (опционально)
  - Документация с примерами использования

5. **Документация**:
  - README.md с инструкцией по запуску
  - Комментарии к основным функциям
  - Примеры API запросов

## Структура package.json

```json
{
  "name": "finam-demo-agent",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:ui\"",
    "dev:api": "ts-node-dev --respawn src/api/server.ts",
    "dev:ui": "vite",
    "build": "npm run build:api && npm run build:ui",
    "build:api": "tsc",
    "build:ui": "vite build",
    "start": "node dist/api/server.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "latest",
    "@modelcontextprotocol/sdk": "latest",
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "typescript": "^5.3.0",
    "ts-node-dev": "^2.0.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "concurrently": "^8.2.0"
  }
}
```

## Этапы разработки

### Этап 1: AI-пайплайн (приоритет 1)
1. Настройка проекта и зависимостей
2. Изучение Claude Agent SDK документации
3. Реализация MCPConnector для подключения к MCP серверу
4. Реализация Session для управления историей
5. Реализация AgentManager с базовым циклом agent loop
6. Тестирование работы через CLI

### Этап 2: REST API (приоритет 2)
1. Настройка Express сервера
2. Реализация эндпоинтов для создания сессий и чата
3. Интеграция с AgentManager
4. Добавление streaming эндпоинта
5. Тестирование через curl/Postman

### Этап 3: Web UI (приоритет 3)
1. Настройка React проекта
2. Создание основных компонентов чата
3. Интеграция с REST API
4. Добавление стилей (Telegram-подобный дизайн)
5. Реализация streaming режима
6. Финальное тестирование

## Критерии приемки

✅ Проект успешно запускается командой `npm run dev`
✅ Агент корректно подключается к MCP серверу и получает список tools
✅ Агент успешно обрабатывает текстовые запросы пользователя
✅ Реализован полный цикл agent loop с вызовами tools
✅ История переписки сохраняется в рамках сессии
✅ REST API отвечает на все описанные эндпоинты
✅ Web UI отображает сообщения и позволяет отправлять новые
✅ Поддерживается streaming режим
✅ Проект имеет README с понятной инструкцией по запуску
✅ Код соответствует требованиям TypeScript и обработки ошибок

## Дополнительные улучшения (опционально)

- Сохранение истории сессий в базу данных (SQLite, PostgreSQL)
- Аутентификация пользователей
- Поддержка нескольких одновременных сессий в UI (табы)
- Экспорт истории чата в файл
- Темная/светлая тема интерфейса
- Голосовой ввод
- Уведомления о завершении долгих операций

## Ссылки и ресурсы

**Документация Claude Agent SDK**:
- Overview: https://docs.claude.com/en/api/agent-sdk/overview
- TypeScript Guide: https://docs.claude.com/en/api/agent-sdk/typescript
- Streaming vs Single Mode: https://docs.claude.com/en/api/agent-sdk/streaming-vs-single-mode
- Permissions: https://docs.claude.com/en/api/agent-sdk/permissions
- Sessions: https://docs.claude.com/en/api/agent-sdk/sessions
- System Prompts: https://docs.claude.com/en/api/agent-sdk/modifying-system-prompts
- MCP Integration: https://docs.claude.com/en/api/agent-sdk/mcp
- Custom Tools: https://docs.claude.com/en/api/agent-sdk/custom-tools
- Subagents: https://docs.claude.com/en/api/agent-sdk/subagents
- Messages Examples: https://docs.claude.com/en/api/messages-examples
- Batch Examples: https://docs.claude.com/en/api/messages-batch-examples

**MCP Protocol**:
- Model Context Protocol SDK: https://github.com/modelcontextprotocol/typescript-sdk

---

**Примечание**: Этот документ является техническим заданием для Claude Code. 
Все требования должны быть реализованы с соблюдением best practices Node.js/TypeScript 
разработки.
