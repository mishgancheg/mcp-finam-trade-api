// noinspection UnnecessaryLocalVariableJS

import { Assets } from '../api.js';
import type { Asset } from '../types/finam-trade-api-interfaces.js';
import { promises as fs } from 'fs';
import path from 'path';
import { projectRoot } from '../init-config.js';

export type TransportType = 'stdio' | 'http' | 'sse';

// Cache configuration
const CACHE_FILE_PATH = path.join(projectRoot, 'assets_data.json');
const CACHE_MAX_AGE = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

interface CacheData {
  timestamp: number;
  assets: Asset[];
}

/**
 * Instrument search manager with exact search only
 */
export class InstrumentSearch {
  private exactSearchCache: Map<string, Asset> | null = null;
  private symbolMap: Map<string, Asset> = new Map();
  private idMap: Map<string, Asset> = new Map();
  private isinMap: Map<string, Asset> = new Map();
  private tickerMap: Map<string, Asset> = new Map();
  private transport: TransportType = 'stdio';
  private isInitialized = false;
  private refreshTimer: NodeJS.Timeout | null = null;

  /**
   * Set transport type
   */
  setTransport (transport: TransportType): void {
    this.transport = transport;
  }

  /**
   * Initialize search engine
   */
  async initialize (): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const secretToken = process.env.API_SECRET_TOKEN;
    if (!secretToken) {
      throw new Error('API_SECRET_TOKEN not configured');
    }

    // Try to load from disk cache first
    const cachedData = await this.loadFromDisk();

    if (cachedData && !this.isCacheStale(cachedData.timestamp)) {
      // Use fresh cache from disk
      console.log(`✓  Loaded ${cachedData.assets.length} instruments from disk cache`);
      this.buildExactSearchCache(cachedData.assets);
    } else {
      // Cache missing or stale - fetch from API
      if (cachedData) {
        console.log('⏰ Disk cache is stale (>4 hours), refreshing...');
      } else {
        console.log('📥 No disk cache found, fetching from API...');
      }

      const assetsResponse = await Assets({ secret_token: secretToken });
      const instruments = assetsResponse.assets || [];
      console.log(`☑️ Fetched ${instruments.length} instruments from API`);

      // Save to disk cache
      await this.saveToDisk(instruments);

      // Build exact search cache
      this.buildExactSearchCache(instruments);
    }

    this.isInitialized = true;
    console.log('✅  Instrument search ready');
  }

  /**
   * Search for instrument by exact match (symbol, id, isin, ticker)
   */
  async search (query: string): Promise<Asset[]> {
    // Ensure cache is loaded
    if (!this.exactSearchCache) {
      await this.loadExactSearchCache();
    }

    const normalizedQuery = query.trim().toUpperCase();

    // Check all exact match maps
    const result = this.symbolMap.get(normalizedQuery)
      || this.idMap.get(normalizedQuery)
      || this.isinMap.get(normalizedQuery)
      || this.tickerMap.get(normalizedQuery);
    return result ? [result] : [];
  }

  /**
   * Start cache refresh timer for HTTP/SSE transport
   */
  startCacheRefresh (): void {
    if (this.transport === 'stdio') {
      // STDIO doesn't need periodic refresh - it checks on each startup
      return;
    }

    // Clear existing timer if any
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Set up periodic refresh every 4 hours
    this.refreshTimer = setInterval(async () => {
      try {
        console.log('🔄 Starting periodic cache refresh...');
        const secretToken = process.env.API_SECRET_TOKEN;
        if (!secretToken) {
          console.error('❌ API_SECRET_TOKEN not configured for cache refresh');
          return;
        }

        const assetsResponse = await Assets({ secret_token: secretToken });
        const instruments = assetsResponse.assets || [];
        console.log(`✓  Refreshed ${instruments.length} instruments from API`);

        // Save to disk
        await this.saveToDisk(instruments);

        // Rebuild in-memory indexes
        this.buildExactSearchCache(instruments);

        console.log('✅  Cache refresh completed');
      } catch (error) {
        console.error('❌  Cache refresh failed:', error);
      }
    }, CACHE_MAX_AGE);

    console.log('⏰  Cache refresh timer started (every 4 hours)');
  }

  /**
   * Stop cache refresh timer
   */
  stopCacheRefresh (): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('⏹️ Cache refresh timer stopped');
    }
  }

  /**
   * Load cache from disk
   */
  private async loadFromDisk (): Promise<CacheData | null> {
    try {
      const data = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
      const cacheData: CacheData = JSON.parse(data);
      return cacheData;
    } catch {
      // File doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Save cache to disk
   */
  private async saveToDisk (assets: Asset[]): Promise<void> {
    const cacheData: CacheData = {
      timestamp: Date.now(),
      assets,
    };

    try {
      await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2), 'utf-8');
      console.log(`💾 Saved ${assets.length} instruments to disk cache`);
    } catch (error) {
      console.error('❌ Failed to save cache to disk:', error);
    }
  }

  /**
   * Check if cache is stale (older than 4 hours)
   */
  private isCacheStale (timestamp: number): boolean {
    const age = Date.now() - timestamp;
    return age > CACHE_MAX_AGE;
  }

  /**
   * Build exact search cache from instruments
   */
  private buildExactSearchCache (instruments: Asset[]): void {
    this.exactSearchCache = new Map();
    this.symbolMap.clear();
    this.idMap.clear();
    this.isinMap.clear();
    this.tickerMap.clear();

    for (const instrument of instruments) {
      this.exactSearchCache.set(instrument.id, instrument);
      this.symbolMap.set(instrument.symbol.toUpperCase(), instrument);
      this.idMap.set(instrument.id, instrument);
      if (instrument.isin) {
        this.isinMap.set(instrument.isin.toUpperCase(), instrument);
      }
      this.tickerMap.set(instrument.ticker.toUpperCase(), instrument);
    }

    console.log(`✓  Built exact search cache with ${instruments.length} instruments`);
  }

  /**
   * Load exact search cache (lazy loading)
   */
  private async loadExactSearchCache (): Promise<void> {
    if (this.exactSearchCache) {
      return;
    }

    console.log('📥 Loading instruments for exact search...');
    const secretToken = process.env.API_SECRET_TOKEN;
    if (!secretToken) {
      throw new Error('API_SECRET_TOKEN not configured');
    }

    const assetsResponse = await Assets({ secret_token: secretToken });
    const instruments = assetsResponse.assets || [];
    this.buildExactSearchCache(instruments);
  }
}

// Singleton instance
let instrumentSearch: InstrumentSearch | null = null;

/**
 * Get singleton InstrumentSearch instance
 */
export function getInstrumentSearch (): InstrumentSearch {
  if (!instrumentSearch) {
    instrumentSearch = new InstrumentSearch();
  }
  return instrumentSearch;
}
