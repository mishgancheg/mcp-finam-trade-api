/**
 * FINAM Trade API Runtime Enums
 * Real enum objects available at runtime (not just type declarations)
 */

/**
 * Сторона сделки
 */
export enum Side {
  SIDE_UNSPECIFIED = 'SIDE_UNSPECIFIED',
  SIDE_BUY = 'SIDE_BUY',
  SIDE_SELL = 'SIDE_SELL',
}

/**
 * Тип заявки
 */
export enum OrderType {
  ORDER_TYPE_UNSPECIFIED = 'ORDER_TYPE_UNSPECIFIED',
  ORDER_TYPE_LIMIT = 'ORDER_TYPE_LIMIT',// Лимитная
  ORDER_TYPE_MARKET = 'ORDER_TYPE_MARKET',// Рыночная
  ORDER_TYPE_STOP = 'ORDER_TYPE_STOP',// Стоп заявка рыночная
  ORDER_TYPE_STOP_LIMIT = 'ORDER_TYPE_STOP_LIMIT',// Стоп заявка лимитная
  ORDER_TYPE_MULTI_LEG = 'ORDER_TYPE_MULTI_LEG',// Мульти лег заявка
}

/**
 * Время жизни заявки
 */
export enum TimeInForce {
  TIME_IN_FORCE_UNSPECIFIED = 'TIME_IN_FORCE_UNSPECIFIED',
  TIME_IN_FORCE_DAY = 'TIME_IN_FORCE_DAY',
  TIME_IN_FORCE_GTC = 'TIME_IN_FORCE_GTC',
  TIME_IN_FORCE_IOC = 'TIME_IN_FORCE_IOC',
  TIME_IN_FORCE_FOK = 'TIME_IN_FORCE_FOK',
}

/**
 * Статус заявки
 */
export enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 'ORDER_STATUS_UNSPECIFIED', // Неопределенное значение
  ORDER_STATUS_NEW = 'ORDER_STATUS_NEW', // Новая заявка
  ORDER_STATUS_PARTIALLY_FILLED = 'ORDER_STATUS_PARTIALLY_FILLED', // Частично исполненная
  ORDER_STATUS_FILLED = 'ORDER_STATUS_FILLED', // Исполненная
  ORDER_STATUS_DONE_FOR_DAY = 'ORDER_STATUS_DONE_FOR_DAY', // Действует в течение дня
  ORDER_STATUS_CANCELED = 'ORDER_STATUS_CANCELED', // Отменена
  ORDER_STATUS_REPLACED = 'ORDER_STATUS_REPLACED', // Заменена на другую
  ORDER_STATUS_PENDING_CANCEL = 'ORDER_STATUS_PENDING_CANCEL', // Ожидает отмены
  ORDER_STATUS_REJECTED = 'ORDER_STATUS_REJECTED', // Отклонена
  ORDER_STATUS_SUSPENDED = 'ORDER_STATUS_SUSPENDED', // Приостановлена
  ORDER_STATUS_PENDING_NEW = 'ORDER_STATUS_PENDING_NEW', // В ожидании новой
  ORDER_STATUS_EXPIRED = 'ORDER_STATUS_EXPIRED', // Истекла
  ORDER_STATUS_FAILED = 'ORDER_STATUS_FAILED', // Ошибка
  ORDER_STATUS_FORWARDING = 'ORDER_STATUS_FORWARDING', // Пересылка
  ORDER_STATUS_WAIT = 'ORDER_STATUS_WAIT', // Ожидает
  ORDER_STATUS_DENIED_BY_BROKER = 'ORDER_STATUS_DENIED_BY_BROKER', // Отклонено брокером
  ORDER_STATUS_REJECTED_BY_EXCHANGE = 'ORDER_STATUS_REJECTED_BY_EXCHANGE', // Отклонено биржей
  ORDER_STATUS_WATCHING = 'ORDER_STATUS_WATCHING', // Наблюдение
  ORDER_STATUS_EXECUTED = 'ORDER_STATUS_EXECUTED', // Исполнена
  ORDER_STATUS_DISABLED = 'ORDER_STATUS_DISABLED', // Отключена
  ORDER_STATUS_LINK_WAIT = 'ORDER_STATUS_LINK_WAIT', // Ожидание ссылки
  ORDER_STATUS_SL_GUARD_TIME = 'ORDER_STATUS_SL_GUARD_TIME', // Защитное время SL
  ORDER_STATUS_SL_EXECUTED = 'ORDER_STATUS_SL_EXECUTED', // Исполнена по SL
  ORDER_STATUS_SL_FORWARDING = 'ORDER_STATUS_SL_FORWARDING', // Пересылка SL
  ORDER_STATUS_TP_GUARD_TIME = 'ORDER_STATUS_TP_GUARD_TIME', // Защитное время TP
  ORDER_STATUS_TP_EXECUTED = 'ORDER_STATUS_TP_EXECUTED', // Исполнена по TP
  ORDER_STATUS_TP_CORRECTION = 'ORDER_STATUS_TP_CORRECTION', // Коррекция TP
  ORDER_STATUS_TP_FORWARDING = 'ORDER_STATUS_TP_FORWARDING', // Пересылка TP
  ORDER_STATUS_TP_CORR_GUARD_TIME = 'ORDER_STATUS_TP_CORR_GUARD_TIME', // Коррекция TP в защитное время
}

/**
 * Условие стоп-заявки
 */
