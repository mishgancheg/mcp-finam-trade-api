/**
 * FINAM Trade API Registry
 * Complete endpoint definitions for all API methods
 * Generated from proto files and API documentation
 */

/**
 * Raw endpoint definitions
 */
const RAW_ENDPOINTS = [
  // ==================== Группа 1: Подключение ====================
  {
    fullId: '1-1',
    group: 'Подключение',
    name: 'Auth',
    description: 'Получение JWT токена по секретному ключу',
    method: 'POST',
    endpoint: '/v1/sessions',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/auth_service/Auth',
    requestInterface: 'AuthRequest',
    responseInterface: 'AuthResponse',
    data: {
      secret: '{secretToken}', // Секретный токен с портала
    },
    expectedStatus: 200,
    responseExample: {
      token: 'jwt token',
    },
    validation: {
      checkFields: (r) => {
        return r.token && typeof r.token === 'string';
      },
      expectedProps: ['token'],
    },
  },
  {
    fullId: '1-2',
    group: 'Подключение',
    name: 'TokenDetails',
    description: 'Получение информации о JWT токене',
    method: 'POST',
    endpoint: '/v1/sessions/details',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/auth_service/TokenDetails',
    requestInterface: 'TokenDetailsRequest',
    responseInterface: 'TokenDetailsResponse',
    data: {
      token: '{jwtToken}', // JWT токен полученный из метода Auth
    },
    expectedStatus: 200,
    responseExample: {
      created_at: '2025-09-28T13:14:29Z',
      expires_at: '2025-09-28T13:29:32Z',
      md_permissions: [
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '#RBRD',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '#RCBR',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '#WWCP',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'AMXO',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'ARCX',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'BATS',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'BVMF',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'EXPM',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'IEXG',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'IFEU',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'IFUS',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'MISX',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'OOTC',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'OPRA',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'OTCB',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'OTCM',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'OTCQ',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'PINC',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'PINI',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'PINL',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'PINX',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'PSGM',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'RTSX',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'RUSX',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XAMS',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XASE',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XASX',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XBOM',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XBRU',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XBUE',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XCBF',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XCBT',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XCEC',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XCME',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XETR',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XFRA',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XGAT',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XHKF',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XHKG',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XLDN',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XLME',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XLOM',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XLON',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XMAD',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XNAS',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XNCM',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XNGS',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XNMS',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XNYM',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XNYS',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XPAR',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XSHE',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XSHG',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XSWX',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: 'XTKS',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '_BNCC',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '_CBIR',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '_CMF',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '_CRYP',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '_EURB',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '_MMBZ',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '_NPRO',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '_SCI',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '_SP',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '_SPBZ',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '_SPd1',
        },
        {
          quote_level: 'QUOTE_LEVEL_DEPTH_OF_MARKET',
          delay_minutes: 0,
          mic: '_TRES',
        },
      ],
      account_ids: [
        'TRQD05:146559',
      ],
      readonly: false,
    },
    validation: {
      checkFields: (r) => {
        return Array.isArray(r.md_permissions);
      },
      expectedProps: ['created_at', 'expires_at', 'account_ids', 'md_permissions'],
    },
  },

  // ==================== Группа 2: Счета ====================
  {
    fullId: '2-1',
    group: 'Счета',
    name: 'GetAccount',
    description: 'Получение информации по конкретному аккаунту',
    method: 'GET',
    endpoint: '/v1/accounts/{account_id}',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/accounts_service/GetAccount',
    responseInterface: 'GetAccountResponse',
    pathParams: {
      account_id: '{account_id}', // Номер счета без префикса КлФ
    },
    expectedStatus: 200,
    responseExample: {
      account_id: '1899011',
      type: 'UNION',
      status: 'ACCOUNT_ACTIVE',
      equity: { value: '989.38' },
      unrealized_profit: { value: '0.4' },
      positions: [
        {
          symbol: 'AFLT@MISX',
          quantity: { value: '10.0' },
          average_price: { value: '62.72' },
          current_price: { value: '62.76' },
          daily_pnl: { value: '0.4' },
          unrealized_pnl: { value: '0.4' },
        },
      ],
      cash: [
        {
          currency_code: 'RUB',
          units: '361',
          nanos: 7800000,
        },
      ],
      portfolio_mc: {
        available_cash: { value: '361.78' },
        initial_margin: { value: '627.6' },
        maintenance_margin: { value: '313.8' },
      },
    },
    validation: {
      checkFields: (r) => {
        return r.account_id && r.status;
      },
      expectedProps: ['account_id', 'type', 'status'],
    },
  },
  {
    fullId: '2-2',
    group: 'Счета',
    name: 'Trades',
    description: 'Получение истории по сделкам аккаунта',
    method: 'GET',
    endpoint: '/v1/accounts/{account_id}/trades',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/accounts_service/Trades',
    responseInterface: 'TradesResponse',
    pathParams: {
      account_id: '{account_id}',
    },
    queryParams: {
      'interval.start_time': '2025-01-01T00:00:00Z',
      'interval.end_time': '2025-03-15T00:00:00Z',
    },
    expectedStatus: 200,
    responseExample: {
      trades: [
        {
          trade_id: 'T123456',
          symbol: 'SBER@MISX',
          price: { value: '250.00' },
          size: { value: '10' },
          side: 'SIDE_BUY',
          timestamp: '2025-01-15T10:30:00Z',
          order_id: 'O123456',
          account_id: '123456',
        },
      ],
    },
    validation: {
      checkFields: (r) => {
        return Array.isArray(r.trades);
      },
      expectedProps: ['trades'],
    },
  },
  {
    fullId: '2-3',
    group: 'Счета',
    name: 'Transactions',
    description: 'Получение списка транзакций аккаунта',
    method: 'GET',
    endpoint: '/v1/accounts/{account_id}/transactions',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/accounts_service/Transactions',
    responseInterface: 'TransactionsResponse',
    pathParams: {
      account_id: '{account_id}',
    },
    queryParams: {
      'interval.start_time': '2025-01-01T00:00:00Z',
      'interval.end_time': '2025-03-15T00:00:00Z',
    },
    expectedStatus: 200,
    responseExample: {
      transactions: [
        {
          id: '2556733362',
          category: 'COMMISSION',
          timestamp: '2025-07-25T20:59:59Z',
          symbol: '',
          change: {
            currency_code: 'RUB',
            units: '-1',
            nanos: -6400000,
          },
          transaction_category: 'COMMISSION',
          transaction_name: 'Брокерская комиссия',
        },
        {
          id: '2670441934',
          category: 'DEPOSIT',
          timestamp: '2025-09-29T14:30:09Z',
          symbol: '',
          change: {
            currency_code: 'RUB',
            units: '900',
            nanos: 0,
          },
          transaction_category: 'DEPOSIT',
          transaction_name: 'Ввод денежных средств',
        },
      ],
    },
    validation: {
      checkFields: (r) => {
        return Array.isArray(r.transactions);
      },
      expectedProps: ['transactions'],
    },
  },

  // ==================== Группа 3: Инструменты ====================
  {
    fullId: '3-1',
    group: 'Инструменты',
    name: 'Assets',
    description: 'Получение списка доступных инструментов',
    method: 'GET',
    endpoint: '/v1/assets',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/assets_service/Assets',
    responseInterface: 'AssetsResponse',
    expectedStatus: 200,
    responseExample: {
      assets: [
        {
          symbol: 'AAPL@XNGS',
          id: '75022',
          ticker: 'AAPL',
          mic: 'XNGS',
          isin: 'US0378331005',
          type: 'EQUITIES',
          name: 'Apple Inc.',
        },
        {
          symbol: 'SBER@RUSX',
          id: '419750',
          ticker: 'SBER',
          mic: 'RUSX',
          isin: 'RU0009029540',
          type: 'EQUITIES',
          name: 'ПАО \'Сбербанк России\', ао',
        },
      ],
      total: 1,
    },
    validation: {
      checkFields: (r) => {
        return Array.isArray(r.assets);
      },
      expectedProps: ['assets'],
    },
  },
  {
    fullId: '3-2',
    group: 'Инструменты',
    name: 'Clock',
    description: 'Получение времени на сервере',
    method: 'GET',
    endpoint: '/v1/assets/clock',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/assets_service/Clock',
    responseInterface: 'ClockResponse',
    expectedStatus: 200,
    responseExample: {
      timestamp: '2025-01-01T12:00:00Z',
      unix_time: 1735732800,
    },
    validation: {
      checkFields: (r) => {
        return r.timestamp;
      },
      expectedProps: ['timestamp'],
    },
  },
  {
    fullId: '3-3',
    group: 'Инструменты',
    name: 'Exchanges',
    description: 'Получение списка доступных бирж',
    method: 'GET',
    endpoint: '/v1/exchanges',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/assets_service/Exchanges',
    responseInterface: 'ExchangesResponse',
    expectedStatus: 200,
    responseExample: {
      exchanges: [
        {
          mic: 'MISX',
          name: 'Московская биржа',
        },
        {
          mic: 'XNAS',
          name: 'NASDAQ',
        },
      ],
    },
    validation: {
      checkFields: (r) => {
        return Array.isArray(r.exchanges);
      },
      expectedProps: ['exchanges'],
    },
  },
  {
    fullId: '3-4',
    group: 'Инструменты',
    name: 'GetAsset',
    description: 'Получение информации по конкретному инструменту',
    method: 'GET',
    endpoint: '/v1/assets/{symbol}',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/assets_service/GetAsset',
    responseInterface: 'GetAssetResponse',
    pathParams: {
      symbol: '{symbol}', // Символ инструмента в формате TICKER@MIC
    },
    queryParams: {
      account_id: '{account_id}',
    },
    expectedStatus: 200,
    responseExample: {
      symbol: 'SBER@MISX',
      id: 'SBER',
      ticker: 'SBER',
      mic: 'MISX',
      isin: 'RU0009029540',
      type: 'EQUITIES',
      name: 'Сбербанк',
      board: 'TQBR',
      lot_size: { value: '10' },
      decimals: 2,
      min_step: '0.01',
      exchange: 'Московская биржа',
      currency: 'RUB',
    },
    validation: {
      checkFields: (r) => {
        return r.id && r.ticker && r.mic && r.type && r.name && typeof r.decimals === 'number';
      },
      expectedProps: ['id', 'ticker', 'mic', 'isin', 'type', 'decimals'],
    },
  },
  {
    fullId: '3-5',
    group: 'Инструменты',
    name: 'GetAssetParams',
    description: 'Получение торговых параметров по инструменту',
    method: 'GET',
    endpoint: '/v1/assets/{symbol}/params',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/assets_service/GetAssetParams',
    responseInterface: 'GetAssetParamsResponse',
    pathParams: {
      symbol: '{symbol}',
    },
    queryParams: {
      account_id: '{account_id}',
    },
    expectedStatus: 200,
    responseExample: {
      symbol: 'SBER@MISX',
      account_id: '123456',
      tradeable: true,
      longable: { value: 'true', halted_days: 0 },
      shortable: { value: 'false', halted_days: 0 },
      long_risk_rate: { value: '0.15' },
      short_risk_rate: { value: '0.25' },
      min_order_size: { value: '1' },
      max_order_size: { value: '10000' },
      trading_status: 'NORMAL_TRADING',
    },
    validation: {
      checkFields: (r) => {
        return r.symbol && r.tradeable !== undefined;
      },
      expectedProps: ['symbol', 'account_id', 'tradeable'],
    },
  },
  {
    fullId: '3-6',
    group: 'Инструменты',
    name: 'OptionsChain',
    description: 'Получение цепочки опционов для базового актива',
    method: 'GET',
    endpoint: '/v1/assets/{symbol}/options',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/assets_service/OptionsChain',
    responseInterface: 'OptionsChainResponse',
    pathParams: {
      symbol: '{symbol}',
    },
    expectedStatus: 200,
    responseExample: {
      symbol: 'YDEX@MISX',
      options: [
        {
          symbol: 'YD15000BA5@MISX',
          type: 'TYPE_CALL',
          contract_size: { value: '1' },
          trade_last_day: { year: 2025, month: 3, day: 20 },
          strike: { value: '15000' },
          expiration_first_day: { year: 2025, month: 3, day: 1 },
          expiration_last_day: { year: 2025, month: 3, day: 20 },
        },
      ],
    },
    validation: {
      checkFields: (r) => {
        return r.symbol && Array.isArray(r.options);
      },
      expectedProps: ['symbol', 'options'],
    },
  },
  {
    fullId: '3-7',
    group: 'Инструменты',
    name: 'Schedule',
    description: 'Получение расписания торгов для инструмента',
    method: 'GET',
    endpoint: '/v1/assets/{symbol}/schedule',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/assets_service/Schedule',
    responseInterface: 'ScheduleResponse',
    pathParams: {
      symbol: '{symbol}',
    },
    expectedStatus: 200,
    responseExample: {
      symbol: 'YDEX@MISX',
      sessions: [
        {
          type: 'CORE_TRADING',
          interval: {
            start_time: '2025-01-15T07:00:00Z',
            end_time: '2025-01-15T15:45:00Z',
          },
        },
      ],
    },
    validation: {
      checkFields: (r) => {
        return r.symbol && Array.isArray(r.sessions);
      },
      expectedProps: ['symbol', 'sessions'],
    },
  },

  // ==================== Группа 4: Заявки ====================
  {
    fullId: '4-1',
    group: 'Заявки',
    name: 'CancelOrder',
    description: 'Отмена заявки',
    method: 'DELETE',
    endpoint: '/v1/accounts/{account_id}/orders/{order_id}',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/orders_service/CancelOrder',
    responseInterface: 'CancelOrderResponse',
    pathParams: {
      account_id: '{account_id}',
      order_id: '{order_id}',
    },
    expectedStatus: 200,
    responseExample: {
      order_id: 'O123456789',
      exec_id: 'E123456790',
      status: 'ORDER_STATUS_CANCELED',
      order: {
        account_id: '123456',
        symbol: 'SBER@MISX',
        quantity: { value: '10' },
        side: 'SIDE_BUY',
        type: 'ORDER_TYPE_LIMIT',
        time_in_force: 'TIME_IN_FORCE_DAY',
        limit_price: { value: '250.00' },
        stop_condition: 'STOP_CONDITION_UNSPECIFIED',
        legs: [],
        client_order_id: 'test_order_001',
      },
      transact_at: '2025-01-15T10:30:00Z',
      cancel_time: '2025-01-15T10:35:00Z',
    },

    responseExample2: {
      "order_id": "71118056704",
      "exec_id": "ord.71118056704.1759201872095495",
      "status": "ORDER_STATUS_CANCELED",
      "order": {
        "account_id": "1982834",
        "symbol": "LQDT@MISX",
        "quantity": {
          "value": "1.0"
        },
        "side": "SIDE_BUY",
        "type": "ORDER_TYPE_LIMIT",
        "time_in_force": "TIME_IN_FORCE_DAY",
        "limit_price": {
          "value": "1.7415"
        },
        "stop_condition": "STOP_CONDITION_UNSPECIFIED",
        "legs": [],
        "client_order_id": "01K6DDRY3NVG50EH62KX2QSC81",
        "valid_before": "VALID_BEFORE_UNSPECIFIED"
      },
      "transact_at": "2025-09-30T13:47:31.787Z"
    },

    validation: {
      checkFields: (r) => {
        return r.order_id && r.status === 'ORDER_STATUS_CANCELED';
      },
      expectedProps: ['order_id', 'status', 'cancel_time'],
    },
  },
  {
    fullId: '4-2',
    group: 'Заявки',
    name: 'GetOrder',
    description: 'Получение информации по конкретной заявке',
    method: 'GET',
    endpoint: '/v1/accounts/{account_id}/orders/{order_id}',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/orders_service/GetOrder',
    responseInterface: 'GetOrderResponse',
    pathParams: {
      account_id: '{account_id}',
      order_id: '{order_id}',
    },
    expectedStatus: 200,
    responseExample: {
      order_id: 'O123456789',
      exec_id: 'E123456789',
      status: 'ORDER_STATUS_NEW',
      order: {
        account_id: '123456',
        symbol: 'SBER@MISX',
        quantity: { value: '10' },
        side: 'SIDE_BUY',
        type: 'ORDER_TYPE_LIMIT',
        time_in_force: 'TIME_IN_FORCE_DAY',
        limit_price: { value: '250.00' },
        stop_condition: 'STOP_CONDITION_UNSPECIFIED',
        legs: [],
        client_order_id: 'test_order_001',
      },
      transact_at: '2025-01-15T10:30:00Z',
      filled_quantity: { value: '0' },
    },

    responseExample2: {
      'order_id': '71118056704',
      'exec_id': 'ord.71118056704.1759201872000555',
      'status': 'ORDER_STATUS_NEW',
      'order': {
        'account_id': '1982834',
        'symbol': 'LQDT@MISX',
        'quantity': {
          'value': '1.0',
        },
        'side': 'SIDE_BUY',
        'type': 'ORDER_TYPE_LIMIT',
        'time_in_force': 'TIME_IN_FORCE_DAY',
        'limit_price': {
          'value': '1.7415',
        },
        'stop_condition': 'STOP_CONDITION_UNSPECIFIED',
        'legs': [],
        'client_order_id': 't1759239763266',
        'valid_before': 'VALID_BEFORE_UNSPECIFIED',
      },
      'transact_at': '2025-09-30T13:42:44.098Z',
    },

    validation: {
      checkFields: (r) => {
        return r.order_id && r.status;
      },
      expectedProps: ['order_id', 'status', 'order'],
    },
  },
  {
    fullId: '4-3',
    group: 'Заявки',
    name: 'GetOrders',
    description: 'Получение списка заявок',
    method: 'GET',
    endpoint: '/v1/accounts/{account_id}/orders',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/orders_service/GetOrders',
    responseInterface: 'GetOrdersResponse',
    pathParams: {
      account_id: '{account_id}',
    },
    expectedStatus: 200,
    responseExample: {
      orders: [
        {
          order_id: 'O123456789',
          exec_id: 'E123456789',
          status: 'ORDER_STATUS_NEW',
          order: {
            account_id: '123456',
            symbol: 'SBER@MISX',
            quantity: { value: '10' },
            side: 'SIDE_BUY',
            type: 'ORDER_TYPE_LIMIT',
            time_in_force: 'TIME_IN_FORCE_DAY',
            limit_price: { value: '250.00' },
            stop_condition: 'STOP_CONDITION_UNSPECIFIED',
            legs: [],
            client_order_id: 'test_order_001',
          },
          transact_at: '2025-01-15T10:30:00Z',
        },
      ],
      total: 1,
    },

    responseExample2: {
      'orders': [
        {
          'order_id': '71118056704',
          'exec_id': 'ord.71118056704.1759201872000555',
          'status': 'ORDER_STATUS_NEW',
          'order': {
            'account_id': '1982834',
            'symbol': 'LQDT@MISX',
            'quantity': {
              'value': '1.0',
            },
            'side': 'SIDE_BUY',
            'type': 'ORDER_TYPE_LIMIT',
            'time_in_force': 'TIME_IN_FORCE_DAY',
            'limit_price': {
              'value': '1.7415',
            },
            'stop_condition': 'STOP_CONDITION_UNSPECIFIED',
            'legs': [],
            'client_order_id': 't1759239763266',
            'valid_before': 'VALID_BEFORE_UNSPECIFIED',
          },
          'transact_at': '2025-09-30T13:42:44.098Z',
        },
      ],
    },

    validation: {
      checkFields: (r) => {
        return Array.isArray(r.orders);
      },
      expectedProps: ['orders'],
    },
  },
  {
    fullId: '4-4',
    group: 'Заявки',
    name: 'PlaceOrder',
    description: 'Размещение заявки',
    method: 'POST',
    endpoint: '/v1/accounts/{account_id}/orders',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/orders_service/PlaceOrder',
    requestInterface: 'PlaceOrderRequest',
    responseInterface: 'PlaceOrderResponse',
    pathParams: {
      account_id: '{account_id}',
    },
    data: {
      symbol: 'SBER@MISX',
      quantity: { value: '10' },
      side: 'SIDE_BUY',
      type: 'ORDER_TYPE_LIMIT',
      timeInForce: 'TIME_IN_FORCE_DAY',
      limitPrice: { value: '250.00' },
      stopCondition: 'STOP_CONDITION_UNSPECIFIED',
      legs: [],
      clientOrderId: 'test_order_001',
    },
    expectedStatus: 200,
    responseExample: {
      order_id: '68631684267',
      exec_id: 'ord.68631684267.1753326668360281',
      status: 'ORDER_STATUS_NEW',
      order: {
        account_id: 'account_id',
        symbol: 'AFLT@MISX',
        quantity: { value: '10.0' },
        side: 'SIDE_BUY',
        type: 'ORDER_TYPE_LIMIT',
        time_in_force: 'TIME_IN_FORCE_DAY',
        limit_price: { value: '55.0' },
        stop_condition: 'STOP_CONDITION_UNSPECIFIED',
        legs: [],
        client_order_id: 'test011',
      },
      transact_at: '2025-07-24T08:33:07.174Z',
    },

    responseExample2: {
      'order_id': '71118056704',
      'exec_id': 'ord.71118056704.1759201872000555',
      'status': 'ORDER_STATUS_NEW',
      'order': {
        'account_id': '1982834',
        'symbol': 'LQDT@MISX',
        'quantity': {
          'value': '1.0',
        },
        'side': 'SIDE_BUY',
        'type': 'ORDER_TYPE_LIMIT',
        'time_in_force': 'TIME_IN_FORCE_DAY',
        'limit_price': {
          'value': '1.7415',
        },
        'stop_condition': 'STOP_CONDITION_UNSPECIFIED',
        'legs': [],
        'client_order_id': 't1759239763266',
        'valid_before': 'VALID_BEFORE_UNSPECIFIED',
      },
      'transact_at': '2025-09-30T13:42:44.098Z',
    },

    errorResponseExamples: [
      {
        'code': 3,
        'message': 'INVALID_ARGUMENT: [257]To open positions in this instrument, you need to confirm your qualification level "" \fДля открытия позиций в данном инструменте вам необходимо подтвердить квалификационный уровень "Акции РФ, требующие тестирования" ',
        'details': [],
      },
      {
        'code': 3,
        'message': 'INVALID_ARGUMENT: (133) Security is not currently trading\fТорги по этому финансовому инструменту сейчас не проводятся.',
        'details': [],
      },
    ],
    validation: {
      checkFields: (r) => {
        return r.order_id && r.status;
      },
      expectedProps: ['order_id', 'status', 'order'],
    },
  },

  // ==================== Группа 5: Рыночные данные ====================
  {
    fullId: '5-1',
    group: 'Рыночные данные',
    name: 'Bars',
    description: 'Получение исторических данных (свечи)',
    method: 'GET',
    endpoint: '/v1/instruments/{symbol}/bars',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/marketdata_service/Bars',
    responseInterface: 'BarsResponse',
    pathParams: {
      symbol: '{symbol}',
    },
    queryParams: {
      'interval.start_time': '2025-03-01T00:00:00Z',
      'interval.end_time': '2025-03-15T00:00:00Z',
      timeframe: 'TIME_FRAME_D',
    },
    expectedStatus: 200,
    responseExample: {
      symbol: 'YDEX@MISX',
      bars: [
        {
          timestamp: '2025-03-01T00:00:00Z',
          open: { value: '3200.00' },
          high: { value: '3250.00' },
          low: { value: '3180.00' },
          close: { value: '3230.00' },
          volume: { value: '150000' },
        },
      ],
    },
    validation: {
      checkFields: (r) => {
        return r.symbol && Array.isArray(r.bars);
      },
      expectedProps: ['symbol', 'bars'],
    },
  },
  {
    fullId: '5-2',
    group: 'Рыночные данные',
    name: 'LastQuote',
    description: 'Получение последней котировки',
    method: 'GET',
    endpoint: '/v1/instruments/{symbol}/quotes/latest',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/marketdata_service/LastQuote',
    responseInterface: 'LastQuoteResponse',
    pathParams: {
      symbol: '{symbol}',
    },
    expectedStatus: 200,
    responseExample: {
      symbol: 'YDEX@MISX',
      quote: {
        symbol: 'YDEX@MISX',
        timestamp: '2025-01-15T10:30:00Z',
        ask: { value: '3235.00' },
        ask_size: { value: '50' },
        bid: { value: '3230.00' },
        bid_size: { value: '100' },
        last: { value: '3232.00' },
        last_size: { value: '25' },
        volume: { value: '150000' },
        turnover: { value: '484800000.00' },
        open: { value: '3200.00' },
        high: { value: '3250.00' },
        low: { value: '3180.00' },
        close: { value: '3232.00' },
        change: { value: '32.00' },
      },
      bid: { value: '3230.00' },
      ask: { value: '3235.00' },
      last_price: { value: '3232.00' },
      volume: { value: '150000' },
    },
    validation: {
      checkFields: (r) => {
        return r.symbol && r.quote;
      },
      expectedProps: ['symbol', 'quote'],
    },
  },
  {
    fullId: '5-3',
    group: 'Рыночные данные',
    name: 'LatestTrades',
    description: 'Получение последних сделок',
    method: 'GET',
    endpoint: '/v1/instruments/{symbol}/trades/latest',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/marketdata_service/LatestTrades',
    responseInterface: 'LatestTradesResponse',
    pathParams: {
      symbol: '{symbol}',
    },
    expectedStatus: 200,
    responseExample: {
      symbol: 'YDEX@MISX',
      trades: [
        {
          trade_id: 'T987654321',
          mpid: 'MISX',
          timestamp: '2025-01-15T10:30:00Z',
          price: { value: '3232.00' },
          size: { value: '25' },
          side: 'SIDE_BUY',
        },
        {
          trade_id: 'T987654320',
          mpid: 'MISX',
          timestamp: '2025-01-15T10:29:55Z',
          price: { value: '3231.00' },
          size: { value: '15' },
          side: 'SIDE_SELL',
        },
      ],
    },
    validation: {
      checkFields: (r) => {
        return r.symbol && Array.isArray(r.trades);
      },
      expectedProps: ['symbol', 'trades'],
    },
  },
  {
    fullId: '5-4',
    group: 'Рыночные данные',
    name: 'OrderBook',
    description: 'Получение стакана заявок',
    method: 'GET',
    endpoint: '/v1/instruments/{symbol}/orderbook',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/marketdata_service/OrderBook',
    responseInterface: 'OrderBookResponse',
    pathParams: {
      symbol: '{symbol}',
    },
    expectedStatus: 200,
    responseExample: {
      symbol: 'YDEX@MISX',
      orderbook: {
        rows: [
          {
            price: { value: '4354.5' },
            sell_size: { value: '18.0' },
            action: 'ACTION_ADD',
            mpid: '',
            timestamp: '2025-07-24T08:43:04.573168Z',
          },
          {
            price: { value: '4354.0' },
            sell_size: { value: '2.0' },
            action: 'ACTION_ADD',
            mpid: '',
            timestamp: '2025-07-24T08:43:04.573168Z',
          },
          {
            price: { value: '3231.00' },
            buy_size: { value: '100' },
            sell_size: null,
            action: 'ACTION_UPDATE',
            mpid: 'MISX',
            timestamp: '2025-01-15T10:30:00Z',
          },
          {
            price: { value: '3230.00' },
            buy_size: { value: '150' },
            sell_size: null,
            action: 'ACTION_UPDATE',
            mpid: 'MISX',
            timestamp: '2025-01-15T10:30:00Z',
          },
        ],
      },
    },
    validation: {
      checkFields: (r) => {
        return r.symbol && r.orderbook && Array.isArray(r.orderbook.rows);
      },
      expectedProps: ['symbol', 'orderbook'],
    },
  },
];

