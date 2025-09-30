// noinspection UnnecessaryLocalVariableJS

/**
 * FINAM Trade API Wrapper Library
 *
 * This library provides wrapper functions for all FINAM Trade API endpoints.
 * All functions:
 * - Accept parameter objects for MCP tool compatibility
 * - Return raw JSON responses from API
 * - Handle JWT authentication automatically
 * - Support both real API and emulator modes
 * - Use HTTP/2 with got for optimal performance
 * - Return MCP-compliant error format on failures
 */

import got from 'got';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getJwtToken } from './lib/jwt-auth.js';
import {
  AuthResponse,
  TokenDetailsResponse,
  GetAccountResponse,
  TradesResponse,
  TransactionsResponse,
  AssetsResponse,
  ClockResponse,
  ExchangesResponse,
  GetAssetResponse,
  GetAssetParamsResponse,
  OptionsChainResponse,
  ScheduleResponse,
  PlaceOrderResponse,
  CancelOrderResponse,
  GetOrdersResponse,
  GetOrderResponse,
  BarsResponse,
  LastQuoteResponse,
  LatestTradesResponse,
  OrderBookResponse, DecimalValue, Side, OrderType, TimeInForce, StopCondition, OrderLeg,
} from './meta/finam-trade-api-interfaces.js';
import { isNonEmptyObject, toDecimalString } from "./lib/utils.js";

const baseUrl = process.env.API_BASE_URL;

if (!baseUrl) {
  throw new Error('API_BASE_URL not set in .env');
}

// ==================== Core HTTP Functions ====================

// Create HTTP/2 client with got
const h2 = got.extend({
  http2: true,            // Force HTTP/2
  decompress: true,       // Support gzip/br compression
  throwHttpErrors: false, // Handle status codes manually
  retry: { limit: 0 },    // No retries for clearer error handling
  timeout: { request: 30000 }, // 30 second timeout
});


async function makeRequest<T> (
  method: string,
  urlPath: string,
  secretToken: string,
  body?: unknown,
  queryParams?: Record<string, string>,
): Promise<T> {
  let jwtToken: string = '';

  const headers: any = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Accept-Encoding': 'br, deflate, gzip, x-gzip',
  };

  if (urlPath === 'sessions') {
    jwtToken = await getJwtToken(secretToken);
    return { token: jwtToken  } as T;
  } else if (urlPath === 'sessions/details') {
    // No need to set Authorization header for this endpoint
  }  else {
    jwtToken = await getJwtToken(secretToken);
    headers.Authorization = jwtToken;
  }

  try {
    const gotOptions: Record<string, unknown> = {
      method,
      headers,
      responseType: 'json' as const,
    };

    // Add body for POST/PUT/PATCH requests
    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      gotOptions.json = body;
    }

    // Add query parameters
    if (isNonEmptyObject(queryParams)) {
      gotOptions.searchParams = queryParams;
    }
    const url = `${baseUrl}/v1/${urlPath}`;
    const response = await h2(url, gotOptions);

    // Success case - return the data directly
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.body as T;
    }

    // API returned error - throw McpError
    if (typeof response.body === 'object' && response.body !== null) {
      const obj = response.body as Record<string, unknown>;

      // API error format: { code: number, message: string, details?: [] }
      if ('code' in obj && 'message' in obj) {
        throw new McpError(
          ErrorCode.InternalError,
          obj.message as string
        );
      }
    }

    // Unknown API error format
    throw new McpError(
      ErrorCode.InternalError,
      typeof response.body === 'string' ? response.body : JSON.stringify(response.body)
    );

  } catch (error) {
    // If it's already an McpError, rethrow it
    if (error instanceof McpError) {
      throw error;
    }

    // Network/timeout errors - throw McpError
    if (error instanceof Error) {
      const msg = error.message;
      const isTimeout = msg.includes('timeout') || msg.includes('ETIMEDOUT');
      const isNetwork = msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND');

      throw new McpError(
        isTimeout ? ErrorCode.RequestTimeout : ErrorCode.InternalError,
        isTimeout
          ? 'Внешний API недоступен (timeout)'
          : isNetwork
            ? 'Не удалось подключиться к внешнему API'
            : `Ошибка при обращении к API: ${error.message}`
      );
    }

    // Unknown error type
    throw new McpError(
      ErrorCode.InternalError,
      `Неизвестная ошибка: ${String(error)}`
    );
  }
}

// ==================== API Wrapper Functions ====================

