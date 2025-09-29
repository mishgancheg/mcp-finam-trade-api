// API Tester for FINAM Trade API
// noinspection UnnecessaryLocalVariableJS

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import got from 'got';
import { FINAM_API_REGISTRY } from '../src/meta/finam-trade-api-registry.js';
import { fileURLToPath } from 'url';
import { getJwtToken } from '../dist/src/lib/jwt-auth.js';

dotenv.config();

const isNonEmptyObject = (v) => {
  return v && typeof v === 'object' && Object.keys(v).length;
};

function ensureDir (p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

function nowIso () {
  return new Date().toISOString();
}

function replacer (value, placeholders) {
  if (value == null) {
    return value;
  }
  if (typeof value === 'string') {
    let out = value;
    for (const [k, v] of Object.entries(placeholders)) {
      out = out.split(`{${k}}`).join(String(v ?? ''));
    }
    return out;
  }
  if (Array.isArray(value)) {
    return value.map(v => replacer(v, placeholders));
  }
  if (typeof value === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(value)) {
      o[k] = replacer(v, placeholders);
    }
    return o;
  }
  return value;
}

function validateByExpectedProps (ep, body) {
  const expectedProps = ep?.validation?.expectedProps;
  const missingProps = [];
  if (Array.isArray(expectedProps) && expectedProps.length > 0) {
    for (const prop of expectedProps) {
      if (!(body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, prop))) {
        missingProps.push(prop);
      }
    }
  }
  const checkFn = ep?.validation?.checkFields;
  const checkOk = typeof checkFn === 'function' ? !!checkFn(body) : true;
  const propsOk = missingProps.length === 0;
  return { ok: checkOk && propsOk, missingProps, checkOk };
}

function toMarkdownReport ({ ep, request, response, error, started, _finished }) {
  const triQ = '```';
  const dataInfo = (data, title) => {
    if (!data || (typeof data === 'object' && !Object.keys(data).length)) {
      return `**${title}**: -`;
    }
    const isStr = typeof data === 'string';
    const content = isStr ? data : JSON.stringify(data, null, 2);
    const lang = isStr ? '' : 'json';
    return `**${title}**:\n${triQ}${lang}\n${content}\n${triQ}`;
  };

  const statusCode = typeof response?.status === 'number' ? response.status : null;
  const emo = statusCode != null && statusCode < 300 ? '✅' : '❌';
  const headers = isNonEmptyObject(request?.headers) ? request.headers : null;
  const headersStr = headers ? Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n') : '-';
  const url = response?.url ?? request?.url ?? '';

  const content = `${emo}  **case**: ${ep.fullId} / ${ep.name} / ${ep.group} / ${started} → ${response?.durationMs ?? '-'} ms

${ep.method} ${url}

**Status**: ${statusCode ?? 'N/A'}

**headers**: 
${headersStr}

${dataInfo(request?.body, 'request')}

${dataInfo(response?.body, 'response')}

${error ? `**error**: ${String(error.stack || error.message || error)}` : ''}`;

  return content;
}

// Create HTTP/2 client
const h2 = got.extend({
  http2: true,            // 🔒 принудительно HTTP/2
  decompress: true,       // поддержка gzip/br
  throwHttpErrors: false, // сами обрабатываем статус-коды
  retry: { limit: 0 },    // без ретраев, чтобы видеть «сырой» ответ
});