/**
 * Transformed endpoint registry with getters for computed properties
 */
export const FINAM_API_REGISTRY = RAW_ENDPOINTS.map((endpoint) => {
  // Create a new object with getters
  const transformed = Object.create(null);

  // Copy all properties
  Object.keys(endpoint).forEach(key => {
    if (key !== 'groupNumber' && key !== 'endpointNumber') {
      transformed[key] = endpoint[key];
    }
  });

  // Add getter for groupNumber based on fullId
  Object.defineProperty(transformed, 'groupNumber', {
    get () {
      return this.fullId ? parseInt(this.fullId.split('-')[0], 10) : undefined;
    },
    enumerable: true,
    configurable: true,
  });

  // Add getter for endpointNumber based on fullId
  Object.defineProperty(transformed, 'endpointNumber', {
    get () {
      return this.fullId ? parseInt(this.fullId.split('-')[1], 10) : undefined;
    },
    enumerable: true,
    configurable: true,
  });

  // Add getter for authorization requirement
  Object.defineProperty(transformed, 'requiresAuth', {
    get () {
      // All endpoints except Auth require JWT authorization
      return this.name !== 'Auth';
    },
    enumerable: true,
    configurable: true,
  });

  return transformed;
});

/**
 * Helper function to find endpoint by fullId
 */
export function findEndpointById (fullId) {
  return FINAM_API_REGISTRY.find(endpoint => endpoint.fullId === fullId);
}

/**
 * Helper function to find endpoints by group
 */
export function findEndpointsByGroup (groupName) {
  return FINAM_API_REGISTRY.filter(endpoint => endpoint.group === groupName);
}