// Group 1: Connection

// 1-1
export async function Auth (params: { secret_token: string; }): Promise<AuthResponse> {
  const result = await makeRequest<AuthResponse>('POST', `sessions`, params.secret_token);
  return result;
}

// 1-2
export async function TokenDetails (params: {  jwt_token: string}): Promise<TokenDetailsResponse> {
  const result = await makeRequest<TokenDetailsResponse>(
    'POST',
    `sessions/details`,
    '',
    { token: params.jwt_token },
  );
  return result;
}

// Group 2: Accounts

// 2-1
export async function GetAccount (params: {
  secret_token: string;
  account_id: string;
}): Promise<GetAccountResponse> {
  const result = await makeRequest<GetAccountResponse>('GET', `accounts/${params.account_id}`, params.secret_token);
  return result;
}

// 2-2
export async function Trades (params: {
  secret_token: string;
  account_id: string;
  start_time: string;
  end_time: string;
}): Promise<TradesResponse> {
  const result = await makeRequest<TradesResponse>(
    'GET',
    `accounts/${params.account_id}/trades`,
    params.secret_token,
    null,
    { 'interval.start_time': params.start_time, 'interval.end_time': params.end_time },
  );
  return result;
}

// 2-3
export async function Transactions (params: {
  secret_token: string;
  account_id: string;
  start_time: string;
  end_time: string;
}): Promise<TransactionsResponse> {
  const result = await makeRequest<TransactionsResponse>(
    'GET',
    `accounts/${params.account_id}/transactions`,
    params.secret_token,
    null,
    { 'interval.start_time': params.start_time, 'interval.end_time': params.end_time },
  );
  return result;
}

// Group 3: Instruments

// 3-1
export async function Assets (params: { secret_token: string; }): Promise<AssetsResponse> {
  const result = await makeRequest<AssetsResponse>('GET', `assets`, params.secret_token);
  return result;
}

// 3-2
export async function Clock (params: { secret_token: string; }): Promise<ClockResponse> {
  const result = await makeRequest<ClockResponse>('GET', `assets/clock`, params.secret_token);
  return result;
}

// Cache configuration for Exchanges
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// Cache storage for Exchanges
interface ExchangesCache {
  data: ExchangesResponse | null;
  timestamp: number;
}

const exchangesCache: ExchangesCache = {
  data: null,
  timestamp: 0
};

// 3-3
export async function Exchanges (params: { secret_token: string; }): Promise<ExchangesResponse> {
  const result = await makeRequest<ExchangesResponse>('GET', `exchanges`, params.secret_token);
  return result;
}

// 3-3 Cached version
export async function ExchangesCached (params: { secret_token: string; }): Promise<ExchangesResponse> {
  const now = Date.now();
  const isExpired = now - exchangesCache.timestamp > CACHE_TTL_MS;

  if (!exchangesCache.data || isExpired) {
    exchangesCache.data = await Exchanges(params);
    exchangesCache.timestamp = now;
  }

  return exchangesCache.data;
}

// 3-4
export async function GetAsset (params: {
  secret_token: string;
  account_id: string;
  symbol: string;
}): Promise<GetAssetResponse> {
  const result = await makeRequest<GetAssetResponse>(
    'GET',
    `assets/${params.symbol}`,
    params.secret_token,
    null,
    { 'account_id': params.account_id },
  );
  return result;
}

// 3-5
export async function GetAssetParams (params: {
  secret_token: string;
  account_id: string;
  symbol: string;
}): Promise<GetAssetParamsResponse> {
  const result = await makeRequest<GetAssetParamsResponse>(
    'GET',
    `assets/${params.symbol}/params`,
    params.secret_token,
    null,
    { 'account_id': params.account_id },
  );
  return result;
}

// 3-4 + 3-5 Combined
export async function GetAssetDetails (params: {
  secret_token: string;
  account_id: string;
  symbol: string;
}): Promise<GetAssetResponse & GetAssetParamsResponse> {
  const [asset, assetParams] = await Promise.all([
    GetAsset(params),
    GetAssetParams(params)
  ]);

  return { ...asset, ...assetParams };
}

// 3-6
export async function OptionsChain (params: {
  secret_token: string;
  symbol: string;
}): Promise<OptionsChainResponse> {
  const result = await makeRequest<OptionsChainResponse>('GET', `assets/${params.symbol}/options`, params.secret_token);
  return result;
}

