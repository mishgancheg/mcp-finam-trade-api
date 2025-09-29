// Mock API responses extracted from _test-data/good/

import fs from 'node:fs';

// 1
const tokenInfoData = JSON.parse(fs.readFileSync(new URL('./token-data.json.bin', import.meta.url), 'utf-8'));
// 3
const assetsData = JSON.parse(fs.readFileSync(new URL('./assets.json.bin', import.meta.url), 'utf-8'));
const exchangesData = JSON.parse(fs.readFileSync(new URL('./exchanges.json.bin', import.meta.url), 'utf-8'));
const optionsData = JSON.parse(fs.readFileSync(new URL('./options.json.bin', import.meta.url), 'utf-8'));
const scheduleData = JSON.parse(fs.readFileSync(new URL('./schedule.json.bin', import.meta.url), 'utf-8'));
// 5
const barsData = JSON.parse(fs.readFileSync(new URL('./bars.json.bin', import.meta.url), 'utf-8'));
const tradesData = JSON.parse(fs.readFileSync(new URL('./trades.json.bin', import.meta.url), 'utf-8'));
const orderbookData = JSON.parse(fs.readFileSync(new URL('./orderbook.json.bin', import.meta.url), 'utf-8'));

/**
 * Mock responses by endpoint ID
 * Structure: { "endpoint-id": { status: number, data: object } }
 */
export const MOCK_RESPONSES = {
  '1-2': {
    'status': 200,
    'data': tokenInfoData,
  },
  '2-1': {
    'status': 200,
    'data': {
      'account_id': '1234567',
      'type': 'UNION',
      'status': 'ACCOUNT_ACTIVE',
      'positions': [],
      'cash': [],
    },
  },
  '2-2': {
    'status': 200,
    'data': {
      'trades': [],
    },
  },
  '2-3': {
    'status': 200,
    'data': {
      'transactions': [],
    },
  },
  '3-1': {
    'status': 200,
    'data': assetsData,
  },
  '3-2': {
    'status': 200,
    'data': {
      'timestamp': '2025-09-29T10:46:22.765427323Z',
    },
  },
  '3-3': {
    'status': 200,
    'data': exchangesData,
  },
  '3-4': {
    'status': 200,
    'data': {
      'board': 'TQBR',
      'id': '5239179',
      'ticker': 'YDEX',
      'mic': 'MISX',
      'isin': 'RU000A107T19',
      'type': 'EQUITIES',
      'name': 'ЯНДЕКС',
      'lot_size': {
        'value': '1.0',
      },
      'decimals': 1,
      'min_step': '5',
      'quote_currency': '',
    },
  },
  '3-5': {
    'status': 200,
    'data': {
      'symbol': 'YDEX@MISX',
      'account_id': '1234567',
      'tradeable': true,
      'longable': {
        'value': 'AVAILABLE',
        'halted_days': 0,
      },
      'shortable': {
        'value': 'NOT_AVAILABLE',
        'halted_days': 0,
      },
      'long_risk_rate': {
        'value': '100.0',
      },
      'long_collateral': {
        'currency_code': 'RUB',
        'units': '4047',
        'nanos': 500000000,
      },
      'short_risk_rate': {
        'value': '248.22',
      },
      'long_initial_margin': {
        'currency_code': 'RUB',
        'units': '4047',
        'nanos': 500000000,
      },
    },
  },
  '3-6': {
    'status': 200,
    'data': optionsData,
  },
  '3-7': {
    'status': 200,
    'data': scheduleData,
  },
  '4-3': {
    'status': 200,
    'data': {
      'orders': [],
    },
  },
  '5-1': {
    'status': 200,
    'data': barsData
  },
  '5-2': {
    'status': 200,
    'data': {
      'symbol': 'YDEX@MISX',
      'quote': {
        'symbol': 'YDEX@MISX',
        'timestamp': '2025-09-29T10:46:24.251703Z',
        'ask': {
          'value': '4049.5',
        },
        'ask_size': {
          'value': '158',
        },
        'bid': {
          'value': '4048.5',
        },
        'bid_size': {
          'value': '20',
        },
        'last': {
          'value': '4048.5',
        },
        'last_size': {
          'value': '10',
        },
        'volume': {
          'value': '271461',
        },
        'turnover': {
          'value': '1.096389407E9',
        },
        'open': {
          'value': '4023.5',
        },
        'high': {
          'value': '4065.5',
        },
        'low': {
          'value': '4010.0',
        },
        'close': {
          'value': '4097.0',
        },
        'change': {
          'value': '-48.5',
        },
      },
    },
  },
  '5-3': {
    'status': 200,
    'data': tradesData,
  },
  '5-4': {
    'status': 200,
    'data': orderbookData,
  },
};

/**
 * Get mock response for an endpoint
 * @param {string} endpointId - The endpoint ID (e.g., "1-1")
 * @returns {object|null} - The mock response or null if not found
 */
export function getMockResponse (endpointId) {
  return MOCK_RESPONSES[endpointId] || null;
}

export default {
  MOCK_RESPONSES,
  getMockResponse,
};
