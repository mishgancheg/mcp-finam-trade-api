import dotenv from 'dotenv';
import got from 'got';
import { getJti } from './utils.js';

dotenv.config();

let baseUrl = process.env.API_BASE_URL;

if (!baseUrl) {
  throw new Error('API_BASE_URL is not set in .env');
}

interface CacheEntry {
  jwt: string;
  expire: number;
}

interface AuthResponse {
  token: string;
}

// Create HTTP/2 client
const h2 = got.extend({
  http2: true,
  decompress: true,
  throwHttpErrors: false,
  retry: { limit: 0 },
});

// Cache storage: Map<jti, { jwt, expire }>
const jwtCache = new Map<string, CacheEntry>();

/**
 * Get JWT token by secret token with caching
 * @param secretToken - Secret token from FINAM Trade API
 * @returns JWT token string
 * @throws Error if authentication fails
 */
export async function getJwtToken (secretToken: string): Promise<string> {
  if (!secretToken) {
    throw new Error('Secret token is required');
  }

  // Try to get jti from secret token
  let jti: string | null = null;
  try {
    jti = getJti(secretToken);
  } catch (err) {
    console.log(err);
    jti = secretToken;
  }

  if (!jti) {
    jti = secretToken;
  }

  // Check cache
  const now = Date.now();
  const cached = jwtCache.get(jti);

  if (cached && cached.expire > now) {
    // Cache hit - return cached JWT
    return cached.jwt;
  }

  // Cache miss or expired - fetch new JWT
  const authUrl = new URL('/v1/sessions', baseUrl).toString();
  const options = {
    method: 'POST' as const,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    json: {
      secret: secretToken,
    },
    responseType: 'json' as const,
  };

  try {
    const response = await h2(authUrl, options);

    if (response.statusCode !== 200) {
      throw new Error(`Auth failed with status ${response.statusCode}: ${response.statusMessage || ''}`);
    }

    const body = response.body as AuthResponse;

    if (!body?.token) {
      throw new Error('Auth succeeded but token not found in response');
    }

    const jwtToken = body.token;

    // Extract expiration time from JWT and cache it
    try {
      // Parse JWT to get expiration
      const parts = jwtToken.split('.');
      if (parts.length >= 2 && parts[1]) {
        const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadStr);

        // Use exp field if available, otherwise default to 15 minutes
        const exp = payload.exp;
        let expireTime: number;

        if (exp && typeof exp === 'number') {
          // exp is in seconds, convert to milliseconds and subtract 1 minute for safety
          expireTime = (exp * 1000) - 60000;
        } else {
          // Default to 14 minutes from now (15 min token lifetime - 1 min safety margin)
          expireTime = now + (14 * 60 * 1000);
        }

        // Store in cache
        jwtCache.set(jti, {
          jwt: jwtToken,
          expire: expireTime,
        });
      }
    } catch (cacheError) {
      // If we can't parse JWT for caching, just return the token
      console.warn('Failed to cache JWT token:', cacheError);
    }

    return jwtToken;

  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Authentication failed: ${String(error)}`);
  }
}

/**
 * Clear JWT cache
 */
export function clearJwtCache (): void {
  jwtCache.clear();
}

/**
 * Remove specific JWT from cache
 * @param secretToken - Secret token to remove from cache
 */
export function invalidateJwtCache (secretToken: string): void {
  let jti: string | null = null;
  try {
    jti = getJti(secretToken);
  } catch (err) {
    console.log(err);
    jti = secretToken;
  }

  if (!jti) {
    jti = secretToken;
  }

  jwtCache.delete(jti);
}
