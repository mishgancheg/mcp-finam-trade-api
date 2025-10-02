# FINAM Trade API Emulator

Эмулятор FINAM Trade API для разработки и тестирования без реального API.

## Файлы

- **emulator.js** - Express сервер, эмулирующий все API эндпоинты

## Запуск

```bash
npm run emulator
```

Эмулятор запускается на порту из `.env` (EMULATOR_PORT, по умолчанию 3000).

**ВАЖНО**: После тестирования остановите эмулятор:
```bash
scripts\kill-emulator.bat
# или
scripts\kill-port.bat 3000
```
