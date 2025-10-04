# Тест для размещения результатов на leaderboard

**demo-agent/test/test-concurrent.js**

**Назначение:** 

Тестирование работы demo-agent с FINAM Trade API через MCP сервер  
на данных из CSV с использованием параллельных запросов.

**Что делает:**
1. Загружает вопросы из `demo-agent/test/data/test.csv`
2. Создает **отдельную сессию для каждого вопроса**
3. Обрабатывает вопросы **параллельно** группами по 10 (настраивается через константу `CONCURRENT_LIMIT`)
4. Если MCP сервер запущен с `TEST_SKIP_CALL_MCP=true`, то вызов эндпоинтов TRADE API не происходит 
   (в целях ускорения и экономии)  
5. Извлекает endpoints из `toolCalls` с подстановкой параметров
6. Сохраняет результаты в JSON и CSV

**Параметры:**
- Параллельность: 10 запросов одновременно 
- Каждый запрос в своей сессии
- Формат CSV: `uid;type;request`

**Как запустить:**
```bash
# Terminal 1: Start MCP server
TEST_SKIP_CALL_MCP=true npm run mcp:http

# Terminal 2: Start demo-agent
cd demo-agent && npm start

# Terminal 3: Run test with credentials
TEST_ACCOUNT_ID=your_account_id TEST_API_SECRET_TOKEN=your_token node demo-agent/test/test-concurrent.js
```

**Фичи:**
- ⚡ Ускорение за счет распараллеливания запросов, отсутсвия вызовов эндпоинтов TRADE API, сокращения количества токенов
- ✅ Каждый запрос изолирован в своей сессии
- 📊 Измеряет общее время и среднее время на запрос

---

## Структура данных

### test.csv
```csv
uid;question
2ec2f3dc;Глубина рынка для RIZ5@RTSX.
1ebb3c68;Актуальная цена Роснефти.
d9c5a7c5;Что не так с ордером ORDERR01?
```


### Результат test_demo_agent.js

**JSON (_test-data/<timestamp>_result.json):**
```json
[
   {
      "uid": "2ec2f3dc",
      "type": "GET",
      "question": "Глубина рынка для RIZ5@RTSX.",
      "endpointsAndNames": [
         [
            "OrderBook",
            "GET;/v1/instruments/RIZ5@RTSX/orderbook"
         ],
         [
            "LastQuote",
            "GET;/v1/instruments/RIZ5@RTSX/quotes/latest"
         ],
         [
            "OrderBook",
            "GET;/v1/instruments/RIZ5@RTSX/orderbook"
         ]
      ],
      "sessionId": "session_1759609807344_n2pbo3ogz"
   },
   {
      "uid": "1ebb3c68",
      "type": "GET",
      "question": "Актуальная цена Роснефти.",
      "endpointsAndNames": [
         [
            "LastQuote",
            "GET;/v1/instruments/ROSN@MISX/quotes/latest"
         ],
         [
            "GetAssetDetails",
            "GET;/v1/assets/ROSN@MISX"
         ],
         [
            "GetAssetDetails",
            "GET;/v1/assets/ROSN@MISX/params"
         ]
      ],
      "sessionId": "session_1759609807342_a8qkye34h"
   }
]
```

**CSV (_test-data/<timestamp>_submission.csv):**

В оценочный файл попадает первый из масива эндпоинтов, которые решил задействовать агент
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

# Credentials для test_demo_agent.js (обязательно для вызова MCP tools)
TEST_ACCOUNT_ID=your_account_id
TEST_API_SECRET_TOKEN=your_secret_token

```

**Примечание:** `TEST_ACCOUNT_ID` и `TEST_API_SECRET_TOKEN` передаются в каждый запрос к `/api/chat` для аутентификации в MCP сервере.

---

## Troubleshooting

### test_demo_agent.js не находит endpoints
- ✅ Проверьте, что MCP сервер запущен с `TEST_SKIP_CALL_MCP=true`
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

