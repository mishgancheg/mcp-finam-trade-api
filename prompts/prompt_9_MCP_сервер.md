# Задача 

Написать MCP-сервер с обертками - тулами для всех эндпоинтов API

- Для тулов подготовлены функции-обертки в src/api.ts

- MCP серер должен уметь работать по транспортам STDIO, SSE, Streamable HTTP, 
  Смотри пример в prompts/prompt_9_MCP_пример_с_тремя_транспортами.md

- Для Работы MCP сервера должны передаваться secret_token и account_id
    При работе по транспорту stdio они должны передаваться как переменные окружения
    API_SECRET_TOKEN и ACCOUNT_ID соответственно 
    
    При работе по транспортам HTTP они должны передаваться в HTTP заголовках
    Authorization: Bearer <secret_token>
    X-Finam-Account-Id: <account-id>

  Надо запараметризировать description тех тулов, что используют параметр account_id чтобы было так:
    properties: {
      account_id: { type: 'string', description: 'Account ID (optional. Default ${account_id})' },
    },

  Смотри идею в prompts/зкщьзе_9_MCP_пример_паармтеризации_account_id.md


- В зависимости от режима работы RETURN_AS = json | string (RETURN_AS - переменная окружения, заданная в .env. По умолчанию - json)
  тулы должны возвращать либо ответ функций как есть, либо формировать  строку. 
  Ответы в виде строк нужны когда предполагается передавать их в LLM для использования в агенткой системе.
  Примеры форматирования в виде возьми из _tmp/api.ts

## Особенности эндпоинтов

### 3-1 Assets
В режиме `json` удаляй из объектов свойство mic
и выдавай не более 1000 первых элементов
В режиме `string` выдавай в виде csv с заголовком:
```csv
symbol,id,ticker,isin,type,name
WSO@RUSX,571681,WSO,US9426222009,EQUITIES,"Watsco, Inc."
```
Значение name заключай в кавычки

Не более 2000 записей.

### 5-3 LatestTrades
Не боле 100 в любом режиме.

## Особенности использования параметров secret_token и account_id

### В случае транспорта STDIO
В этом случае `secret_token` передается через аргумент командной строки --secret-token `API_SECRET_TOKEN`