async function main () {
  if (['API_BASE_URL', 'API_SECRET_TOKEN', 'ACCOUNT_ID'].some((v) => {
    if (!process.env[v]) {
      console.error(`${v} is required in .env`);
      process.exitCode = 1;
      return true;
    }
  })) {
    return;
  }

  const baseUrl = process.env.API_BASE_URL;
  const secretToken = process.env.API_SECRET_TOKEN;
  const accountId = process.env.ACCOUNT_ID;
  const orderId = process.env.ORDER_ID || '68631684267';
  const symbol = process.env.SYMBOL || 'YDEX@MISX';

  ensureDir(path.join(process.cwd(), '_test-data'));

  const commonPlaceholders = {
    secretToken,
    account_id: accountId,
    order_id: orderId,
    symbol: symbol,
  };

  // Step 1: Auth to get JWT using the new jwt-auth module
  let jwtToken = '';
  try {
    jwtToken = await getJwtToken(secretToken);
    console.log('✅ JWT token obtained successfully (using cache if available)');
  } catch (error) {
    console.error('Auth failed:', error.message || error);
    process.exitCode = 1;
    return;
  }

  // Step 2: iterate through all endpoints
  const headersBase = (ep) => {
    const h = {
      Accept: 'application/json',
      'Accept-Encoding': 'br, deflate, gzip, x-gzip',
      'grpc-accept-encoding': 'gzip',
    };
    if (ep.requiresAuth) {
      h['Authorization'] = jwtToken;
    }
    return h;
  };

  // Optional selection of endpoints by names (comma-separated), e.g., "Assets,GetAsset"
  const namesArg = process.argv[2];
  const selectionSet = namesArg && namesArg.trim()
    ? new Set(namesArg.split(',').map(s => s.trim()).filter(Boolean))
    : null;
  if (selectionSet && selectionSet.size) {
    console.log('Selected endpoints:', Array.from(selectionSet).join(', '));
  }

  for (const ep of FINAM_API_REGISTRY) {
    if (ep.name === 'Auth') {
      continue; // already done
    }

    // If a selection is provided, skip endpoints not in the selection
    if (selectionSet && !selectionSet.has(ep.name)) {
      continue;
    }

    const placeholders = { ...commonPlaceholders, jwtToken };

    // Simple placeholders substitution: try to replace everything available

    const { method } = ep;
    const req = {
      endpoint: replacer(ep.endpoint, placeholders),
      method,
      headers: headersBase(ep),
      queryParams: replacer(ep.queryParams || {}, placeholders),
      body: replacer(ep.data || {}, placeholders),
    };
    const url = new URL(req.endpoint, baseUrl).toString();
    req.url = url;

    let resp;
    let err;
    const started = nowIso();
    try {
      const options = {
        method,
        headers: { ...req.headers },
        responseType: 'json',
      };
      if (['POST', 'PUT'].includes(method) && isNonEmptyObject(req.body)) {
        options.json = req.body;
      }
      if (isNonEmptyObject(req.queryParams)) {
        options.searchParams = req.queryParams;
      }
      const t0 = Date.now();
      const res = await h2(url, options);
      const ms = Date.now() - t0;
      const respBase = {
        status: res.statusCode,
        statusText: res.statusMessage || '',
        headers: res.headers || {},
        durationMs: ms,
        body: res.body,
        url,
      };
      const expected = ep.expectedStatus ?? 200;
      let ok;
      let missingProps;
      let checkOk;
      if (respBase.status === expected) {
        const v = validateByExpectedProps(ep, respBase.body);
        ok = v.ok;
        missingProps = v.missingProps;
        checkOk = v.checkOk;
      } else {
        ok = false;
      }
      resp = { ...respBase, ok, ...(Array.isArray(missingProps) ? { missingProps } : {}), ...(typeof checkOk === 'boolean' ? { checkOk } : {}) };
    } catch (e) {
      err = e;
    }
    const report = toMarkdownReport({ ep, request: req, response: resp, error: err, started, finished: nowIso() });
    const filename = path.join('_test-data', `${ep.fullId}.md`);
    fs.writeFileSync(filename, report, 'utf8');

    // Basic console output
    if (err) {
      console.error(`[${ep.fullId}] ${ep.name}: ERROR:`, err.message || err);
    } else {
      if (resp.ok) {
        console.log(`[${ep.fullId}] ✅  ${ep.name}`);
      } else {
        const st = resp.statusText ? ` ${resp.statusText}` : '';
        let msg = '';
        try {
          if (resp.status >= 400 && resp.body != null) {
            if (typeof resp.body === 'string') {
              // If server returned plain text, include it
              msg = resp.body.trim() ? ` ${resp.body}` : '';
            } else if (typeof resp.body === 'object') {
              const m = resp.body.message || resp.body.error || resp.body.detail;
              if (m && typeof m === 'string') {
                msg = ` ${m}`;
              }
            }
          }
        } catch {
          // ignore extraction errors
        }
        const missingPropsMsg = Array.isArray(resp.missingProps) && resp.missingProps.length
          ? `; отсутствуют свойства: ${resp.missingProps.join(', ')}`
          : '';
        const checkFieldsMsg = (typeof resp.checkOk === 'boolean' && resp.checkOk === false && !(Array.isArray(resp.missingProps) && resp.missingProps.length))
          ? '; validation.checkFields() не пройдена'
          : '';
        console.log(`[${ep.fullId}] ❌  ${ep.name}: ${resp.status}${st}${msg}${missingPropsMsg}${checkFieldsMsg}`);
      }
    }
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error('Fatal error:', e);
    process.exitCode = 1;
  });
}
