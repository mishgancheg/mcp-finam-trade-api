# MCP Server Tests

Тесты MCP сервера для всех инструментов и ресурсов через разные транспорты.

## Файлы

- **test-utils.js** - Общие утилиты для тестирования
- **http.js** - Тест Streamable HTTP транспорта (POST /mcp/v1)
- **sse.js** - Тест SSE транспорта (GET /sse)
- **stdio.js** - Тест STDIO транспорта

## Запуск

```bash
# HTTP транспорт
npm run test:mcp:http

# SSE транспорт
npm run test:mcp:sse

# STDIO транспорт
npm run test:mcp:stdio
```

Результаты сохраняются в `_test-data/mcp/{transport}/`
