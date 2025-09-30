import fs from 'node:fs';

export const getJti = (jwt: string): string | null => {
  // noinspection SuspiciousTypeOfGuard
  if (typeof jwt !== 'string') {
    throw new TypeError('JWT should be a string');
  }
  const parts = jwt.split('.');
  if (parts.length < 2) {
    throw new Error('Incorrect JWT: 3 parts are expected');
  }
  const str = parts[1];
  const pad = 4 - (str!.length % 4 || 4); // Добавляем недостающий padding
  const padded = str + '='.repeat(pad === 4 ? 0 : pad);
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/'); // Меняем URL-безопасные символы на стандартные
  const payloadStr = Buffer.from(b64, 'base64').toString('utf8');
  const payload = JSON.parse(payloadStr);
  return payload.jti ?? null; // вернёт строку или null, если jti нет
}

/**
 * Format network/HTTP errors into concise, readable messages
 * @param {Error | any} error - The error object from got/node
 * @returns {string} - Formatted error message
 */
export function formatHttpError (error: any): string {
  // Connection errors
  if (error.code === 'ECONNREFUSED') {
    const url = error.options?.url || error.url;
    const host = url ? new URL(url).host : 'server';
    return `❌  Connection refused to ${host} - server is not running or unreachable`;
  }

  if (error.code === 'ENOTFOUND') {
    const hostname = error.hostname || error.options?.url?.hostname || 'host';
    return `❌  DNS lookup failed for ${hostname} - host not found`;
  }

  if (error.code === 'ETIMEDOUT') {
    return '❌  Connection timeout - server took too long to respond';
  }

  if (error.code === 'ECONNRESET') {
    return '❌  Connection reset by server - the connection was closed unexpectedly';
  }

  if (error.code === 'EPIPE') {
    return '❌  Broken pipe - connection was closed while sending data';
  }

  if (error.code === 'ENETUNREACH') {
    return '❌  Network unreachable - no route to host';
  }

  if (error.code === 'EHOSTUNREACH') {
    return '❌  Host unreachable - cannot reach the destination host';
  }

  // TLS/SSL errors
  if (error.code === 'CERT_HAS_EXPIRED') {
    return '❌  SSL certificate has expired';
  }

  if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    return '❌  SSL certificate verification failed - untrusted certificate';
  }

  if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
    return '❌  Self-signed SSL certificate rejected';
  }

  // HTTP errors (got specific)
  if (error.name === 'HTTPError' && error.response) {
    const status = error.response.statusCode;
    const statusText = error.response.statusMessage || '';
    const body = error.response.body;

    let message = `❌  HTTP ${status}${statusText ? ' ' + statusText : ''}`;

    // Try to extract error message from response body
    if (body) {
      try {
        if (typeof body === 'string') {
          message += `: ${body.substring(0, 200)}`;
        } else if (typeof body === 'object') {
          const errorMsg = body.message || body.error || body.detail || body.error_description;
          if (errorMsg) {
            message += `: ${errorMsg}`;
          }
        }
      } catch {
        // Ignore extraction errors
      }
    }

    return message;
  }

  // Request errors (got specific)
  if (error.name === 'RequestError') {
    // Extract the underlying error if available
    const cause = error.cause || error;
    if (cause && cause.code && cause !== error) {
      return formatHttpError(cause);
    }

    // Generic request error
    if (error.message) {
      // Clean up the message - remove stack traces and technical details
      const cleanMessage = error.message.split('\n')[0].trim();
      return `❌  Request failed: ${cleanMessage}`;
    }
  }

  // Aggregate errors (multiple connection attempts)
  if (error.name === 'AggregateError' || (error.code === 'ECONNREFUSED' && error.errors)) {
    // This typically happens when both IPv4 and IPv6 connections fail
    const url = error.options?.url || error.url;
    const host = url ? new URL(url).host : 'server';
    return `❌  All connection attempts failed to ${host} - server is not running`;
  }

  // Generic fallback
  if (error.message) {
    // Clean up the message - take only the first line
    const cleanMessage = error.message.split('\n')[0].trim();
    return `❌  ${cleanMessage}`;
  }

  return `❌  Unknown error: ${error.toString()}`;
}

