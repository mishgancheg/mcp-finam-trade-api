# Цель: протащить в ответ MCP сведения о вызванных эндпоинтах. Исполнять в том сдучае, если в .env SHOW_MCP_ENDPOINTS = true
как без переменной:
```json
{
  "jsonrpc": "2.0",
  "id": "tool-GetOrders",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "📝"
      }
    ]
  }
}
```

так с переменной окружения  SHOW_MCP_ENDPOINTS = true
```json
{
  "jsonrpc": "2.0",
  "id": "tool-GetOrders",
  "result": {
    "content": [
      {
        "endpoints": ["/v1/sessions"],
        "type": "text",
        "text": "📝"
      }
    ]
  }
}
```

Прежде чем выполнять, напиши что будешь делать
--------------------------------------------------------------------------------

Посмотри в test/finam-trade-api-registry.js и добавь в src/mcp/tool-endpoints.ts
в строки с эндпоинтами соответствующие методы.
Например:
Auth: ['/v1/sessions'] -> Auth: ['POST;/v1/sessions']
TokenDetails: ['/v1/sessions/details'] -> TokenDetails: ['POST;/v1/sessions/details']
