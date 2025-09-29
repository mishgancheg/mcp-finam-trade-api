// instruments-fetch.js
// Скрипт для получения данных по списку инструментов
// Использует JWT-аутентификацию и REST API FINAM Trade API

// noinspection ES6UnusedImports
import * as _c from '../dist/src/init-config.js';

import fs from 'node:fs';
import path from 'node:path';
import got from 'got';
import { fileURLToPath } from 'url';
import { getJwtToken } from '../dist/src/lib/jwt-auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.API_BASE_URL;
const SECRET_TOKEN = process.env.API_SECRET_TOKEN;
const ACCOUNT_ID = process.env.ACCOUNT_ID;

if (!BASE_URL) {
  throw new Error('API_BASE_URL is not set in .env');
}
if (!SECRET_TOKEN) {
  throw new Error('SECRET_TOKEN (или SECRET) не задан в .env');
}
if (!ACCOUNT_ID) {
  throw new Error('ACCOUNT_ID  не задан в .env');
}

// HTTP/2 клиент
const h2 = got.extend({
  http2: true,
  decompress: true,
  throwHttpErrors: false,
  retry: { limit: 0 },
});

// Входной список инструментов
const INSTRUMENTS = [
  {
    symbol: 'KUZB@MISX',
    id: '83165',
    ticker: 'KUZB',
    mic: 'MISX',
    isin: 'RU000A0JSQ66',
    type: 'EQUITIES',
    name: 'КузнецкийБ',
  },
  {
    symbol: 'RGSS@MISX',
    id: '181934',
    ticker: 'RGSS',
    mic: 'MISX',
    isin: 'RU0008010855',
    type: 'EQUITIES',
    name: 'РГС СК ао',
  },
  {
    symbol: 'SAREP@RUSX',
    id: '5321963',
    ticker: 'SAREP',
    mic: 'RUSX',
    isin: 'RU0009100762',
    type: 'EQUITIES',
    name: 'Саратовэнерго ап',
  },
  {
    symbol: 'YKENP@MISX',
    id: '81769',
    ticker: 'YKENP',
    mic: 'MISX',
    isin: 'RU0007796827',
    type: 'EQUITIES',
    name: 'Якутскэн-п',
  },
  {
    symbol: 'HYDR@XNMS',
    id: '2653151',
    ticker: 'HYDR',
    mic: 'XNMS',
    isin: 'US37960A4206',
    type: 'FUNDS',
    name: 'Global X Hydrogen ETF',
  },
  {
    symbol: 'SARE@RUSX',
    id: '5321962',
    ticker: 'SARE',
    mic: 'RUSX',
    isin: 'RU0009100754',
    type: 'EQUITIES',
    name: 'Саратовэнерго ао',
  },
  {
    symbol: 'MRSB@RUSX',
    id: '5321939',
    ticker: 'MRSB',
    mic: 'RUSX',
    isin: 'RU000A0D9AJ7',
    type: 'EQUITIES',
    name: 'Мордовэнергосбыт ао',
  },
  {
    symbol: 'RTSB@MISX',
    id: '16783',
    ticker: 'RTSB',
    mic: 'MISX',
    isin: 'RU000A0D8PB4',
    type: 'EQUITIES',
    name: 'ТНСэнРст',
  },
  {
    symbol: 'ASTR@RUSX',
    id: '2718477',
    ticker: 'ASTR',
    mic: 'RUSX',
    isin: 'RU000A106T36',
    type: 'EQUITIES',
    name: 'ПАО Группа Астра',
  },
  {
    symbol: 'BYSI@XNCM',
    id: '474268',
    ticker: 'BYSI',
    mic: 'XNCM',
    isin: 'KYG108301006',
    type: 'EQUITIES',
    name: 'BeyondSpring, Inc.',
  },
  {
    symbol: 'APLT@XNCM',
    id: '5884722',
    ticker: 'APLT',
    mic: 'XNCM',
    isin: 'US03828A1016',
    type: 'EQUITIES',
    name: 'Applied Therapeutics, Inc.',
  },
  {
    symbol: 'SKLZ@XNYS',
    id: '2221346',
    ticker: 'SKLZ',
    mic: 'XNYS',
    isin: 'US83067L2088',
    type: 'EQUITIES',
    name: 'Skillz Inc.',
  },
];

function ensureDir (p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

async function fetchInstrument (symbol, jwt) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': jwt,
  };
  // Детали инструмента (если эндпоинт доступен)

  const out = { symbol };

  try {
    const detailsUrl = new URL(`/v1/assets/${symbol}?account_id=${ACCOUNT_ID}`, BASE_URL).toString();
    const r1 = await h2(detailsUrl, { method: 'GET', headers, responseType: 'json' });
    out.details = { status: r1.statusCode, body: r1.body };
  } catch (e) {
    out.details = { error: String(e?.message || e) };
  }

  try {
    const lastQuoteUrl = new URL(`/v1/instruments/${symbol}/quotes/latest`, BASE_URL).toString();
    const r2 = await h2(lastQuoteUrl, { method: 'GET', headers, responseType: 'json' });
    out.lastQuote = { status: r2.statusCode, body: r2.body };
  } catch (e) {
    out.lastQuote = { error: String(e?.message || e) };
  }

  return out;
}

async function main () {
  const started = new Date();
  console.log(`[instruments-fetch] Start: ${started.toISOString()}`);

  const jwt = await getJwtToken(SECRET_TOKEN);

  const results = [];
  for (const it of INSTRUMENTS) {
    const { symbol } = it;
    const res = await fetchInstrument(symbol, jwt);
    const price = parseFloat(res.lastQuote.body.quote.ask.value);
    const lot = parseFloat(res.details.body.lot_size.value);
    const minCost = lot * price;
    results.push({ symbol, minCost, price, lot, ...it, api: res });

    console.log(JSON.stringify({
      symbol,
      status: {
        details: res?.details?.status ?? res?.details?.error ?? null,
        lastQuote: res?.lastQuote?.status ?? res?.lastQuote?.error ?? null,
      },
    }));
  }

  // Сохранить результаты в _tmp для анализа
  const outDir = path.resolve(__dirname, '../_tmp');
  ensureDir(outDir);
  const outPath = path.join(outDir, 'instruments-fetch.json');
  fs.writeFileSync(outPath, JSON.stringify({ started: started.toISOString(), finished: new Date().toISOString(), count: results.length, results }, null, 2), 'utf-8');

  console.log(`[instruments-fetch] Saved: ${outPath}`);
}

main().catch(err => {
  console.error('[instruments-fetch] ERROR:', err?.stack || err?.message || String(err));
  process.exitCode = 1;
});
