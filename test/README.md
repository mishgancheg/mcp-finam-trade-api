# Test Utilities

Основные тестовые утилиты для API и функций-оберток.

## Файлы

- **instruments-fetch.js** - Получение данных по списку инструментов с JWT-аутентификацией
- **tester-api.js** - Тестирование функций-оберток из `dist/src/api.js`
- **tester-endpoints.js** - Прямое тестирование API эндпоинтов с заменой плейсхолдеров

## Запуск

```bash
# Получить данные по инструментам
node test/instruments-fetch.js

# Тест функций-оберток API
node test/tester-api.js

# Тест эндпоинтов напрямую
node test/tester-endpoints.js

# Тест выбранных эндпоинтов
node test/tester-endpoints.js Assets,GetAsset
```

Результаты для `tester-endpoints.js` сохраняются в `_test-data/{fullId}.md`
