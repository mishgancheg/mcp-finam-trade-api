/**
 * FINAM Trade API TypeScript Type Definitions
 * Based on official FINAM Trade API documentation
 * https://tradeapi.finam.ru/docs/guides/rest
 */

// ===================================
// Common Types and Enums
// ===================================

/**
 * Денежная величина с точностью
 */
export interface DecimalValue {
  value: string;
}

/**
 * Денежная сумма в виде целых и дробных единиц
 */
export interface MoneyValue {
  currency_code: string;
  units: string;
  nanos: number;
}

/**
 * Временная метка
 */
export interface Timestamp {
  year: number;
  month: number;
  day: number;
}

/**
 * Интервал времени
 */
export interface TimeInterval {
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
}

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
  ORDER_TYPE_LIMIT = 'ORDER_TYPE_LIMIT',
  ORDER_TYPE_MARKET = 'ORDER_TYPE_MARKET',
  ORDER_TYPE_STOP = 'ORDER_TYPE_STOP',
  ORDER_TYPE_STOP_LIMIT = 'ORDER_TYPE_STOP_LIMIT',
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
  ORDER_STATUS_UNSPECIFIED = 'ORDER_STATUS_UNSPECIFIED',
  ORDER_STATUS_NEW = 'ORDER_STATUS_NEW',
  ORDER_STATUS_PARTIALLY_FILLED = 'ORDER_STATUS_PARTIALLY_FILLED',
  ORDER_STATUS_FILLED = 'ORDER_STATUS_FILLED',
  ORDER_STATUS_CANCELED = 'ORDER_STATUS_CANCELED',
  ORDER_STATUS_REJECTED = 'ORDER_STATUS_REJECTED',
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
  TIME_FRAME_M1 = 'TIME_FRAME_M1',
  TIME_FRAME_M5 = 'TIME_FRAME_M5',
  TIME_FRAME_M15 = 'TIME_FRAME_M15',
  TIME_FRAME_M30 = 'TIME_FRAME_M30',
  TIME_FRAME_H1 = 'TIME_FRAME_H1',
  TIME_FRAME_H4 = 'TIME_FRAME_H4',
  TIME_FRAME_D = 'TIME_FRAME_D',
  TIME_FRAME_W = 'TIME_FRAME_W',
  TIME_FRAME_MN = 'TIME_FRAME_MN',
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

// ===================================
// Auth Service (Группа 1: Подключение)
// ===================================

/**
 * 1-1: Auth - Запрос на получение JWT токена
 */
export interface AuthRequest {
  secret: string; // API токен (secret key)
}

/**
 * 1-1: Auth - Ответ с JWT токеном
 */
export interface AuthResponse {
  token: string; // Полученный JWT-токен
}

/**
 * 1-2: TokenDetails - Запрос деталей токена
 */
export interface TokenDetailsRequest {
  token: string; // JWT-токен
}

/**
 * Информация о доступе к рыночным данным
 */
export interface MDPermission {
  quote_level: QuoteLevel;
  delay_minutes: number;
  mic?: string;
  country?: string;
  continent?: string;
  worldwide?: boolean;
}

/**
 * 1-2: TokenDetails - Ответ с деталями токена
 */
export interface TokenDetailsResponse {
  created_at: string; // ISO 8601
  expires_at: string; // ISO 8601
  md_permissions: MDPermission[];
  account_ids: string[];
  client_id: string;
  scopes: string[];
  readonly?: boolean;
}

// ===================================
// Accounts Service (Группа 2: Счета)
// ===================================

/**
 * Позиция по инструменту
 */
export interface Position {
  symbol: string;
  quantity: DecimalValue;
  average_price: DecimalValue;
  current_price: DecimalValue;
  daily_pnl: DecimalValue;
  unrealized_pnl: DecimalValue;
}

/**
 * Маржинальные требования портфеля
 */
