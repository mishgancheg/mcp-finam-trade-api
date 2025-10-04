# Demo-Agent Testing with train.csv

Автоматическое тестирование demo-agent на данных из `train.csv` для расчёта метрики accuracy.

## Что делает тест

1. Загружает вопросы из `train.csv`
2. Отправляет каждый вопрос в demo-agent через API
3. Извлекает вызванные API endpoints из ответов (через `SHOW_MCP_ENDPOINTS`)
4. Сравнивает полученные endpoints с ожидаемыми из датасета
5. Вычисляет метрику accuracy
6. Генерирует `wrong_requests.json` с информацией об ошибках

## Требования

- MCP server запущен с `SHOW_MCP_ENDPOINTS=true`
- Demo-agent запущен и подключен к MCP серверу
- Node.js установлен

## Быстрый старт

### 1. Настроить .env

В корне проекта создайте `.env` (или скопируйте из `.env.example`):

```bash
# MCP Server
API_BASE_URL=https://api.finam.ru/v1
API_SECRET_TOKEN=ваш_токен
ACCOUNT_ID=ваш_аккаунт
RETURN_AS=json
SHOW_MCP_ENDPOINTS=true  # ВАЖНО: включить endpoints
MCP_HTTP_PORT=3001

# Demo-agent (demo-agent/.env)
ANTHROPIC_API_KEY=ваш_ключ_anthropic
MCP_SERVER_URL=http://localhost:3001/mcp/v1
WEB_API_PORT=3002
```

### 2. Запустить MCP server

В **терминале 1**:

```bash
# Из корня проекта
npm run build
npm run mcp:http
```

Должно появиться:
```
🚀 MCP Server running on port 3001
Response format: json
```

### 3. Запустить demo-agent

В **терминале 2**:

```bash
cd demo-agent
npm install  # если еще не установлено
npm run build  # если еще не собрано
npm run dev
```

Должно появиться:
```
Agent manager initialized successfully
Demo Agent API server running on http://localhost:3002
```

### 4. Запустить тест

В **терминале 3**:

```bash
node demo-agent/test/test-train-csv.js
```

## Результаты

### Вывод в консоль

```
🧪 Запуск тестирования demo-agent на train.csv...

✅ Demo-agent доступен

📂 Загрузка train.csv...
   Загружено 100 записей

🔧 Создание сессии...
   Session ID: abc123...

🚀 Начало тестирования...

═══════════════════════════════════════════════════════════════

[1/100] UID: 8566443a
Question: Прошу отменить ордер ORD789789
Expected: DELETE DELETE /v1/accounts/{account_id}/orders/ORD789789
✅ PASS

[2/100] UID: f937da73
Question: Отзови мою заявку ORD911911
Expected: DELETE DELETE /v1/accounts/{account_id}/orders/ORD911911
✅ PASS

...

═══════════════════════════════════════════════════════════════

📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:
═══════════════════════════════════════════════════════════════
Всего запросов:       100
Пройдено:             87
Провалено:            13
Accuracy:             87.00%
═══════════════════════════════════════════════════════════════

💾 Ошибки сохранены в: demo-agent/test/wrong_requests.json
   Количество ошибок: 13
```

### Файл wrong_requests.json

Содержит детальную информацию по каждому непрошедшему запросу:

```json
[
  {
    "uid": "abc123",
    "type": "GET",
    "question": "Покажи мой портфель",
    "expected_request": "GET /v1/accounts/{account_id}",
    "actual_endpoints": [
      "/v1/sessions",
      "/v1/accounts/12345"
    ],
    "reason": "Expected: /v1/accounts/{account_id}, Got: /v1/sessions, /v1/accounts/12345",
    "agent_response": "Ваш портфель..."
  }
]
```

## Анализ ошибок

### Типичные проблемы

1. **Endpoints не найдены**
   - Проверьте что `SHOW_MCP_ENDPOINTS=true` в .env
   - Перезапустите MCP server после изменения .env

2. **Неправильный формат endpoints**
   - Проверьте нормализацию в скрипте
   - Возможно нужна доработка функции `normalizeEndpoint()`

3. **Agent не понимает вопрос**
   - Проверьте system prompt в AgentManager
   - Возможно нужны примеры (few-shot)

4. **Таймауты**
   - Увеличьте задержку между запросами в скрипте
   - Проверьте нагрузку на Anthropic API

## Доработка скрипта

### Изменить задержку между запросами

В `test-train-csv.js`:

```javascript
// Задержка 100мс (по умолчанию)
await new Promise((resolve) => setTimeout(resolve, 100));

// Увеличить до 500мс
await new Promise((resolve) => setTimeout(resolve, 500));
```

### Тестировать на подмножестве данных

```javascript
// Только первые 10 записей
const trainData = loadTrainCsv().slice(0, 10);
```

### Добавить отладочную информацию

```javascript
// В функции sendMessage добавить:
console.log('Request payload:', JSON.stringify(payload, null, 2));
console.log('Response:', JSON.stringify(response, null, 2));
```

## Метрика Accuracy

```
Accuracy = (Количество корректных предсказаний / Общее количество запросов) * 100%
```

Запрос считается **корректным**, если:
- HTTP метод совпадает (GET, POST, DELETE и т.д.)
- API путь совпадает после нормализации (с учетом плейсхолдеров)

## Troubleshooting

### MCP server не отвечает

```bash
# Проверить что MCP server запущен
curl http://localhost:3001/health

# Должно вернуть:
{"status":"ok","transports":["stdio","sse","streamable-http"],"returnAs":"json"}
```

### Demo-agent не отвечает

```bash
# Проверить что demo-agent запущен
curl http://localhost:3002/api/health

# Должно вернуть:
{"status":"ok","timestamp":"...","agentReady":true}
```

### Endpoints не появляются

Проверить что в `.env` установлено:
```
SHOW_MCP_ENDPOINTS=true
```

Затем **перезапустить MCP server**.

### Permission denied ошибки

Windows может блокировать выполнение скриптов. Запустите PowerShell от администратора:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Следующие шаги

После успешного прохождения тестов:

1. Проанализируйте `wrong_requests.json`
2. Доработайте prompts в AgentManager
3. Добавьте few-shot примеры
4. Повторите тестирование
5. Отправьте результаты на платформу хакатона

## Контакты

Вопросы и проблемы: GitHub Issues
