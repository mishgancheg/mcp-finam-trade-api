# Instrument Search Tests

Тесты для инструмента поиска `SearchInstruments` MCP сервера через разные транспорты.

## Файлы

- **test-cases.js** - Общие тестовые кейсы для всех транспортов
- **test-search-direct.js** - Прямой вызов API без MCP
- **test-search-http.js** - Тест через HTTP транспорт
- **test-search-stdio.js** - Тест через STDIO транспорт

## Запуск

```bash
# HTTP транспорт (сервер должен быть запущен)
npm run mcp:http  # в одном терминале
node test/search/test-search-http.js  # в другом

# STDIO транспорт
node test/search/test-search-stdio.js

# Прямой вызов API
node test/search/test-search-direct.js
```

Результаты сохраняются в `_test-data/search/{transport}/`
