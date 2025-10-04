# Demo-Agent Tests

Набор тестов для проверки работы demo-agent с FINAM Trade API через MCP сервер.

## Тесты

### 1. test_demo_agent.js - Тест на данных из CSV

**Назначение:** Массовое тестирование demo-agent на реальных вопросах с извлечением информации о вызванных API endpoints.

**Что делает:**
1. Загружает вопросы из `demo-agent/test/data/test.csv`
2. Создает одну сессию
3. Отправляет каждый вопрос в demo-agent через REST API (`/api/chat`)
4. Demo-agent использует Claude для понимания вопроса и вызова соответствующих MCP tools
5. MCP Server возвращает результат + список вызванных API endpoints
6. Тест извлекает `endpoints` из MCP ответа и сохраняет в памяти
7. По завершении сохраняет:
   - `_test-data/<timestamp>_result.json` - полные результаты со всеми endpoints
   - `_test-data/<timestamp>_submission.csv` - только первый endpoint из каждого массива

**Параметры:**
- Батчи по 50 запросов
- Задержка 500ms между запросами
- Формат CSV: `uid;type;request`

**Как запустить:**
```bash
# Terminal 1: Start MCP server with endpoints enabled
SHOW_MCP_ENDPOINTS=true npm run mcp:http

# Terminal 2: Start demo-agent
cd demo-agent && npm start

# Terminal 3: Run test
node demo-agent/test/test_demo_agent.js
```

**Пример результата:**
```csv
uid;type;request
2ec2f3dc;GET;/v1/sessions
1ebb3c68;GET;/v1/assets
```

---

### 2. test-concurrent.js - Тест параллельных запросов

**Назначение:** Проверка корректности обработки параллельных запросов с разными `accountId`.

**Что делает:**
1. Создает 3 разные сессии для 3 разных пользователей
2. Отправляет параллельно (Promise.all) 3 одинаковых запроса "Покажи мой аккаунт"
3. Каждый запрос использует свой `accountId` (111111, 222222, 333333)
4. Проверяет, что каждая сессия получила данные для своего `accountId`
5. Выводит предупреждение о возможной race condition

**Цель теста:**
Выявить проблемы с concurrent request handling, когда credentials могут перемешаться между параллельными запросами.

**Как запустить:**
```bash
# Terminal 1: Start demo-agent
cd demo-agent && npm start

# Terminal 2: Run test
node demo-agent/test/test-concurrent.js
```

**Что проверяется:**
- ✅ Каждая сессия сохраняет свой `accountId`
- ✅ Параллельные запросы не мешают друг другу
- ⚠️ Нет race condition при обращении к MCP серверу

---

## Основные различия

| Параметр | test_demo_agent.js | test-concurrent.js |
|----------|-------------------|-------------------|
| **Цель** | Массовое тестирование на реальных данных | Проверка параллельных запросов |
| **Данные** | Из CSV файла (реальные вопросы) | Хардкод ("Покажи мой аккаунт") |
| **Сессии** | Одна сессия | 3 сессии для разных пользователей |
| **Запросы** | Последовательные батчи с задержкой | Параллельные (Promise.all) |
| **accountId** | Не используется (опционально) | Обязательно (111111, 222222, 333333) |
| **Результат** | JSON + CSV с endpoints | Консольный вывод с предупреждениями |
| **Что тестирует** | Извлечение endpoints из MCP | Race conditions и изоляцию сессий |

---

## Структура данных

### test.csv
```csv
uid;question
2ec2f3dc;Глубина рынка для RIZ5@RTSX.
1ebb3c68;Актуальная цена Роснефти.
d9c5a7c5;Что не так с ордером ORDERR01?
```

### Формат MCP ответа (из demo-agent)
```json
{
  "sessionId": "...",
  "message": "...",
  "toolCalls": [
    {
      "result": {
        "content": [
          {
            "endpoints": ["GET;/v1/sessions", "POST;/v1/accounts/123/orders"],
            "type": "text",
            "text": "📝"
          }
        ]
      }
    }
  ]
}
```

### Результат test_demo_agent.js

**JSON (_test-data/<timestamp>_result.json):**
```json
[
  {
    "uid": "2ec2f3dc",
    "type": "GET",
    "endpoints": ["GET;/v1/sessions", "POST;/v1/accounts/123/orders"]
  }
]
```

**CSV (_test-data/<timestamp>_submission.csv):**
```csv
uid;type;request
2ec2f3dc;GET;/v1/sessions
1ebb3c68;GET;/v1/assets
```

---

## Переменные окружения

```bash
# Base URL для demo-agent API (опционально)
DEMO_API_BASE=http://localhost:3002

# MCP Server должен быть запущен с включенными endpoints
SHOW_MCP_ENDPOINTS=true
```

---

## Troubleshooting

### test_demo_agent.js не находит endpoints
- ✅ Проверьте, что MCP сервер запущен с `SHOW_MCP_ENDPOINTS=true`
- ✅ Убедитесь, что demo-agent подключен к MCP серверу
- ✅ Проверьте формат ответа в `toolCalls[].result.content[].endpoints`

### test-concurrent.js показывает race condition
- ⚠️ Проблема: credentials перемешиваются между параллельными запросами
- 🔍 Проверьте изоляцию `accountId` между сессиями
- 🔧 Убедитесь, что каждая сессия хранит свои credentials отдельно

### Ошибка "Session not found"
- ✅ Проверьте, что demo-agent работает
- ✅ Убедитесь, что сессия создана перед отправкой сообщений
- ✅ Проверьте правильность `sessionId`

---

## Добавление новых тестов

Чтобы добавить новый тест:

1. Создайте файл `test-[название].js` в `demo-agent/test/`
2. Используйте существующие утилиты для создания сессий и отправки сообщений
3. Добавьте описание в этот README.md
4. Если нужны тестовые данные, добавьте в `demo-agent/test/data/`

**Пример минимального теста:**
```javascript
const API_BASE = 'http://localhost:3002';

async function createSession(userId) {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  return res.json();
}

async function sendMessage(sessionId, message) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message })
  });
  return res.json();
}

async function runTest() {
  const session = await createSession('test-user');
  const response = await sendMessage(session.sessionId, 'Тестовый вопрос');
  console.log(response);
}

runTest().catch(console.error);
```