export interface PortfolioMargin {
  available_cash: DecimalValue;
  initial_margin: DecimalValue;
  maintenance_margin: DecimalValue;
}

/**
 * 2-1: GetAccount - Ответ с информацией об аккаунте
 */
export interface GetAccountResponse {
  account_id: string;
  type: string; // AccountType as string
  status: string; // AccountStatus as string
  equity: DecimalValue;
  unrealized_profit: DecimalValue;
  positions: Position[];
  cash: MoneyValue[];
  portfolio_mc?: PortfolioMargin;
  balance?: DecimalValue;
  currency?: string;
}

/**
 * Информация о сделке
 */
export interface Trade {
  trade_id: string;
  symbol: string;
  price: DecimalValue;
  size: DecimalValue;
  side: Side | string;
  timestamp: string; // ISO 8601
  order_id: string;
  account_id: string;
}

/**
 * 2-2: Trades - Ответ со списком сделок
 */
export interface TradesResponse {
  trades: Trade[];
  total?: number;
}

/**
 * Информация о транзакции
 */
export interface Transaction {
  id: string;
  category: string; // TransactionCategory deprecated field
  timestamp: string; // ISO 8601
  symbol: string;
  change: MoneyValue;
  transaction_category: string; // TransactionCategory as string
  transaction_name: string;
}

/**
 * 2-3: Transactions - Ответ со списком транзакций
 */
export interface TransactionsResponse {
  transactions: Transaction[];
  total?: number;
}

// ===================================
// Assets Service (Группа 3: Инструменты)
// ===================================

/**
 * Информация об инструменте
 */
export interface Asset {
  symbol: string;
  id: string;
  ticker: string;
  mic: string;
  isin?: string;
  type: string; // AssetType as string
  name: string;
  board?: string;
  lot_size?: DecimalValue;
  decimals?: number;
  min_step?: string;
}

/**
 * 3-1: Assets - Ответ со списком инструментов
 */
export interface AssetsResponse {
  assets: Asset[];
  total?: number;
}

/**
 * 3-2: Clock - Ответ с временем сервера
 */
export interface ClockResponse {
  timestamp: string; // ISO 8601
  unix_time?: number;
}

/**
 * Информация о бирже
 */
export interface Exchange {
  mic: string;
  name: string;
}

/**
 * 3-3: Exchanges - Ответ со списком бирж
 */
export interface ExchangesResponse {
  exchanges: Exchange[];
}

/**
 * 3-4: GetAsset - Ответ с информацией об инструменте
 */
export interface GetAssetResponse extends Asset {
  exchange?: string;
  currency?: string;
}

/**
 * Доступность торговли
 */
export interface Availability {
  value: string;
  halted_days: number;
}

/**
 * 3-5: GetAssetParams - Ответ с торговыми параметрами инструмента
 */
export interface GetAssetParamsResponse {
  symbol: string;
  account_id: string;
  tradeable: boolean;
  longable: Availability;
  shortable: Availability;
  long_risk_rate?: DecimalValue;
  short_risk_rate?: DecimalValue;
  long_collateral?: MoneyValue;
  short_collateral?: MoneyValue;
  min_order_size?: DecimalValue;
  max_order_size?: DecimalValue;
  trading_status?: string;
}

/**
 * Информация об опционе
 */
export interface Option {
  symbol: string;
  type: string; // OptionType as string
  contract_size: DecimalValue;
  trade_last_day: Timestamp;
  strike: DecimalValue;
  expiration_first_day: Timestamp;
  expiration_last_day: Timestamp;
}

/**
 * 3-6: OptionsChain - Ответ с цепочкой опционов
 */
export interface OptionsChainResponse {
  symbol: string;
  options: Option[];
}

/**
 * Торговая сессия
 */
export interface Session {
  type: string; // SessionType as string
  interval: TimeInterval;
}

/**
 * 3-7: Schedule - Ответ с расписанием торгов
 */
export interface ScheduleResponse {
  symbol: string;
  sessions: Session[];
}

