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
   * Generate chart block by type
   */
  generateChartBlock(
    chartType: string,
    data: { account?: any; trades?: any[]; benchmarkBars?: any[] },
    symbol?: string
  ): any {
    const { account, trades = [], benchmarkBars = [] } = data;

    switch (chartType) {
      case 'portfolio-sunburst':
        return this.specGen.generatePortfolioSunburst(account.positions);

      case 'equity-curve':
        return this.specGen.generateEquityCurve(trades);

      case 'equity-curve-benchmark':
        return this.specGen.generateEquityCurveWithBenchmark(trades, benchmarkBars);

      case 'trades-chart':
        if (!symbol) return null;
        // Need to get bars for the symbol - this should be done via tool call
        return null; // TODO: implement when bars are available

      default:
        return null;
    }
  }

  /**
   * Generate table block by type
   */
  generateTableBlock(
    tableType: string,
    data: { account?: any; trades?: any[] },
    criteria?: string
  ): any {
    const { account, trades = [] } = data;

    switch (tableType) {
      case 'positions':
        return this.generatePositionsTable(account.positions);

      case 'trades':
        return this.generateTradesTable(trades);

      case 'scanner':
        // TODO: implement market scanner
        return null;

      default:
        return null;
    }
  }

  /**
   * Generate rebalance block
   */
  generateRebalanceBlock(positions: Position[], target: string): any {
    if (target === 'equal') {
      const equalWeight = 100 / positions.length;
      const targetWeights: Record<string, number> = {};
      positions.forEach(p => {
        targetWeights[p.symbol] = equalWeight;
      });
      return this.specGen.generateRebalanceBlock(positions, targetWeights);
    }

    return null;
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

  /**
   * Generate trades table
   */
  private generateTradesTable(trades: Trade[]): TableBlock {
    return {
      type: 'table',
      title: 'Сделки',
      columns: [
        { id: 'timestamp', label: 'Дата/Время', type: 'text' },
        { id: 'symbol', label: 'Инструмент', type: 'text' },
        { id: 'side', label: 'Направление', type: 'text' },
        { id: 'quantity', label: 'Количество', type: 'number' },
        { id: 'price', label: 'Цена', type: 'currency' },
      ],
      rows: trades.map(t => ({
        timestamp: new Date(t.timestamp).toLocaleString('ru-RU'),
        symbol: t.symbol,
        side: t.side === 'SIDE_BUY' ? 'Покупка' : 'Продажа',
        quantity: t.quantity?.value || '0',
        price: t.executed_price?.value || '0',
      })),
      sortable: true,
    };
  }
}