export enum StopCondition {
  STOP_CONDITION_UNSPECIFIED = 'STOP_CONDITION_UNSPECIFIED',
  STOP_CONDITION_MORE = 'STOP_CONDITION_MORE',
  STOP_CONDITION_LESS = 'STOP_CONDITION_LESS',
}

/**
 * Уровень котировок для рыночных данных
 */
export enum QuoteLevel {
  QUOTE_LEVEL_UNSPECIFIED = 'QUOTE_LEVEL_UNSPECIFIED',
  QUOTE_LEVEL_LAST_PRICE = 'QUOTE_LEVEL_LAST_PRICE',
  QUOTE_LEVEL_BEST_BID_OFFER = 'QUOTE_LEVEL_BEST_BID_OFFER',
  QUOTE_LEVEL_DEPTH_OF_MARKET = 'QUOTE_LEVEL_DEPTH_OF_MARKET',
  QUOTE_LEVEL_DEPTH_OF_BOOK = 'QUOTE_LEVEL_DEPTH_OF_BOOK',
  QUOTE_LEVEL_ACCESS_FORBIDDEN = 'QUOTE_LEVEL_ACCESS_FORBIDDEN',
}

/**
 * Тип аккаунта
 */
export enum AccountType {
  ACCOUNT_TYPE_UNSPECIFIED = 'ACCOUNT_TYPE_UNSPECIFIED',
  SIMPLE = 'SIMPLE',
  UNION = 'UNION',
  IIA = 'IIA',
}

/**
 * Статус аккаунта
 */
export enum AccountStatus {
  ACCOUNT_STATUS_UNSPECIFIED = 'ACCOUNT_STATUS_UNSPECIFIED',
  ACCOUNT_ACTIVE = 'ACCOUNT_ACTIVE',
  ACCOUNT_CLOSED = 'ACCOUNT_CLOSED',
}

/**
 * Тип инструмента
 */
export enum AssetType {
  TYPE_UNSPECIFIED = 'TYPE_UNSPECIFIED',
  EQUITIES = 'EQUITIES',
  FUTURES = 'FUTURES',
  OPTIONS = 'OPTIONS',
  BONDS = 'BONDS',
  CURRENCIES = 'CURRENCIES',
  INDICES = 'INDICES',
  ETF = 'ETF',
}

/**
 * Тип опциона
 */
export enum OptionType {
  TYPE_UNSPECIFIED = 'TYPE_UNSPECIFIED',
  TYPE_CALL = 'TYPE_CALL',
  TYPE_PUT = 'TYPE_PUT',
}

/**
 * Тип торговой сессии
 */
export enum SessionType {
  SESSION_TYPE_UNSPECIFIED = 'SESSION_TYPE_UNSPECIFIED',
  CLOSED = 'CLOSED',
  PRE_TRADING = 'PRE_TRADING',
  EARLY_TRADING = 'EARLY_TRADING',
  CORE_TRADING = 'CORE_TRADING',
  LATE_TRADING = 'LATE_TRADING',
  POST_TRADING = 'POST_TRADING',
}

/**
 * Временной интервал для баров
 */
export enum TimeFrame {
  TIME_FRAME_UNSPECIFIED = 'TIME_FRAME_UNSPECIFIED',
  TIME_FRAME_M1 = 'TIME_FRAME_M1',   // 1 минута. Глубина данных 7 дней.
  TIME_FRAME_M5 = 'TIME_FRAME_M5',   // 5 минут. Глубина данных 30 дней.
  TIME_FRAME_M15 = 'TIME_FRAME_M15', // 15 минут. Глубина данных 30 дней.
  TIME_FRAME_M30 = 'TIME_FRAME_M30', // 30 минут. Глубина данных 30 дней.
  TIME_FRAME_H1 = 'TIME_FRAME_H1',   // 1 час. Глубина данных 30 дней.
  TIME_FRAME_H2 = 'TIME_FRAME_H2',   // 2 часа. Глубина данных 30 дней.
  TIME_FRAME_H4 = 'TIME_FRAME_H4',   // 4 часа. Глубина данных 30 дней
  TIME_FRAME_H8 = 'TIME_FRAME_H8',   // 8 часов. Глубина данных 30 дней.
  TIME_FRAME_D = 'TIME_FRAME_D',     // День. Глубина данных 365 дней.
  TIME_FRAME_W = 'TIME_FRAME_W',     // Неделя. Глубина данных 365*5 дней.
  TIME_FRAME_MN = 'TIME_FRAME_MN',   // Месяц. Глубина данных 365*5 дней.
  TIME_FRAME_QR = 'TIME_FRAME_QR',   // Квартал. Глубина данных 365*5 дней.
}

/**
 * Категория транзакции
 */
export enum TransactionCategory {
  TRANSACTION_CATEGORY_UNSPECIFIED = 'TRANSACTION_CATEGORY_UNSPECIFIED',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  COMMISSION = 'COMMISSION',
  DIVIDEND = 'DIVIDEND',
  TRADE = 'TRADE',
  OTHER = 'OTHER',
}

/**
 * Действие в стакане
 */
export enum OrderBookAction {
  ACTION_UNSPECIFIED = 'ACTION_UNSPECIFIED',
  ACTION_ADD = 'ACTION_ADD',
  ACTION_UPDATE = 'ACTION_UPDATE',
  ACTION_DELETE = 'ACTION_DELETE',
}