// ===================================
// Orders Service (Группа 4: Заявки)
// ===================================

/**
 * Leg заявки (для сложных ордеров)
 */
export interface OrderLeg {
  symbol: string;
  quantity: DecimalValue;
  side: Side | string;
}

/**
 * Детали заявки
 */
export interface OrderDetails {
  account_id: string;
  symbol: string;
  quantity: DecimalValue;
  side: Side | string;
  type: OrderType | string;
  time_in_force: TimeInForce | string;
  limit_price?: DecimalValue;
  stop_price?: DecimalValue;
  stop_condition: StopCondition | string;
  client_order_id: string;
  legs: OrderLeg[];
}

/**
 * Полная информация о заявке
 */
export interface OrderInfo {
  order_id: string;
  exec_id: string;
  status: OrderStatus | string;
  order: OrderDetails;
  transact_at: string; // ISO 8601
  filled_quantity?: DecimalValue;
  cancel_time?: string;
}

/**
 * 4-1: CancelOrder - Ответ на отмену заявки
 */
export interface CancelOrderResponse extends OrderInfo {}

/**
 * 4-2: GetOrder - Ответ с информацией о заявке
 */
export interface GetOrderResponse extends OrderInfo {}

/**
 * 4-3: GetOrders - Ответ со списком заявок
 */
export interface GetOrdersResponse {
  orders: OrderInfo[];
  total?: number;
}

/**
 * 4-4: PlaceOrder - Запрос на размещение заявки
 * Используем camelCase для полей запроса согласно API
 */
export interface PlaceOrderRequest {
  symbol: string;
  quantity: DecimalValue;
  side: Side | string;
  type: OrderType | string;
  time_in_force: TimeInForce | string;
  limit_price?: DecimalValue;
  stop_price?: DecimalValue;
  stop_condition?: StopCondition | string;

  legs?: OrderLeg[]; // VVQ
  client_order_id?: string;
}

/**
 * 4-4: PlaceOrder - Ответ на размещение заявки
 */
export interface PlaceOrderResponse extends OrderInfo {}

// ===================================
// Market Data Service (Группа 5: Рыночные данные)
// ===================================

/**
 * Бар (свеча)
 */
export interface Bar {
  timestamp: string; // ISO 8601
  open: DecimalValue;
  high: DecimalValue;
  low: DecimalValue;
  close: DecimalValue;
  volume: DecimalValue;
}

/**
 * 5-1: Bars - Ответ с барами
 */
export interface BarsResponse {
  symbol: string;
  bars: Bar[];
}

/**
 * Котировка
 */
export interface Quote {
  symbol: string;
  timestamp: string; // ISO 8601
  ask: DecimalValue;
  ask_size: DecimalValue;
  bid: DecimalValue;
  bid_size: DecimalValue;
  last: DecimalValue;
  last_size: DecimalValue;
  volume: DecimalValue;
  turnover: DecimalValue;
  open: DecimalValue;
  high: DecimalValue;
  low: DecimalValue;
  close: DecimalValue;
  change: DecimalValue;
}

/**
 * 5-2: LastQuote - Ответ с последней котировкой
 */
export interface LastQuoteResponse {
  symbol: string;
  quote: Quote;
  bid?: DecimalValue; // Legacy field
  ask?: DecimalValue; // Legacy field
  last_price?: DecimalValue; // Legacy field
  volume?: DecimalValue; // Legacy field
}

/**
 * Последняя сделка
 */
export interface LatestTrade {
  trade_id: string;
  mpid: string;
  timestamp: string; // ISO 8601
  price: DecimalValue;
  size: DecimalValue;
  side: Side | string;
}

/**
 * 5-3: LatestTrades - Ответ с последними сделками
 */
export interface LatestTradesResponse {
  symbol: string;
  trades: LatestTrade[];
}

/**
 * Строка стакана
 */