// 3-7
export async function Schedule (params: {
  secret_token: string;
  symbol: string;
}): Promise<ScheduleResponse> {
  const result = await makeRequest<ScheduleResponse>('GET', `assets/${params.symbol}/schedule`, params.secret_token);
  return result;
}

// Group 4: Orders

// 4-1
export async function PlaceOrder (params: {
  secret_token: string;
  account_id: string;
  symbol: string;
  quantity: number;
  side: 'SIDE_BUY' | 'SIDE_SELL';
  type: 'ORDER_TYPE_LIMIT' | 'ORDER_TYPE_MARKET' | 'ORDER_TYPE_STOP' | 'ORDER_TYPE_STOP_LIMIT';
  time_in_force: 'TIME_IN_FORCE_DAY' | 'TIME_IN_FORCE_GTC' | 'TIME_IN_FORCE_IOC' | 'TIME_IN_FORCE_FOK';
  limit_price?: number;
  stop_price?: number;
  stop_condition?: 'STOP_CONDITION_MORE' | 'STOP_CONDITION_LESS';
  client_order_id?: string;
  legs?: OrderLeg[];
}): Promise<PlaceOrderResponse> {
  const orderData: Record<string, unknown> = {
    symbol: params.symbol,
    quantity: { value: toDecimalString(params.quantity) },
    side: params.side,
    type: params.type,
    time_in_force: params.time_in_force,
    stop_condition: params.stop_condition || 'STOP_CONDITION_UNSPECIFIED',
    legs: [],
  };

  if (params.limit_price) {
    orderData.limit_price = { value: toDecimalString(params.limit_price) };
  }

  if (params.stop_price) {
    orderData.stop_price = { value: toDecimalString(params.stop_price) };
  }

  if (params.client_order_id) {
    orderData.client_order_id = params.client_order_id;
  }

  if (params.legs?.length) {
    orderData.legs = params.legs;
  }

  const result = await makeRequest<PlaceOrderResponse>('POST', `accounts/${params.account_id}/orders`, params.secret_token, orderData);
  return result;
}

// 4-2
export async function CancelOrder (params: {
  secret_token: string;
  account_id: string;
  order_id: string;
}): Promise<CancelOrderResponse> {
  const result = await makeRequest<CancelOrderResponse>('DELETE', `accounts/${params.account_id}/orders/${params.order_id}`, params.secret_token);
  return result;
}

// 4-3
export async function GetOrders (params: {
  secret_token: string;
  account_id: string;
}): Promise<GetOrdersResponse> {
  const result = await makeRequest<GetOrdersResponse>('GET', `accounts/${params.account_id}/orders`, params.secret_token);
  return result;
}

// 4-4
export async function GetOrder (params: {
  secret_token: string;
  account_id: string;
  order_id: string;
}): Promise<GetOrderResponse> {
  const result = await makeRequest<GetOrderResponse>('GET', `accounts/${params.account_id}/orders/${params.order_id}`, params.secret_token);
  return result;
}

// Group 5: Market Data

// 5-1
export async function Bars (params: {
  secret_token: string;
  symbol: string;
  start_time: string;
  end_time: string;
  timeframe: 'TIME_FRAME_M1' | 'TIME_FRAME_M5' | 'TIME_FRAME_M15' | 'TIME_FRAME_H1' | 'TIME_FRAME_D';
}): Promise<BarsResponse> {
  const result = await makeRequest<BarsResponse>(
    'GET',
    `instruments/${params.symbol}/bars`,
    params.secret_token,
    null,
    {
      'interval.start_time': params.start_time,
      'interval.end_time': params.end_time,
      'timeframe': params.timeframe,
    },
  );
  return result;
}

// 5-2
export async function LastQuote (params: {
  secret_token: string;
  symbol: string;
}): Promise<LastQuoteResponse> {
  const result = await makeRequest<LastQuoteResponse>('GET', `instruments/${params.symbol}/quotes/latest`, params.secret_token);
  return result;
}

// 5-3
export async function LatestTrades (params: {
  secret_token: string;
  symbol: string;
}): Promise<LatestTradesResponse> {
  const result = await makeRequest<LatestTradesResponse>('GET', `instruments/${params.symbol}/trades/latest`, params.secret_token);
  return result;
}

// 5-4
export async function OrderBook (params: {
  secret_token: string;
  symbol: string;
}): Promise<OrderBookResponse> {
  const result = await makeRequest<OrderBookResponse>('GET', `instruments/${params.symbol}/orderbook`, params.secret_token);
  return result;
}
