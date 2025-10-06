import { randomUUID } from 'crypto';
import { PortfolioService } from './portfolio.service.js';
import type { RenderBlock, ToolCall } from '../../types/index.js';

/**
 * Tag pattern types
 */
interface ChartTag {
  type: 'chart';
  chartType: string;
  symbol?: string;
  fullMatch: string;
}

interface TableTag {
  type: 'table';
  tableType: string;
  criteria?: string;
  fullMatch: string;
}

interface RebalanceTag {
  type: 'rebalance';
  target: string;
  fullMatch: string;
}

type ParsedTag = ChartTag | TableTag | RebalanceTag;

/**
 * Spec cache with TTL
 */
class SpecCache {
  private cache: Map<string, { block: RenderBlock; expires: number }> = new Map();
  private readonly TTL = 10 * 60 * 1000; // 10 minutes

  set(id: string, block: RenderBlock): void {
    this.cache.set(id, {
      block,
      expires: Date.now() + this.TTL,
    });
  }

  get(id: string): RenderBlock | null {
    const entry = this.cache.get(id);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(id);
      return null;
    }

    return entry.block;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [id, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(id);
      }
    }
  }
}

export const specCache = new SpecCache();

// Cleanup expired specs every minute
setInterval(() => specCache.cleanup(), 60 * 1000);

/**
 * TagProcessor - Parses visualization tags and generates specs
 */
export class TagProcessor {
  private portfolioService: PortfolioService;

  constructor() {
    this.portfolioService = new PortfolioService();
  }

  /**
   * Parse all tags from text
   */
  parseTags(text: string): ParsedTag[] {
    const tags: ParsedTag[] = [];

    // Chart tags: <chart type="..." symbol="..."/>
    const chartRegex = /<chart\s+type="([^"]+)"(?:\s+symbol="([^"]+)")?\s*\/>/g;
    let match;

    while ((match = chartRegex.exec(text)) !== null) {
      tags.push({
        type: 'chart',
        chartType: match[1],
        symbol: match[2],
        fullMatch: match[0],
      });
    }

    // Table tags: <table type="..." criteria="..."/>
    const tableRegex = /<table\s+type="([^"]+)"(?:\s+criteria="([^"]+)")?\s*\/>/g;

    while ((match = tableRegex.exec(text)) !== null) {
      tags.push({
        type: 'table',
        tableType: match[1],
        criteria: match[2],
        fullMatch: match[0],
      });
    }

    // Rebalance tags: <rebalance target="..."/>
    const rebalanceRegex = /<rebalance\s+target="([^"]+)"\s*\/>/g;

    while ((match = rebalanceRegex.exec(text)) !== null) {
      tags.push({
        type: 'rebalance',
        target: match[1],
        fullMatch: match[0],
      });
    }

    return tags;
  }

  /**
   * Process text: parse tags, generate specs, cache, replace with refs
   */
  async processText(text: string, toolCalls: ToolCall[]): Promise<string> {
    const tags = this.parseTags(text);
    if (tags.length === 0) return text;

    let processedText = text;

    // Get account data from tool calls
    const accountCall = toolCalls.find(tc => tc.name === 'GetAccount');
    const account = accountCall?.result;

    const tradesCall = toolCalls.find(tc => tc.name === 'Trades');
    const trades = tradesCall?.result?.trades || [];

    const barsCall = toolCalls.find(tc => tc.name === 'Bars');
    const benchmarkBars = barsCall?.result?.bars || [];

    // Process each tag
    for (const tag of tags) {
      const block = await this.generateBlock(tag, { account, trades, benchmarkBars });
      if (!block) continue;

      // Generate unique ID
      const id = randomUUID();

      // Cache the spec
      specCache.set(id, block);

      // Replace tag with reference
      const refTag = this.createRefTag(tag.type, id);
      processedText = processedText.replace(tag.fullMatch, refTag);
    }

    return processedText;
  }

  /**
   * Generate block from tag
   */
  private async generateBlock(
    tag: ParsedTag,
    data: { account?: any; trades?: any[]; benchmarkBars?: any[] }
  ): Promise<RenderBlock | null> {
    if (!data.account) return null;

    if (tag.type === 'chart') {
      return this.portfolioService.generateChartBlock(tag.chartType, data, tag.symbol);
    }

    if (tag.type === 'table') {
      return this.portfolioService.generateTableBlock(tag.tableType, data, tag.criteria);
    }

    if (tag.type === 'rebalance') {
      return this.portfolioService.generateRebalanceBlock(data.account.positions, tag.target);
    }

    return null;
  }

  /**
   * Create reference tag
   */
  private createRefTag(type: string, id: string): string {
    return `<${type}-ref id="${id}"/>`;
  }
}