export interface OrderBookRow {
  price: DecimalValue;
  buy_size?: DecimalValue;
  sell_size?: DecimalValue;
  action: OrderBookAction | string;
  mpid: string;
  timestamp: string; // ISO 8601
}

/**
 * Стакан заявок
 */
export interface OrderBook {
  rows: OrderBookRow[];
}

/**
 * 5-4: OrderBook - Ответ со стаканом
 */
export interface OrderBookResponse {
  symbol: string;
  orderbook: OrderBook;
}

// ===================================
// Query Parameters Types
// ===================================

/**
 * Параметры запроса для методов с интервалом времени
 */
export interface TimeIntervalQueryParams {
  'interval.start_time': string; // ISO 8601
  'interval.end_time': string; // ISO 8601
}

/**
 * Параметры запроса для методов с таймфреймом
 */
export interface TimeFrameQueryParams extends TimeIntervalQueryParams {
  timeframe: TimeFrame | string;
}

/**
 * Параметры запроса для методов с account_id
 */
export interface AccountQueryParams {
  account_id: string;
}

// ===================================
// Path Parameters Types
// ===================================

/**
 * Параметры пути для методов с account_id
 */
export interface AccountPathParams {
  account_id: string;
}

/**
 * Параметры пути для методов с order_id
 */
export interface OrderPathParams extends AccountPathParams {
  order_id: string;
}

/**
 * Параметры пути для методов с symbol
 */
export interface SymbolPathParams {
  symbol: string;
}

// ===================================
// API Endpoints Mapping
// ===================================

/**
 * Полное описание эндпоинта API
 */
export interface ApiEndpoint<TRequest = void, TResponse = void, TPathParams = void, TQueryParams = void> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  request?: TRequest;
  response: TResponse;
  pathParams?: TPathParams;
  queryParams?: TQueryParams;
}

/**
 * Карта всех эндпоинтов API
 */
export interface ApiEndpointsMap {
  // Auth Service
  '1-1': ApiEndpoint<AuthRequest, AuthResponse>;
  '1-2': ApiEndpoint<TokenDetailsRequest, TokenDetailsResponse>;

  // Accounts Service
  '2-1': ApiEndpoint<void, GetAccountResponse, AccountPathParams>;
  '2-2': ApiEndpoint<void, TradesResponse, AccountPathParams, TimeIntervalQueryParams>;
  '2-3': ApiEndpoint<void, TransactionsResponse, AccountPathParams, TimeIntervalQueryParams>;

  // Assets Service
  '3-1': ApiEndpoint<void, AssetsResponse>;
  '3-2': ApiEndpoint<void, ClockResponse>;
  '3-3': ApiEndpoint<void, ExchangesResponse>;
  '3-4': ApiEndpoint<void, GetAssetResponse, SymbolPathParams, AccountQueryParams>;
  '3-5': ApiEndpoint<void, GetAssetParamsResponse, SymbolPathParams, AccountQueryParams>;
  '3-6': ApiEndpoint<void, OptionsChainResponse, SymbolPathParams>;
  '3-7': ApiEndpoint<void, ScheduleResponse, SymbolPathParams>;

  // Orders Service
  '4-1': ApiEndpoint<void, CancelOrderResponse, OrderPathParams>;
  '4-2': ApiEndpoint<void, GetOrderResponse, OrderPathParams>;
  '4-3': ApiEndpoint<void, GetOrdersResponse, AccountPathParams>;
  '4-4': ApiEndpoint<PlaceOrderRequest, PlaceOrderResponse, AccountPathParams>;

  // Market Data Service
  '5-1': ApiEndpoint<void, BarsResponse, SymbolPathParams, TimeFrameQueryParams>;
  '5-2': ApiEndpoint<void, LastQuoteResponse, SymbolPathParams>;
  '5-3': ApiEndpoint<void, LatestTradesResponse, SymbolPathParams>;
  '5-4': ApiEndpoint<void, OrderBookResponse, SymbolPathParams>;
}