/**
 * Check if value is a non-empty object
 */
export function isNonEmptyObject (v: any): boolean {
  return v && typeof v === 'object' && Object.keys(v).length > 0;
}

/**
 * Ensure directory exists, create if not
 */
export function ensureDir (p: string): void {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

// TypeScript
export const toDecimalString = (quantity: number): string => {
  if (!Number.isFinite(quantity)) {
    throw new Error('quantity должен быть конечным числом');
  }

  // Handle zero
  if (quantity === 0) {
    return '0';
  }

  const plain = quantity.toString();

  // If no scientific notation, clean up trailing zeros
  if (!/[eE]/.test(plain)) {
    let s = plain.replace(/^\+/, '');

    // For floating point artifacts like 2.5000000000000004, round to reasonable precision
    if (s.includes('.')) {
      // Count significant decimal places (ignoring trailing zeros and artifacts)
      const parts = s.split('.');
      if (parts[1]) {
        // Remove trailing zeros first
        let fracPart = parts[1].replace(/0+$/, '');

        // If there are many digits (>10), it's likely a floating point artifact
        // Round to remove artifacts but keep precision
        if (fracPart.length > 10) {
          const rounded = Math.round(quantity * 1e10) / 1e10;
          s = rounded.toString();
        }

        // Clean up trailing zeros
        s = s.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
        if (s.endsWith('.')) {
          s = s.slice(0, -1);
        }
      }
    }
    return s;
  }

  // Handle scientific notation
  const sign = quantity < 0 ? '-' : '';
  const abs = Math.abs(quantity);

  // Parse scientific notation manually
  const match = abs.toString().match(/^(\d+\.?\d*)e([+-]?\d+)$/i);
  if (!match || !match[1] || !match[2]) {
    // Fallback to toFixed for edge cases
    return abs.toFixed(20).replace(/\.?0+$/, '');
  }

  const mantissa = match[1];
  const exponentStr = match[2];
  const exponent = parseInt(exponentStr, 10);

  // Remove decimal point from mantissa
  const parts = mantissa.split('.');
  const intPart = parts[0] || '';
  const fracPart = parts[1] || '';
  const allDigits = intPart + fracPart;
  const mantissaDecimals = fracPart.length;

  if (exponent >= 0) {
    // Positive exponent: shift decimal right
    const shift = exponent + mantissaDecimals;
    if (shift >= allDigits.length) {
      // Add zeros at the end
      return sign + allDigits + '0'.repeat(shift - allDigits.length);
    } else {
      // Insert decimal point
      const newInt = allDigits.slice(0, shift + 1);
      const newFrac = allDigits.slice(shift + 1);
      return sign + (newFrac ? newInt + '.' + newFrac : newInt);
    }
  } else {
    // Negative exponent: shift decimal left
    const absExp = Math.abs(exponent);

    // Calculate position where decimal should go
    // For 1.2e-7: intPart=1, allDigits=12, absExp=7
    // We need: 0.00000012 (7 zeros before "12")
    const decimalPos = intPart.length - absExp;

    if (decimalPos <= 0) {
      // Need leading zeros
      const leadingZeros = Math.abs(decimalPos);
      const result = '0.' + '0'.repeat(leadingZeros) + allDigits;
      return sign + result.replace(/\.?0+$/, '');
    } else {
      // Decimal goes inside the number
      const newInt = allDigits.slice(0, decimalPos);
      const newFrac = allDigits.slice(decimalPos);
      if (!newFrac) {
        return sign + newInt;
      }
      const result = newInt + '.' + newFrac;
      return sign + result.replace(/\.?0+$/, '');
    }
  }
};
