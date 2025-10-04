import type {
  RenderSpec,
  SummaryBlock,
  TableBlock,
  Account,
  Position,
  Trade,
} from '../../types/index.js';
import { SpecGenerator } from './spec-generator.js';

/**
 * PortfolioService - Handles portfolio analysis and visualization
 */
export class PortfolioService {
  private specGen: SpecGenerator;

  constructor () {
    this.specGen = new SpecGenerator();
  }

  /**
   * Basic portfolio analysis (summary + table)
   */
  async analyze (account: Account): Promise<RenderSpec> {
    const summary = this.generateSummary(account);
    const positionsTable = this.generatePositionsTable(account.positions);

    return {
      blocks: [summary, positionsTable],
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'emulator',
      },
    };
  }

  /**
   * Deep portfolio analysis with charts and rebalancing
   */
  async analyzeDeep (account: Account, trades: Trade[], benchmarkBars?: any[]): Promise<RenderSpec> {
    const summary = this.generateSummary(account);
    const sunburst = this.specGen.generatePortfolioSunburst(account.positions);

    const blocks: any[] = [summary, sunburst];

    // Add equity curve
    if (benchmarkBars && benchmarkBars.length > 0) {
      blocks.push(this.specGen.generateEquityCurveWithBenchmark(trades, benchmarkBars));
    } else {
      blocks.push(this.specGen.generateEquityCurve(trades));
    }

    // Add positions table
    blocks.push(this.generatePositionsTable(account.positions));

    // Add rebalance simulation (equal weight)
    const equalWeight = 100 / account.positions.length;
    const targetWeights: Record<string, number> = {};
    account.positions.forEach(p => {
      targetWeights[p.symbol] = equalWeight;
    });
    blocks.push(this.specGen.generateRebalanceBlock(account.positions, targetWeights));

    return {
      blocks,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'emulator',
      },
    };
  }

  /**
   * Generate summary block
   */
  private generateSummary (account: Account): SummaryBlock {
    const totalPnL = account.positions.reduce((sum, p) => sum + parseFloat(p.unrealized_pnl || '0'), 0);

    return {
      type: 'summary',
      title: 'Портфель',
      bullets: [
        `💰 Стоимость: ${account.equity.value} ₽`,
        `📊 Позиций: ${account.positions.length}`,
        `${totalPnL >= 0 ? '📈' : '📉'} P&L: ${totalPnL.toFixed(2)} ₽`,
      ],
      highlights: {
        positive: totalPnL >= 0 ? [`+${totalPnL.toFixed(2)} ₽`] : undefined,
        negative: totalPnL < 0 ? [`${totalPnL.toFixed(2)} ₽`] : undefined,
      },
    };
  }

  /**
   * Generate positions table
   */
  private generatePositionsTable (positions: Position[]): TableBlock {
    return {
      type: 'table',
      title: 'Позиции',
      columns: [
        { id: 'symbol', label: 'Тикер', type: 'text' },
        { id: 'quantity', label: 'Кол-во', type: 'number' },
        { id: 'avg_price', label: 'Средняя', type: 'currency' },
        { id: 'current_price', label: 'Текущая', type: 'currency' },
        { id: 'unrealized_pnl', label: 'P&L', type: 'currency' },
      ],
      rows: positions.map(p => ({
        symbol: p.symbol,
        quantity: p.quantity.value,
        avg_price: p.average_price?.value || '0',
        current_price: p.current_price?.value || '0',
        unrealized_pnl: p.unrealized_pnl || '0',
      })),
      sortable: true,
    };
  }
}
