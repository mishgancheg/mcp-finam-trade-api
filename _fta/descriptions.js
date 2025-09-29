const _DESCRIPTIONS = [
  // ==========================================
  // Группа 1: Подключение (Authentication)
  // ==========================================
  {
    fullId: '1-1',
    group: 'Подключение',
    name: 'Auth',
    descr: `POST https://api.finam.ru/v1/sessions
Получение JWT токена из API токена

### Параметры запроса
secret: string - API токен (secret key)

### Параметры ответа
token: string – Полученный JWT-токен`,
  },
  {
    fullId: '1-2',
    group: 'Подключение',
    name: 'TokenDetails',
    descr: `POST https://api.finam.ru/v1/sessions/details
Получение информации о токене сессии

### Параметры запроса
token: string - JWT-токен

### Параметры ответа
created_at: string – Дата и время создания
expires_at: string – Дата и время экспирации
md_permissions: MDPermission (Array)– Информация о доступе к рыночным данным
quote_level: MDPermission.QuoteLevel – Уровень котировок
delay_minutes: number – Задержка в минутах
mic: string – Идентификатор биржи mic
country: string – Страна
continent: string – Континент
worldwide: bool – Весь мир
account_ids: string (Array)– Идентификаторы аккаунтов
readonly: bool – Сессия и торговые счета в токене будут помечены readonly`,
  },

  // ====================================
  // Группа 2: Счета (Accounts Service)
  // ====================================
  {
    fullId: '2-1',
    group: 'Счета',
    name: 'GetAccount',
    descr: `GET https://api.finam.ru/v1/accounts/{account_id}
Получение информации по конкретному аккаунту

### Параметры запроса
account_id: string - Идентификатор аккаунта

### Параметры ответа
account_id: string – Идентификатор аккаунта
type: string – Тип аккаунта
status: string – Статус аккаунта
equity: string – Доступные средства плюс стоимость открытых позиций
unrealized_profit: string – Нереализованная прибыль
positions: Position (Array)– Позиции. Открытые, плюс теоретические (по неисполненным активным заявкам)
symbol: string – Символ инструмента
quantity: string – Количество в шт., значение со знаком определяющее (long-short)
average_price: string – Средняя цена. Не заполняется для FORTS позиций
current_price: string – Текущая цена
maintenance_margin: string – Поддерживающее гарантийное обеспечение. Заполняется только для FORTS позиций
daily_pnl: string – Прибыль или убыток за текущий день (PnL). Не заполняется для FORTS позиций
unrealized_pnl: string – Суммарная нереализованная прибыль или убыток (PnL) текущей позиции
cash: google.type.Money (Array)– Сумма собственных денежных средств на счете, доступная для торговли. Не включает маржинальные средства.
portfolio_mc: MC – Общий тип для счетов Московской Биржи. Включает в себя как единые, так и моно счета.
available_cash: string – Сумма собственных денежных средств на счете, доступная для торговли. Включает маржинальные средства.
initial_margin: string – Начальная маржа
maintenance_margin: string – Минимальная маржа
portfolio_mct: MCT – Тип портфеля для счетов на американских рынках.
portfolio_forts: FORTS – Тип портфеля для торговли на срочном рынке Московской Биржи.
available_cash: string – Сумма собственных денежных средств на счете, доступная для торговли. Включает маржинальные средства.
money_reserved: string – Минимальная маржа (необходимая сумма обеспечения под открытые позици)`,
  },
  {
    fullId: '2-2',
    group: 'Счета',
    name: 'Trades',
    descr: `GET https://api.finam.ru/v1/accounts/{account_id}/trades
Получение истории по сделкам аккаунта

### Параметры запроса
account_id: string - Идентификатор аккаунта
limit: number - Лимит количества сделок
Interval: google.type.Interval - Начало и окончание запрашиваемого периода, Unix epoch time

### Параметры ответа
trades: grpc.tradeapi.v1.AccountTrade (Array)– Сделки по аккаунту`,
  },
  {
    fullId: '2-3',
    group: 'Счета',
    name: 'Transactions',
    descr: `GET https://api.finam.ru/v1/accounts/{account_id}/transactions
Получение списка транзакций аккаунта

### Параметры запроса
account_id: string - Идентификатор аккаунта
limit: number - Лимит количества транзакций
Interval: google.type.Interval - Начало и окончание запрашиваемого периода, Unix epoch time

### Параметры ответа
transactions: Transaction (Array)– Транзакции по аккаунту
id: string – Идентификатор транзакции
category: string – Тип транзакции из TransactionCategory
timestamp: string – Метка времени
symbol: string – Символ инструмента
change: google.type.Money – Изменение в деньгах
trade: Transaction.Trade – Информация о сделке
transaction_category: Transaction.TransactionCategory – Категория транзакции из TransactionCategory.
transaction_name: string – Наименование транзакции`,
  },

  // ==========================================
  // Группа 3: Инструменты (Assets Service)
  // ==========================================
  {
    fullId: '3-1',
    group: 'Инструменты',
    name: 'Assets',
    descr: `GET https://api.finam.ru/v1/assets
Получение списка доступных инструментов, их описание

### Параметры ответа
assets: Asset (Array)– Информация об инструменте
symbol: string – Символ инструмента ticker@mic
id: string – Идентификатор инструмента
ticker: string – Тикер инструмента
mic: string – mic идентификатор биржи
isin: string – Isin идентификатор инструмента
type: string – Тип инструмента
name: string – Наименование инструмента`,
  },
  {
    fullId: '3-2',
    group: 'Инструменты',
    name: 'Clock',
    descr: `GET https://api.finam.ru/v1/assets/clock
Получение времени на сервере

### Параметры ответа
timestamp: string – Метка времени`,
  },
  {
    fullId: '3-3',
    group: 'Инструменты',
    name: 'Exchanges',
    descr: `GET https://api.finam.ru/v1/exchanges
Получение списка доступных бирж, названия и mic коды

### Параметры ответа
exchanges: Exchange (Array)– Информация о бирже
mic: string – Идентификатор биржи mic
name: string – Наименование биржи`,
  },
  {
    fullId: '3-4',
    group: 'Инструменты',
    name: 'GetAsset',
    descr: `GET https://api.finam.ru/v1/assets/{symbol}
Получение информации по конкретному инструменту

### Параметры запроса
symbol: string - Символ инструмента
account_id: string - ID аккаунта для которого будет подбираться информация по инструменту

### Параметры ответа
board: string – Код режима торгов
id: string – Идентификатор инструмента
ticker: string – Тикер инструмента
mic: string – mic идентификатор биржи
isin: string – Isin идентификатор инструмента
type: string – Тип инструмента
name: string – Наименование инструмента
decimals: number – Кол-во десятичных знаков в цене
min_step: string – Минимальный шаг цены. Для расчета финального ценового шага: min_step/(10ˆdecimals)
lot_size: string – Кол-во штук в лоте
expiration_date: google.type.Date – Дата экспирации фьючерса`,
  },
  {
    fullId: '3-5',
    group: 'Инструменты',
    name: 'GetAssetParams',
    descr: `GET https://api.finam.ru/v1/assets/{symbol}/params
Получение торговых параметров по инструменту

### Параметры запроса
symbol: string - Символ инструмента
account_id: string - ID аккаунта для которого будут подбираться торговые параметры

### Параметры ответа
symbol: string – Символ инструмента
account_id: string – ID аккаунта для которого подбираются торговые параметры
tradeable: bool – Доступны ли торговые операции
longable: Longable – Доступны ли операции в Лонг
value: Longable.Status – Статус инструмента
halted_days: number – Сколько дней действует запрет на операции в Лонг (если есть)
shortable: Shortable – Доступны ли операции в Шорт
value: Shortable.Status – Статус инструмента
halted_days: number – Сколько дней действует запрет на операции в Шорт (если есть)
long_risk_rate: string – Ставка риска для операции в Лонг
long_collateral: google.type.Money – Сумма обеспечения для поддержания позиции Лонг
short_risk_rate: string – Ставка риска для операции в Шорт
short_collateral: google.type.Money – Сумма обеспечения для поддержания позиции Шорт`,
  },
  {
    fullId: '3-6',
    group: 'Инструменты',
    name: 'OptionsChain',
    descr: `GET https://api.finam.ru/v1/assets/{underlying_symbol}/options
Получение цепочки опционов для базового актива

### Параметры запроса
underlying_symbol: string - Символ базового актива опциона

### Параметры ответа
symbol: string – Символ базового актива опциона
options: Option (Array)– Информация об опционе
symbol: string – Символ инструмента
type: Option.Type – Тип инструмента
contract_size: string – Лот, количество базового актива в инструменте
trade_first_day: google.type.Date – Дата старта торговли
trade_last_day: google.type.Date – Дата окончания торговли
strike: string – Цена исполнения опциона
multiplier: string – Множитель опциона
expiration_first_day: google.type.Date – Дата начала экспирации
expiration_last_day: google.type.Date – Дата окончания экспирации`,
  },
  {
    fullId: '3-7',
    group: 'Инструменты',
    name: 'Schedule',
    descr: `GET https://api.finam.ru/v1/assets/{symbol}/schedule
Получение расписания торгов для инструмента

### Параметры запроса
symbol: string - Символ инструмента

### Параметры ответа
symbol: string – Символ инструмента
sessions: ScheduleResponse.Sessions (Array)– Сессии инструмента
type: string – Тип сессии
interval: google.type.Interval – Интервал сессии`,
  },

  // =====================================
  // Группа 4: Заявки (Orders Service)
  // =====================================
  {
    fullId: '4-1',
    group: 'Заявки',
    name: 'CancelOrder',
    descr: `DELETE https://api.finam.ru/v1/accounts/{account_id}/orders/{order_id}
Отмена биржевой заявки

### Параметры запроса
account_id: string - Идентификатор аккаунта
order_id: string - Идентификатор заявки

### Параметры ответа
order_id: string – Идентификатор заявки
exec_id: string – Идентификатор исполнения
status: OrderStatus – Статус заявки
order: Order – Заявка
account_id: string – Идентификатор аккаунта
symbol: string – Символ инструмента
quantity: string – Количество в шт.
side: grpc.tradeapi.v1.Side – Сторона (long или short)
type: OrderType – Тип заявки
time_in_force: TimeInForce – Срок действия заявки
limit_price: string – Необходимо для лимитной и стоп лимитной заявки
stop_price: string – Необходимо для стоп рыночной и стоп лимитной заявки
stop_condition: StopCondition – Необходимо для стоп рыночной и стоп лимитной заявки
legs: Leg (Array)– Необходимо для мульти лег заявки
client_order_id: string – Уникальный идентификатор заявки. Автоматически генерируется, если не отправлен. (максимум 20 символов)
transact_at: string – Дата и время выставления заявки
accept_at: string – Дата и время принятия заявки
withdraw_at: string – Дата и время отмены заявки`,
  },
  {
    fullId: '4-2',
    group: 'Заявки',
    name: 'GetOrder',
    descr: `GET https://api.finam.ru/v1/accounts/{account_id}/orders/{order_id}
Получение информации о конкретном ордере

### Параметры запроса
account_id: string - Идентификатор аккаунта
order_id: string - Идентификатор заявки

### Параметры ответа
order_id: string – Идентификатор заявки
exec_id: string – Идентификатор исполнения
status: OrderStatus – Статус заявки
order: Order – Заявка
account_id: string – Идентификатор аккаунта
symbol: string – Символ инструмента
quantity: string – Количество в шт.
side: grpc.tradeapi.v1.Side – Сторона (long или short)
type: OrderType – Тип заявки
time_in_force: TimeInForce – Срок действия заявки
limit_price: string – Необходимо для лимитной и стоп лимитной заявки
stop_price: string – Необходимо для стоп рыночной и стоп лимитной заявки
stop_condition: StopCondition – Необходимо для стоп рыночной и стоп лимитной заявки
legs: Leg (Array)– Необходимо для мульти лег заявки
client_order_id: string – Уникальный идентификатор заявки. Автоматически генерируется, если не отправлен. (максимум 20 символов)
transact_at: string – Дата и время выставления заявки
accept_at: string – Дата и время принятия заявки
withdraw_at: string – Дата и время отмены заявки`,
  },
  {
    fullId: '4-3',
    group: 'Заявки',
    name: 'GetOrders',
    descr: `GET https://api.finam.ru/v1/accounts/{account_id}/orders
Получение списка заявок для аккаунта

### Параметры запроса
account_id: string - Идентификатор аккаунта

### Параметры ответа
orders: OrderState (Array)– Заявки
order_id: string – Идентификатор заявки
exec_id: string – Идентификатор исполнения
status: OrderStatus – Статус заявки
order: Order – Заявка
transact_at: string – Дата и время выставления заявки
accept_at: string – Дата и время принятия заявки
withdraw_at: string – Дата и время отмены заявки`,
  },
  {
    fullId: '4-4',
    group: 'Заявки',
    name: 'PlaceOrder',
    descr: `POST https://api.finam.ru/v1/accounts/{account_id}/orders
Выставление биржевой заявки

### Параметры запроса
account_id: string - Идентификатор аккаунта
symbol: string - Символ инструмента
quantity: string - Количество в шт.
side: grpc.tradeapi.v1.Side - Сторона (long или short)
type: OrderType - Тип заявки
time_in_force: TimeInForce - Срок действия заявки
limit_price: string - Необходимо для лимитной и стоп лимитной заявки
stop_price: string - Необходимо для стоп рыночной и стоп лимитной заявки
stop_condition: StopCondition - Необходимо для стоп рыночной и стоп лимитной заявки
legs: Leg (Array) - Необходимо для мульти лег заявки
client_order_id: string - Уникальный идентификатор заявки. Автоматически генерируется, если не отправлен. (максимум 20 символов)

### Параметры ответа
order_id: string – Идентификатор заявки
exec_id: string – Идентификатор исполнения
status: OrderStatus – Статус заявки
order: Order – Заявка
account_id: string – Идентификатор аккаунта
symbol: string – Символ инструмента
quantity: string – Количество в шт.
side: grpc.tradeapi.v1.Side – Сторона (long или short)
type: OrderType – Тип заявки
time_in_force: TimeInForce – Срок действия заявки
limit_price: string – Необходимо для лимитной и стоп лимитной заявки
stop_price: string – Необходимо для стоп рыночной и стоп лимитной заявки
stop_condition: StopCondition – Необходимо для стоп рыночной и стоп лимитной заявки
legs: Leg (Array)– Необходимо для мульти лег заявки
client_order_id: string – Уникальный идентификатор заявки. Автоматически генерируется, если не отправлен. (максимум 20 символов)
transact_at: string – Дата и время выставления заявки
accept_at: string – Дата и время принятия заявки
withdraw_at: string – Дата и время отмены заявки`,
  },

  // =============================================
  // Группа 5: Рыночные данные (Market Data Service)
  // =============================================
  {
    fullId: '5-1',
    group: 'Рыночные данные',
    name: 'Bars',
    descr: `GET https://api.finam.ru/v1/instruments/{symbol}/bars
Получение исторических данных по инструменту (агрегированные свечи)

### Параметры запроса
symbol: string - Символ инструмента
timeframe: TimeFrame - Необходимый таймфрейм
Interval: google.type.Interval - Начало и окончание запрашиваемого периода

### Параметры ответа
symbol: string – Символ инструмента
bars: Bar (Array)– Агрегированная свеча
timestamp: string – Метка времени
open: string – Цена открытия свечи
high: string – Максимальная цена свечи
low: string – Минимальная цена свечи
close: string – Цена закрытия свечи
volume: string – Объём торгов за свечу в шт.`,
  },
  {
    fullId: '5-2',
    group: 'Рыночные данные',
    name: 'LastQuote',
    descr: `GET https://api.finam.ru/v1/instruments/{symbol}/quotes/latest
Получение последней котировки по инструменту

### Параметры запроса
symbol: string - Символ инструмента

### Параметры ответа
symbol: string – Символ инструмента
quote: Quote – Цена последней сделки
symbol: string – Символ инструмента
timestamp: string – Метка времени
ask: string – Аск. 0 при отсутствии активного аска
ask_size: string – Размер аска
bid: string – Бид. 0 при отсутствии активного бида
bid_size: string – Размер бида
last: string – Цена последней сделки
last_size: string – Размер последней сделки
volume: string – Дневной объем сделок
turnover: string – Дневной оборот сделок
open: string – Цена открытия. Дневная
high: string – Максимальная цена. Дневная
low: string – Минимальная цена. Дневная
close: string – Цена закрытия. Дневная
change: string – Изменение цены (last минус close)
option: Quote.Option – Информация об опционе`,
  },
  {
    fullId: '5-3',
    group: 'Рыночные данные',
    name: 'LatestTrades',
    descr: `GET https://api.finam.ru/v1/instruments/{symbol}/trades/latest
Получение списка последних сделок по инструменту

### Параметры запроса
symbol: string - Символ инструмента

### Параметры ответа
symbol: string – Символ инструмента
trades: Trade (Array)– Список последних сделок
trade_id: string – Идентификатор сделки, отправленный биржей
mpid: string – Идентификатор участника рынка
timestamp: string – Метка времени
price: string – Цена сделки
size: string – Размер сделки
side: grpc.tradeapi.v1.Side – Сторона сделки (buy или sell)`,
  },
  {
    fullId: '5-4',
    group: 'Рыночные данные',
    name: 'OrderBook',
    descr: `GET https://api.finam.ru/v1/instruments/{symbol}/orderbook
Получение текущего стакана по инструменту

### Параметры запроса
symbol: string - Символ инструмента

### Параметры ответа
symbol: string – Символ инструмента
orderbook: OrderBook – Стакан
rows: OrderBook.Row (Array)– Уровни стакана`,
  },
];
