const RAW_TEST_CASES = [
  {
    fullId: '1-1',
    group: 'Подключение',
    name: 'Auth',
    description: 'Получение JWT токена из secret token',
    dataInterface: 'AuthRequest',
    responseInterface: 'AuthResponse',
    method: 'POST',
    endpoint: '/sessions',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/auth_service/Auth',
    data: {
      secret: '{secretToken}', // Secret token сгенерированный на портале https://tradeapi.finam.ru/docs/tokens/
    },
    expectedStatus: 200,
    responseExample: {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes
    },
    validation: {
      checkFields: (response) => {
        return response.token;
      },
      expectedProps: ['token'],
    },
  },
  {
    fullId: '2-3',
    group: 'Счета',
    name: 'Transactions',
    description: 'Получение списка транзакций аккаунта',
    responseInterface: 'TransactionsResponse',
    method: 'GET',
    endpoint: '/accounts/{account_id}/transactions',
    sourceUri: 'https://tradeapi.finam.ru/docs/guides/rest/accounts_service/Transactions',
    pathParams: {
      account_id: '{account_id}', // Номер счета без префикса КлФ
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
          id: '2259286250',
          category: 'DEPOSIT',
          timestamp: '2025-02-28T11:09:08Z',
          symbol: '',
          change: {
            currency_code: 'RUB',
            units: '999',
            nanos: 0,
          },
          transaction_category: 'DEPOSIT',
          transaction_name: 'Ввод денежных средств',
        },
      ],
    },
    validation: {
      checkFields: (response) => {
        return Array.isArray(response.transactions);
      },
      expectedProps: ['transactions', 'total'],
    },
  },
];

/**
 * Transformed test cases with getters for groupNumber and testNumber
 */
export const FINAM_API_TEST_CASES = RAW_TEST_CASES.map((testCase) => {
  // Create a new object with getters
  const transformed = Object.create(null);

  // Copy all properties except groupNumber and testNumber
  Object.keys(testCase).forEach(key => {
    if (key !== 'groupNumber' && key !== 'testNumber') {
      transformed[key] = testCase[key];
    }
  });

  // Add getters for groupNumber and testNumber based on fullId
  Object.defineProperty(transformed, 'groupNumber', {
    get () {
      return this.fullId ? parseInt(this.fullId.split('-')[0], 10) : undefined;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(transformed, 'testNumber', {
    get () {
      return this.fullId ? parseInt(this.fullId.split('-')[1], 10) : undefined;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(transformed, 'category', {
    get () {
      return GROUP_INFO[this.groupNumber]?.name;
    },
    enumerable: true,
    configurable: true,
  });

  return transformed;
});
