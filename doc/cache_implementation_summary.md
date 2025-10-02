# Кэширование инструментов - Реализация

## Реализованная функциональность

### 1. Disk Caching
✅ Кеширование в `assets_data.json` в корне проекта
✅ Формат: `{timestamp: number, assets: Asset[]}`
✅ Автоматическое создание при первом запросе к API

### 2. STDIO Transport (каждый запуск - новый процесс)
✅ При старте проверяет наличие кеша на диске
✅ Если кеш свежий (<4 часа) → загружает с диска
✅ Если кеш старый (>4 часа) → обновляет через API → сохраняет на диск
✅ Если кеша нет → загружает через API → сохраняет на диск

### 3. HTTP/SSE Transport (долгоживущий процесс)
✅ При старте сервера загружает кеш (с диска или API)
✅ Хранит данные в памяти для быстрого доступа
✅ Автоматически обновляет каждые 4 часа через setInterval
✅ Обновление: API → сохранение на диск → перестройка индексов в памяти

## Технические детали

### Файлы
- **src/services/instrument-search.ts**: Основная логика кэширования
- **assets_data.json**: Файл кеша в корне проекта (добавлен в .gitignore)

### Ключевые методы
- `loadFromDisk()`: Загрузка кеша с диска
- `saveToDisk(assets)`: Сохранение кеша на диск с текущим timestamp
- `isCacheStale(timestamp)`: Проверка возраста кеша (> 4 часов)
- `startCacheRefresh()`: Запуск таймера обновления для HTTP transport
- `stopCacheRefresh()`: Остановка таймера

### Константы
- `CACHE_FILE_PATH`: `<project-root>/assets_data.json`
- `CACHE_MAX_AGE`: 4 часа (14400000 мс)

## Тестирование

### Сценарий 1: Нет кеша
```bash
# Удалить кеш
rm assets_data.json

# Запустить тест
node test/search/test-cache-loading.js

# Ожидаемый вывод:
# 📥 No disk cache found, fetching from API...
# ☑️ Fetched X instruments from API
# 💾 Saved X instruments to disk cache
```

### Сценарий 2: Свежий кеш (< 4 часов)
```bash
# Второй запуск после создания кеша
node test/search/test-cache-loading.js

# Ожидаемый вывод:
# 📂 Loaded X instruments from disk cache
```

### Сценарий 3: Устаревший кеш (> 4 часов)
```bash
# Тест со старым кешем
node test/search/test-isolated-stale.js

# Ожидаемый вывод:
# ⏰ Disk cache is stale (>4 hours), refreshing...
# ☑️ Fetched X instruments from API
# 💾 Saved X instruments to disk cache
```

## Производительность

### STDIO Transport
- **Первый запуск**: Загрузка из API (~2-5 сек)
- **Последующие запуски**: Загрузка с диска (~50-200 мс)
- **Устаревший кеш**: Автоматическое обновление

### HTTP/SSE Transport
- **Запуск сервера**: Загрузка один раз в память
- **Поиск инструментов**: < 1 мс (индексы в памяти)
- **Фоновое обновление**: Каждые 4 часа автоматически

## Соответствие спецификации

✅ Кеширование в памяти (HTTP/SSE)
✅ Кеширование на диск (assets_data.json)
✅ STDIO: проверка при каждом запуске
✅ HTTP/SSE: загрузка один раз + обновление каждые 4 часа
✅ Метка времени обновления в файле
✅ Автоматическое обновление при устаревании (> 4 часов)

## Использование

### STDIO
```bash
npm run mcp  # Автоматическое управление кешем
```

### HTTP/SSE
```bash
npm run mcp:http  # Кеш в памяти + периодическое обновление
```

### Тесты
```bash
npm run test:search:direct     # Прямое тестирование
node test/search/test-cache-loading.js  # Загрузка кеша
node test/search/test-isolated-stale.js # Устаревший кеш
```
