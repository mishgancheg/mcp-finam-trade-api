# Цель:
Написать тестер demo-agent на данных из `test.csv`

# Как работает:
Тестер берет фразы (question) из файла demo-agent/test/data/test.csv с таким содержанием:

```csv
uid;question
2ec2f3dc;Глубина рынка для RIZ5@RTSX.
1ebb3c68;Актуальная цена Роснефти.
```

Закидывает в API бэкенда фразы батчами по 50 штук, но кадый запрос со сдвигом в 500 мс.
Получает ответ от MCP в формате:
```json
{
  "jsonrpc": "2.0",
  "id": "tool-GetOrders",
  "result": {
    "content": [
      {
        "endpoints": ["GET;/v1/sessions", "POST;/v1/accounts/4566789/orders"],
        "type": "text",
        "text": "📝"
      }
    ]
  }
}
```

Достает оттуда "endpoints" и сохраняет в памяти
- uid
- type
- endpoints

По завершении 
1) сохраняет JSON результата в файл `_test-data/<timestamp>_result.json`
2) Из кадого массива endpoints берет только первый элемент
   и сохраняет файл CSV `_test-data/<timestamp>_submission.csv` в  формате
```csv
uid;type;request
2ec2f3dc;GET;/v1/sessions
1ebb3c68;GET;/v1/assets
```


## Что делает тест

1. Загружает вопросы из `demo-agent/test/data/test.csv`
2. Отправляет каждый вопрос в demo-agent через REST API (`/api/chat`)
3. Demo-agent использует Claude для понимания вопроса и вызывает соответствующие MCP tools
4. MCP Server возвращает результат + список вызванных API endpoints
5. Demo-agent извлекает `endpoints` из MCP ответа и сохраняет в памяти до конца теста
6. По завершении сохраняет файл CSV `_test-data/<timestamp>_submission.csv`



# Задача
Написать модуль тестировани в файле
demo-agent/test/test_demo_agent.js

