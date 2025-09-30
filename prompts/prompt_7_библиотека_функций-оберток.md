# Задача
Напиши библиотеку функциий, которые: 
  - будут обертками для всех эндпоинтов API
  - будут готовы к бесшовному использованию в MCP сервере как MCP тулы в дальнейшем.
  
- функциии должны получать объект с параметрами (чтобы нативно вызываться из соответствующих MCP инструментов)
- Все функции будут вызывать FINAM Trade API. Поэтому все они должны получать параметр secret_token.
- Используй кешируемый модуль получения JWT token: src/lib/jwt-auth.ts.
- Библиотеку функций размести в файл src/api.ts
- используй HTTP/2 и npm пакет got. Смотри, как это организовано в test/tester-endpoints.js
- Для организации правильного форматирования ответов функций опирайся на описания типов в src/meta/finam-trade-api-interfaces.d.ts

Ответ функций:
Функции должны возвращать ответ в стандартном виде или выбрасывать исключение в случае ошибки
```javascript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const result = await someOperation();

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : String(error)
    );
  }
});
``` 

- Если эндпоинт возвращает JSON с ошибкой типа:
```json
{
  "code": 3,
  "message": "<message>",
  "details": []
}
```
То должно выбрасываться исключение 

```javascript
    throw new McpError(
      ErrorCode.InternalError, "<message>"
    );
```

- Имена функций-оберток долны быть равны именам эндпоинтов 
