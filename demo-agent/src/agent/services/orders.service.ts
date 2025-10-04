import type { OrderPreviewBlock, OrderDetails } from '../../types/index.js';

interface OrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  type: 'MARKET' | 'LIMIT' | 'STOP';
  price?: string;
}

/**
 * OrdersService - Handles order preview and confirmation
 */
export class OrdersService {
  private confirmTokens: Map<string, { params: OrderParams; expiresAt: number }>;
  private readonly TOKEN_TTL = 30000; // 30 seconds

  constructor () {
    this.confirmTokens = new Map();
    // Clean up expired tokens every minute
    setInterval(() => this.cleanupExpiredTokens(), 60000);
  }

  /**
   * Generate order preview with confirmation token
   */
  async generatePreview (params: OrderParams, currentPrice?: string): Promise<OrderPreviewBlock> {
    // Use provided price or estimate from params
    const price = params.type === 'MARKET' ? currentPrice : params.price;
    if (!price) {
      throw new Error('Price required for order preview');
    }

    const priceNum = parseFloat(price);
    const commission = priceNum * params.quantity * 0.0005; // 0.05%
    const total = priceNum * params.quantity + commission;

    const confirmToken = this.generateConfirmToken();

    // Cache the order params with expiration
    this.confirmTokens.set(confirmToken, {
      params,
      expiresAt: Date.now() + this.TOKEN_TTL,
    });

    return {
      type: 'order_preview',
      order: {
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        type: params.type,
        price: params.price,
        estimated_total: total.toFixed(2),
        estimated_commission: commission.toFixed(2),
      },
      warnings: this.generateWarnings(params, total),
      confirmToken,
    };
  }

  /**
   * Validate and retrieve order params from confirm token
   */
  validateConfirmToken (token: string): OrderParams | null {
    const cached = this.confirmTokens.get(token);

    if (!cached) {
      return null;
    }

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      this.confirmTokens.delete(token);
      return null;
    }

    // Token is valid, delete it (one-time use)
    this.confirmTokens.delete(token);
    return cached.params;
  }

  /**
   * Generate warnings for order
   */
  private generateWarnings (params: OrderParams, total: number): string[] {
    const warnings: string[] = [];

    if (params.type === 'MARKET') {
      warnings.push('⚠️ Рыночная заявка - цена исполнения может отличаться');
    }

    if (total > 50000) {
      warnings.push('⚠️ Крупная сделка (>50K ₽)');
    }

    return warnings;
  }

  /**
   * Generate unique confirmation token
   */
  private generateConfirmToken (): string {
    return `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens (): void {
    const now = Date.now();
    for (const [token, data] of this.confirmTokens.entries()) {
      if (now > data.expiresAt) {
        this.confirmTokens.delete(token);
      }
    }
  }
}
