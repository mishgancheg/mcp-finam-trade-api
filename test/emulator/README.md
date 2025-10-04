# OMS Emulator - Quick Start Guide

## Запуск эмулятора

```bash
# Запустить OMS эмулятор
npm run emulator:oms

# Проверить работоспособность (в другом терминале)
npm run emulator:check

# Остановить эмулятор
node scripts kill-emulator.js
```

## Основные возможности

OMS эмулятор включает все расширенные функции:

1. **💾 Persistent State** - Автосохранение состояния в JSON (`_state/emulator-state.json`)
2. **🔧 Admin Endpoints** - Управляющие endpoint'ы:
   - `POST /admin/reset` - Сброс состояния
   - `POST /admin/save` - Ручное сохранение
   - `GET /admin/status` - Статус эмулятора
3. **⏰ Price Ticker** - Автообновление котировок каждые 5 секунд
4. **⚡ Auto-Execute** - Автоматическое исполнение LIMIT/STOP ордеров при достижении цены
5. **📡 WebSocket** - Потоковая трансляция событий на `ws://localhost:3001`

## Основные endpoints

**Base URL:** `http://localhost:3000`

### Аутентификация
```bash
POST /v1/sessions
Body: {"secret": "your-secret-token-here"}
→ Возвращает JWT токен
```

### Информация об аккаунте
```bash
GET /v1/accounts/1982834
Headers: Authorization: test-token
→ Возвращает equity, позиции, P&L, cash
```

### История сделок
```bash
GET /v1/accounts/1982834/trades
Headers: Authorization: test-token
→ Возвращает все сделки (38 штук)
```

### Транзакции
```bash
GET /v1/accounts/1982834/transactions
Headers: Authorization: test-token
→ Возвращает все транзакции (80 штук)
```

### Размещение ордера
```bash
POST /v1/accounts/1982834/orders
Headers:
  Authorization: test-token
  Content-Type: application/json
Body:
{
  "symbol": "SBER@MISX",
  "quantity": {"value": "10"},
  "side": "SIDE_BUY",
  "type": "ORDER_TYPE_MARKET",
  "time_in_force": "TIME_IN_FORCE_DAY"
}
→ Ордер сразу исполняется, обновляется портфель
```

### Исторические данные
```bash
GET /v1/instruments/SBER@MISX/bars?interval.start_time=2025-01-01T00:00:00Z
Headers: Authorization: test-token
→ Возвращает 365 дней баров
```

### Текущая котировка
```bash
GET /v1/instruments/SBER@MISX/quotes/latest
Headers: Authorization: test-token
→ Возвращает bid, ask, last, volume
```

### Стакан
```bash
GET /v1/instruments/SBER@MISX/orderbook
Headers: Authorization: test-token
→ Возвращает 10 уровней bid/ask
```

## Тестирование через Node.js

```javascript
// Получить аккаунт
const account = await fetch('http://localhost:3000/v1/accounts/1982834', {
  headers: { 'Authorization': 'test' }
}).then(r => r.json());

console.log('Equity:', account.equity.value);
console.log('Positions:', account.positions.length);

// Разместить ордер
const order = await fetch('http://localhost:3000/v1/accounts/1982834/orders', {
  method: 'POST',
  headers: {
    'Authorization': 'test',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    symbol: 'SBER@MISX',
    quantity: { value: '10' },
    side: 'SIDE_BUY',
    type: 'ORDER_TYPE_MARKET',
    time_in_force: 'TIME_IN_FORCE_DAY'
  })
}).then(r => r.json());

console.log('Order status:', order.status); // ORDER_STATUS_FILLED
```

## Что есть в эмулятore

### 📊 Данные
- **8 инструментов**: SBER, GAZP, YNDX, LKOH, VTBR, MGNT, ROSN, AFLT
- **365 дней** исторических баров для каждого
- **3 месяца** торговой истории (20-40 сделок)
- **Реалистичное состояние**:
  - Equity: ~200K ₽
  - Cash: ~260K ₽
  - Positions: 7 открытых позиций
  - Trades: 38 сделок
  - Transactions: 80 транзакций

### ⚙️ Функциональность
- ✅ Размещение ордеров (MARKET, LIMIT, STOP)
- ✅ Исполнение с комиссией 0.05%
- ✅ Обновление позиций (FIFO)
- ✅ Расчет P&L (realized + unrealized)
- ✅ История транзакций
- ✅ Исторические данные
- ✅ Текущие котировки
- ✅ Стакан заявок

## Проверка работоспособности

```bash
# Запустить полную проверку
npm run emulator:check
```

**Ожидаемый результат:**
```
✅ Account loaded
✅ Has positions
✅ Has trades
✅ Has transactions
✅ Has instruments
✅ Has historical bars
✅ Market data available
✅ Order book available
✅ Equity matches calculation

🎉 Overall: 9/9 checks passed
✅ OMS Emulator is fully functional!
```

## Документация

- **README-OMS.md** - Полная документация
- **VERIFICATION_REPORT.md** - Отчет о тестировании
- **IMPLEMENTATION_SUMMARY_OMS.md** - Описание реализации

## Troubleshooting

### Порт 3000 и 3006 занят
```bash
node scripts kill-emulator.js

# Или вручную
netstat -ano | findstr :3000
taskkill /F /PID <PID>
```

### Сбросить состояние аккаунта
Просто перезапустить эмулятор - генерируются новые seed data.

## Использование с demo-agent

Эмулятор полностью поддерживает все 5 пользовательских кейсов:

1. **Портфельный аналитик** - GetAccount, Trades, Bars
2. **Рыночный сканер** - Assets, Bars, LastQuote
3. **Бэктест стратегии** - Bars (365 дней)
4. **Размещение заявки** - PlaceOrder (реальное исполнение)
5. **Анализ инструмента** - GetAsset, Bars, OrderBook, LatestTrades

Готов к интеграции! 🚀

## WebSocket Streaming

**Подключение:**
```javascript
import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:3001');

ws.on('message', (data) => {
  const event = JSON.parse(data.toString());
  console.log('Event:', event);
});
```

**Типы событий:**
- `system.connected` - Подключение установлено
- `market_data.price_update` - Обновление котировок (каждые 5с)
- `order.placed` - Размещен новый ордер
- `order.executed` - Ордер исполнен
- `order.canceled` - Ордер отменен
- `system.reset` - Состояние сброшено

## Admin API

### Статус эмулятора
```bash
GET http://localhost:3000/admin/status
```
Возвращает: uptime, clients, data counts, state file info

### Сохранить состояние
```bash
POST http://localhost:3000/admin/save
```

### Сбросить состояние
```bash
POST http://localhost:3000/admin/reset
```
Сбрасывает все данные и генерирует новое случайное состояние
