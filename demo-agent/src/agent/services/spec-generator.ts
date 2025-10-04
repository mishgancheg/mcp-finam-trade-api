import type {
  ChartBlock,
  TableBlock,
  Position,
  Trade,
  Bar,
  RebalanceBlock,
  AllocationItem,
} from '../../types/index.js';

/**
 * SpecGenerator - Generates visualization specifications for different chart types
 */
export class SpecGenerator {
  /**
   * Generate ECharts Sunburst for portfolio structure
   */
  generatePortfolioSunburst (positions: Position[]): ChartBlock {
    const data = positions.map(p => ({
      name: p.symbol,
      value: parseFloat(p.current_price?.value || '0') * parseFloat(p.quantity.value),
    }));

    return {
      type: 'chart',
      engine: 'echarts',
      chartKind: 'sunburst',
      title: 'Структура портфеля',
      spec: {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ₽ ({d}%)',
        },
        series: [{
          type: 'sunburst',
          data: data,
          radius: [0, '90%'],
          label: {
            rotate: 'radial',
          },
        }],
      },
    };
  }

  /**
   * Generate Lightweight-Charts equity curve
   */
  generateEquityCurve (trades: Trade[]): ChartBlock {
    const equityData = this.calculateEquitySeries(trades);

    return {
      type: 'chart',
      engine: 'lightweight',
      chartKind: 'equity-curve',
      title: 'Кривая капитала',
      spec: {
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333',
        },
        series: [{
          type: 'Area',
          data: equityData,
          lineColor: '#2962FF',
          topColor: 'rgba(41, 98, 255, 0.3)',
          bottomColor: 'rgba(41, 98, 255, 0.05)',
        }],
      },
    };
  }

  /**
   * Generate Equity Curve with BENCHMARK (IMOEX)
   */
  generateEquityCurveWithBenchmark (trades: Trade[], benchmarkBars: Bar[]): ChartBlock {
    const equityData = this.calculateEquitySeries(trades);
    const benchmarkData = this.normalizeBenchmark(benchmarkBars, 200000);

    return {
      type: 'chart',
      engine: 'lightweight',
      chartKind: 'equity-curve-benchmark',
      title: 'Кривая капитала vs IMOEX',
      spec: {
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333',
        },
        series: [
          {
            type: 'Area',
            data: equityData,
            lineColor: '#2962FF',
            topColor: 'rgba(41, 98, 255, 0.3)',
            bottomColor: 'rgba(41, 98, 255, 0.05)',
          },
          {
            type: 'Line',
            data: benchmarkData,
            lineColor: '#999',
            lineStyle: 1, // dotted
            lineWidth: 2,
          },
        ],
      },
    };
  }

  /**
   * Generate chart with TRADE MARKERS (entry/exit points)
   */
  generateTradesChart (symbol: string, bars: Bar[], trades: Trade[]): ChartBlock {
    const candleData = bars.map(b => ({
      time: b.timestamp.split('T')[0],
      open: parseFloat(b.open),
      high: parseFloat(b.high),
      low: parseFloat(b.low),
      close: parseFloat(b.close),
    }));

    const markers = trades
      .filter(t => t.symbol === symbol)
      .map(t => ({
        time: t.timestamp.split('T')[0],
        position: (t.side === 'SIDE_BUY' ? 'belowBar' : 'aboveBar') as 'belowBar' | 'aboveBar',
        color: t.side === 'SIDE_BUY' ? '#26a69a' : '#ef5350',
        shape: (t.side === 'SIDE_BUY' ? 'arrowUp' : 'arrowDown') as 'arrowUp' | 'arrowDown',
        text: `${t.side === 'SIDE_BUY' ? 'B' : 'S'} ${t.quantity.value}@${t.executed_price?.value}`,
      }));

    return {
      type: 'chart',
      engine: 'lightweight',
      chartKind: 'trades-chart',
      title: `${symbol} - График сделок`,
      spec: {
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333',
        },
        series: [{
          type: 'Candlestick',
          data: candleData,
        }],
      },
      markers,
    };
  }

  /**
   * Generate REBALANCE block
   */
  generateRebalanceBlock (positions: Position[], targetWeights: Record<string, number>): RebalanceBlock {
    const totalValue = positions.reduce((sum, p) =>
      sum + parseFloat(p.current_price?.value || '0') * parseFloat(p.quantity.value), 0,
    );

    const currentAllocation: AllocationItem[] = positions.map(p => {
      const value = parseFloat(p.current_price?.value || '0') * parseFloat(p.quantity.value);
      return {
        symbol: p.symbol,
        weight: (value / totalValue) * 100,
        value,
      };
    });

    const targetAllocation: AllocationItem[] = Object.entries(targetWeights).map(([symbol, weight]) => ({
      symbol,
      weight,
      value: (weight / 100) * totalValue,
    }));

    // Calculate required trades
    const trades = targetAllocation.map(target => {
      const current = currentAllocation.find(c => c.symbol === target.symbol);
      const currentValue = current?.value || 0;
      const diff = target.value - currentValue;

      if (Math.abs(diff) < 100) return null; // Ignore minor adjustments

      const position = positions.find(p => p.symbol === target.symbol);
      const price = parseFloat(position?.current_price?.value || '0');

      return {
        symbol: target.symbol,
        action: diff > 0 ? 'BUY' as const : 'SELL' as const,
        quantity: Math.abs(Math.round(diff / price)),
        estimatedCost: Math.abs(diff),
      };
    }).filter(Boolean) as any[];

    return {
      type: 'rebalance',
      title: 'Симуляция ребалансировки',
      currentAllocation,
      targetAllocation,
      trades,
    };
  }

  /**
   * Generate table with SPARKLINES
   */
  generateTableWithSparklines (rows: any[], sparklineColumn: string): TableBlock {
    return {
      type: 'table',
      title: 'Результаты сканирования',
      columns: [
        { id: 'symbol', label: 'Тикер', type: 'text' },
        { id: 'price', label: 'Цена', type: 'currency' },
        { id: 'change', label: 'Изменение', type: 'percent' },
        { id: 'volume', label: 'Объем', type: 'currency' },
        { id: 'trend', label: 'Тренд (7д)', type: 'sparkline' },
      ],
      rows: rows.map(r => ({
        ...r,
        trend: r[sparklineColumn], // array of prices for last 7 days
      })),
      sortable: true,
    };
  }

  /**
   * Calculate equity series from trades
   */
  private calculateEquitySeries (trades: Trade[]): Array<{ time: string; value: number }> {
    let equity = 200000; // initial capital
    return trades
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(t => {
        const pnl = parseFloat(t.executed_price?.value || '0') * parseFloat(t.quantity?.value || '0');
        equity += t.side === 'SIDE_SELL' ? pnl : -pnl;
        return {
          time: t.timestamp.split('T')[0],
          value: equity,
        };
      });
  }

  /**
   * Normalize benchmark to initial equity
   */
  private normalizeBenchmark (bars: Bar[], initialEquity: number): Array<{ time: string; value: number }> {
    if (bars.length === 0) return [];
    const firstPrice = parseFloat(bars[0].close);
    return bars.map(bar => ({
      time: bar.timestamp.split('T')[0],
      value: (parseFloat(bar.close) / firstPrice) * initialEquity,
    }));
  }
}
