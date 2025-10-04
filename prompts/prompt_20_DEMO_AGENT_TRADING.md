# ТЗ: AI-ассистент трейдера с визуализацией данных

**Цель:** Доработать demo-agent для создания интеллектуального торгового ассистента, который превращает естественный язык в аналитические инсайты с интерактивной визуализацией.

**Базовый проект:** `demo-agent/` (Claude Agent SDK + React UI)
**Источник данных:** `test/emulator/` (OMS Emulator на порту 3000)
**MCP Server:** `test/mcp/` (FINAM Trade API wrapper)

---

## 1. Текущее состояние

### ✅ Что уже работает (demo-agent)

**Backend (src/agent/):**
- `AgentManager.ts` - управление Claude Agent с tool calling
- `MCPConnector.ts` - подключение к MCP серверу
- `Session.ts` - управление сессиями и историей
- `server.ts` - Express API с endpoints:
  - `POST /api/sessions` - создание сессии
  - `POST /api/chat` - отправка сообщения
  - `GET /api/chat/stream` - streaming SSE
  - `GET /api/sessions/:id/history` - история

**Frontend (src/ui/):**
- React UI с базовым чатом
- Streaming поддержка
- Отображение tool calls
- Session management

**Что работает:**
```bash
# Терминал 1: Запустить эмулятор
npm run emulator

# Терминал 2: Запустить demo-agent
cd demo-agent
npm run dev
```

Открыть: http://localhost:5173

### 🎯 OMS Emulator возможности

**Доступные данные:**
- 8 инструментов: SBER, GAZP, YNDX, LKOH, VTBR, MGNT, ROSN, AFLT
- 365 дней исторических баров
- Реалистичный портфель (~200K ₽, 7 позиций)
- 38 сделок, 80 транзакций
- Real-time обновление котировок (каждые 5с)
- WebSocket streaming на порту 3001

**Ключевые endpoints:**
- `/v1/sessions` - JWT аутентификация
- `/v1/accounts/:id` - портфель, позиции, P&L
- `/v1/accounts/:id/trades` - история сделок
- `/v1/accounts/:id/orders` - размещение ордеров
- `/v1/instruments/:symbol/bars` - исторические данные
- `/v1/instruments/:symbol/quotes/latest` - текущие котировки
- `/v1/instruments/:symbol/orderbook` - стакан заявок

---

## 2. Архитектура решения

### 2.1. RenderSpec Protocol

**Концепция:** Backend генерирует JSON-спецификацию визуализации, Frontend детерминировано рендерит.

**Типы блоков:**

```typescript
type RenderSpec = {
  blocks: RenderBlock[];
  metadata?: {
    generatedAt: string;
    dataSource: 'emulator' | 'live';
  };
};

type RenderBlock =
  | SummaryBlock
  | ChartBlock
  | TableBlock
  | RebalanceBlock
  | OrderPreviewBlock;

// Текстовый summary с буллетами
type SummaryBlock = {
  type: 'summary';
  title?: string;
  bullets: string[];
  highlights?: {
    positive?: string[];
    negative?: string[];
  };
};

// Графики (ECharts или Lightweight-Charts)
type ChartBlock = {
  type: 'chart';
  engine: 'echarts' | 'lightweight';
  chartKind: string; // 'sunburst', 'equity-curve', 'candlestick', 'trades-chart'
  title?: string;
  spec: any; // ECharts option или Lightweight config
  markers?: Array<{
    time: string;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
    text: string;
  }>;
};

// Таблицы с поддержкой Sparklines
type TableBlock = {
  type: 'table';
  title?: string;
  columns: Array<{
    id: string;
    label: string;
    type?: 'text' | 'number' | 'percent' | 'currency' | 'sparkline';
    sparklineData?: number[]; // для type: 'sparkline'
  }>;
  rows: Record<string, any>[];
  sortable?: boolean;
};

// Симулятор ребалансировки
type RebalanceBlock = {
  type: 'rebalance';
  title?: string;
  currentAllocation: Array<{
    symbol: string;
    weight: number; // 0-100%
    value: number;
  }>;
  targetAllocation: Array<{
    symbol: string;
    weight: number; // 0-100%
    value: number;
  }>;
  trades: Array<{
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    estimatedCost: number;
  }>;
};

// Превью ордера с подтверждением
type OrderPreviewBlock = {
  type: 'order_preview';
  order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    type: 'MARKET' | 'LIMIT' | 'STOP';
    price?: string;
    estimated_total: string;
    estimated_commission: string;
  };
  warnings: string[];
  confirmToken: string;
};
```

### 2.2. Backend: Intent System & Spec Generator

**AgentManager расширение:**

```typescript
// src/agent/AgentManager.ts

const TRADING_SYSTEM_PROMPT = `Вы - AI-ассистент для биржевой торговли через FINAM Trade API.

Доступные интенты:
- portfolio.view - текущий портфель (таблица позиций)
- portfolio.analyze - глубокий анализ с графиками (equity curve + бенчмарк, Sunburst)
- portfolio.rebalance - симуляция ребалансировки портфеля
- market.instrument_info - детальная информация об инструменте (графики, стакан)
- market.scan - поиск инструментов по критериям (таблица с sparklines)
- backtest.run - бэктест стратегии (equity curve с markers сделок, метрики)
- order.place - размещение заявки (ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ!)

Для запросов с визуализацией возвращайте RenderSpec JSON:
{
  "intent": "portfolio.analyze",
  "renderSpec": {
    "blocks": [
      { "type": "summary", "bullets": [...] },
      { "type": "chart", "engine": "echarts", "spec": {...} }
    ]
  }
}

Для критических операций (order.place) обязательно:
{
  "intent": "order.place",
  "params": {...},
  "requiresConfirm": true
}`;
```

**Новые сервисы (src/agent/services/):**

```typescript
// portfolio.service.ts
export class PortfolioService {
  async analyze(account: Account, trades: Trade[]): Promise<RenderSpec> {
    const summary = this.generateSummary(account);
    const positionsTable = this.generatePositionsTable(account.positions);

    return {
      blocks: [summary, positionsTable],
      metadata: { generatedAt: new Date().toISOString(), dataSource: 'emulator' }
    };
  }

  private generateSummary(account: Account): SummaryBlock {
    const totalPnL = account.positions.reduce((sum, p) => sum + parseFloat(p.unrealized_pnl || '0'), 0);

    return {
      type: 'summary',
      title: 'Портфель',
      bullets: [
        `💰 Стоимость: ${account.equity.value} ₽`,
        `📊 Позиций: ${account.positions.length}`,
        `${totalPnL >= 0 ? '📈' : '📉'} P&L: ${totalPnL.toFixed(2)} ₽`
      ],
      highlights: {
        positive: totalPnL >= 0 ? [`+${totalPnL.toFixed(2)} ₽`] : undefined,
        negative: totalPnL < 0 ? [`${totalPnL.toFixed(2)} ₽`] : undefined
      }
    };
  }

  private generatePositionsTable(positions: Position[]): TableBlock {
    return {
      type: 'table',
      title: 'Позиции',
      columns: [
        { id: 'symbol', label: 'Тикер', type: 'text' },
        { id: 'quantity', label: 'Кол-во', type: 'number' },
        { id: 'avg_price', label: 'Средняя', type: 'currency' },
        { id: 'current_price', label: 'Текущая', type: 'currency' },
        { id: 'unrealized_pnl', label: 'P&L', type: 'currency' }
      ],
      rows: positions.map(p => ({
        symbol: p.symbol,
        quantity: p.quantity.value,
        avg_price: p.average_price?.value || '0',
        current_price: p.current_price?.value || '0',
        unrealized_pnl: p.unrealized_pnl || '0'
      })),
      sortable: true
    };
  }
}

// orders.service.ts
export class OrdersService {
  async generatePreview(params: OrderParams): Promise<OrderPreviewBlock> {
    // Получить текущую цену
    const quote = await this.mcpClient.callTool('LastQuote', { symbol: params.symbol });
    const price = params.type === 'MARKET' ? quote.last : params.price;
    const commission = parseFloat(price) * params.quantity * 0.0005; // 0.05%
    const total = parseFloat(price) * params.quantity + commission;

    return {
      type: 'order_preview',
      order: {
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        type: params.type,
        price: params.price,
        estimated_total: total.toFixed(2),
        estimated_commission: commission.toFixed(2)
      },
      warnings: this.generateWarnings(params, total),
      confirmToken: this.generateConfirmToken()
    };
  }

  private generateWarnings(params: OrderParams, total: number): string[] {
    const warnings: string[] = [];
    if (params.type === 'MARKET') {
      warnings.push('⚠️ Рыночная заявка - цена исполнения может отличаться');
    }
    if (total > 50000) {
      warnings.push('⚠️ Крупная сделка (>50K ₽)');
    }
    return warnings;
  }

  private generateConfirmToken(): string {
    return `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

**Spec Generator утилита:**

```typescript
// src/agent/services/spec-generator.ts
export class SpecGenerator {
  // Генерация ECharts Sunburst для структуры портфеля
  generatePortfolioSunburst(positions: Position[]): ChartBlock {
    const data = positions.map(p => ({
      name: p.symbol,
      value: parseFloat(p.current_price?.value || '0') * parseFloat(p.quantity.value)
    }));

    return {
      type: 'chart',
      engine: 'echarts',
      chartKind: 'sunburst',
      title: 'Структура портфеля',
      spec: {
        series: [{
          type: 'sunburst',
          data: data,
          radius: [0, '90%'],
          label: { rotate: 'radial' }
        }]
      }
    };
  }

  // Генерация Lightweight-Charts для equity curve
  generateEquityCurve(trades: Trade[]): ChartBlock {
    const equityData = this.calculateEquitySeries(trades);

    return {
      type: 'chart',
      engine: 'lightweight',
      chartKind: 'equity-curve',
      title: 'Кривая капитала',
      spec: {
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333'
        },
        series: [{
          type: 'Area',
          data: equityData,
          lineColor: '#2962FF',
          topColor: 'rgba(41, 98, 255, 0.3)',
          bottomColor: 'rgba(41, 98, 255, 0.05)'
        }]
      }
    };
  }

  private calculateEquitySeries(trades: Trade[]): Array<{ time: string; value: number }> {
    let equity = 200000; // начальный капитал
    return trades
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(t => {
        const pnl = parseFloat(t.executed_price?.value || '0') * parseFloat(t.quantity?.value || '0');
        equity += t.side === 'SIDE_SELL' ? pnl : -pnl;
        return {
          time: t.timestamp.split('T')[0],
          value: equity
        };
      });
  }

  // Генерация Equity Curve с БЕНЧМАРКОМ (IMOEX)
  generateEquityCurveWithBenchmark(trades: Trade[], benchmarkBars: Bar[]): ChartBlock {
    const equityData = this.calculateEquitySeries(trades);
    const benchmarkData = this.normalizeBenchmark(benchmarkBars, 200000); // Нормализация к начальному капиталу

    return {
      type: 'chart',
      engine: 'lightweight',
      chartKind: 'equity-curve-benchmark',
      title: 'Кривая капитала vs IMOEX',
      spec: {
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333'
        },
        series: [
          {
            type: 'Area',
            data: equityData,
            lineColor: '#2962FF',
            topColor: 'rgba(41, 98, 255, 0.3)',
            bottomColor: 'rgba(41, 98, 255, 0.05)'
          },
          {
            type: 'Line',
            data: benchmarkData,
            lineColor: '#999',
            lineStyle: 1, // dotted
            lineWidth: 2
          }
        ]
      }
    };
  }

  private normalizeBenchmark(bars: Bar[], initialEquity: number): Array<{ time: string; value: number }> {
    if (bars.length === 0) return [];
    const firstPrice = parseFloat(bars[0].close);
    return bars.map(bar => ({
      time: bar.timestamp.split('T')[0],
      value: (parseFloat(bar.close) / firstPrice) * initialEquity
    }));
  }

  // Генерация графика с TRADE MARKERS (точки входа/выхода)
  generateTradesChart(symbol: string, bars: Bar[], trades: Trade[]): ChartBlock {
    const candleData = bars.map(b => ({
      time: b.timestamp.split('T')[0],
      open: parseFloat(b.open),
      high: parseFloat(b.high),
      low: parseFloat(b.low),
      close: parseFloat(b.close)
    }));

    const markers = trades
      .filter(t => t.symbol === symbol)
      .map(t => ({
        time: t.timestamp.split('T')[0],
        position: t.side === 'SIDE_BUY' ? 'belowBar' : 'aboveBar',
        color: t.side === 'SIDE_BUY' ? '#26a69a' : '#ef5350',
        shape: t.side === 'SIDE_BUY' ? 'arrowUp' : 'arrowDown',
        text: `${t.side === 'SIDE_BUY' ? 'B' : 'S'} ${t.quantity.value}@${t.executed_price?.value}`
      }));

    return {
      type: 'chart',
      engine: 'lightweight',
      chartKind: 'trades-chart',
      title: `${symbol} - График сделок`,
      spec: {
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333'
        },
        series: [{
          type: 'Candlestick',
          data: candleData
        }]
      },
      markers
    };
  }

  // Генерация REBALANCE блока
  generateRebalanceBlock(positions: Position[], targetWeights: Record<string, number>): RebalanceBlock {
    const totalValue = positions.reduce((sum, p) =>
      sum + parseFloat(p.current_price?.value || '0') * parseFloat(p.quantity.value), 0
    );

    const currentAllocation = positions.map(p => {
      const value = parseFloat(p.current_price?.value || '0') * parseFloat(p.quantity.value);
      return {
        symbol: p.symbol,
        weight: (value / totalValue) * 100,
        value
      };
    });

    const targetAllocation = Object.entries(targetWeights).map(([symbol, weight]) => ({
      symbol,
      weight,
      value: (weight / 100) * totalValue
    }));

    // Расчет необходимых сделок
    const trades = targetAllocation.map(target => {
      const current = currentAllocation.find(c => c.symbol === target.symbol);
      const currentValue = current?.value || 0;
      const diff = target.value - currentValue;

      if (Math.abs(diff) < 100) return null; // Игнорируем мелкие корректировки

      const position = positions.find(p => p.symbol === target.symbol);
      const price = parseFloat(position?.current_price?.value || '0');

      return {
        symbol: target.symbol,
        action: diff > 0 ? 'BUY' : 'SELL',
        quantity: Math.abs(Math.round(diff / price)),
        estimatedCost: Math.abs(diff)
      };
    }).filter(Boolean) as any[];

    return {
      type: 'rebalance',
      title: 'Симуляция ребалансировки',
      currentAllocation,
      targetAllocation,
      trades
    };
  }

  // Генерация таблицы с SPARKLINES
  generateTableWithSparklines(rows: any[], sparklineColumn: string): TableBlock {
    return {
      type: 'table',
      title: 'Результаты сканирования',
      columns: [
        { id: 'symbol', label: 'Тикер', type: 'text' },
        { id: 'price', label: 'Цена', type: 'currency' },
        { id: 'change', label: 'Изменение', type: 'percent' },
        { id: 'volume', label: 'Объем', type: 'currency' },
        { id: 'trend', label: 'Тренд (7д)', type: 'sparkline' }
      ],
      rows: rows.map(r => ({
        ...r,
        trend: r[sparklineColumn] // массив цен за последние 7 дней
      })),
      sortable: true
    };
  }
}
```

### 2.3. Frontend: Block Renderers

**Установка зависимостей:**

```bash
cd demo-agent
npm install echarts lightweight-charts
```

**Компоненты визуализации (src/ui/components/blocks/):**

```tsx
// SummaryBlock.tsx
import React from 'react';
import type { SummaryBlock } from '../../../types';

export const SummaryBlockRenderer: React.FC<{ block: SummaryBlock }> = ({ block }) => {
  return (
    <div className="summary-block">
      {block.title && <h3>{block.title}</h3>}
      <ul className="summary-bullets">
        {block.bullets.map((bullet, i) => (
          <li key={i}>{bullet}</li>
        ))}
      </ul>
      {block.highlights?.positive && (
        <div className="highlights positive">
          {block.highlights.positive.map((h, i) => <span key={i}>{h}</span>)}
        </div>
      )}
      {block.highlights?.negative && (
        <div className="highlights negative">
          {block.highlights.negative.map((h, i) => <span key={i}>{h}</span>)}
        </div>
      )}
    </div>
  );
};

// ChartBlock.tsx
import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import { createChart } from 'lightweight-charts';
import type { ChartBlock } from '../../../types';

export const ChartBlockRenderer: React.FC<{ block: ChartBlock }> = ({ block }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (block.engine === 'echarts') {
      const chart = echarts.init(containerRef.current);
      chart.setOption(block.spec);
      return () => chart.dispose();
    }

    if (block.engine === 'lightweight') {
      const chart = createChart(containerRef.current, block.spec.layout || {});

      // Добавить серии
      block.spec.series?.forEach((s: any) => {
        const series = chart[`add${s.type}Series`](s);
        series.setData(s.data);

        // Добавить markers для сделок (если есть)
        if (block.markers && block.markers.length > 0) {
          series.setMarkers(block.markers);
        }
      });

      return () => chart.remove();
    }
  }, [block]);

  return (
    <div className="chart-block">
      {block.title && <h3>{block.title}</h3>}
      <div ref={containerRef} style={{ width: '100%', height: '400px' }} />
    </div>
  );
};

// TableBlock.tsx
import React, { useState, useRef, useEffect } from 'react';
import type { TableBlock } from '../../../types';

// Простой компонент Sparkline
const Sparkline: React.FC<{ data: number[] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 2;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = data[data.length - 1] >= data[0] ? '#26a69a' : '#ef5350';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    data.forEach((value, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((value - min) / range) * (height - 2 * padding);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [data]);

  return <canvas ref={canvasRef} width={80} height={30} style={{ display: 'block' }} />;
};

export const TableBlockRenderer: React.FC<{ block: TableBlock }> = ({ block }) => {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedRows = block.sortable && sortBy
    ? [...block.rows].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      })
    : block.rows;

  const handleSort = (columnId: string) => {
    if (!block.sortable) return;
    if (sortBy === columnId) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnId);
      setSortDir('asc');
    }
  };

  const renderCell = (col: any, value: any) => {
    if (col.type === 'sparkline' && Array.isArray(value)) {
      return <Sparkline data={value} />;
    }
    if (col.type === 'currency') {
      return `${parseFloat(value).toFixed(2)} ₽`;
    }
    if (col.type === 'percent') {
      const num = parseFloat(value);
      const color = num >= 0 ? '#26a69a' : '#ef5350';
      return <span style={{ color }}>{num >= 0 ? '+' : ''}{num.toFixed(2)}%</span>;
    }
    return value;
  };

  return (
    <div className="table-block">
      {block.title && <h3>{block.title}</h3>}
      <table>
        <thead>
          <tr>
            {block.columns.map(col => (
              <th key={col.id} onClick={() => handleSort(col.id)}>
                {col.label}
                {sortBy === col.id && (sortDir === 'asc' ? ' ▲' : ' ▼')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr key={i}>
              {block.columns.map(col => (
                <td key={col.id}>{renderCell(col, row[col.id])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// OrderPreviewBlock.tsx
import React, { useState, useEffect } from 'react';
import type { OrderPreviewBlock } from '../../../types';

export const OrderPreviewBlockRenderer: React.FC<{
  block: OrderPreviewBlock;
  onConfirm: (token: string) => void;
  onCancel: () => void;
}> = ({ block, onConfirm, onCancel }) => {
  const [understood, setUnderstood] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          onCancel();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onCancel]);

  return (
    <div className="order-preview-block">
      <h3>Подтверждение заявки</h3>
      <div className="order-details">
        <div><strong>Инструмент:</strong> {block.order.symbol}</div>
        <div><strong>Направление:</strong> {block.order.side === 'BUY' ? 'Покупка' : 'Продажа'}</div>
        <div><strong>Количество:</strong> {block.order.quantity}</div>
        <div><strong>Тип:</strong> {block.order.type}</div>
        {block.order.price && <div><strong>Цена:</strong> {block.order.price} ₽</div>}
        <div><strong>Сумма:</strong> {block.order.estimated_total} ₽</div>
        <div><strong>Комиссия:</strong> {block.order.estimated_commission} ₽</div>
      </div>
      {block.warnings.length > 0 && (
        <div className="warnings">
          {block.warnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}
      <label>
        <input
          type="checkbox"
          checked={understood}
          onChange={e => setUnderstood(e.target.checked)}
        />
        Я понимаю риски
      </label>
      <div className="actions">
        <button
          disabled={!understood}
          onClick={() => onConfirm(block.confirmToken)}
        >
          Подтвердить ({countdown}с)
        </button>
        <button onClick={onCancel}>Отменить</button>
      </div>
    </div>
  );
};

// RebalanceBlock.tsx
import React from 'react';
import type { RebalanceBlock } from '../../../types';

export const RebalanceBlockRenderer: React.FC<{ block: RebalanceBlock }> = ({ block }) => {
  return (
    <div className="rebalance-block">
      {block.title && <h3>{block.title}</h3>}

      <div className="allocations">
        <div className="allocation-section">
          <h4>Текущее распределение</h4>
          <table>
            <thead>
              <tr>
                <th>Тикер</th>
                <th>Вес, %</th>
                <th>Стоимость, ₽</th>
              </tr>
            </thead>
            <tbody>
              {block.currentAllocation.map((item, i) => (
                <tr key={i}>
                  <td>{item.symbol}</td>
                  <td>{item.weight.toFixed(1)}%</td>
                  <td>{item.value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="allocation-section">
          <h4>Целевое распределение</h4>
          <table>
            <thead>
              <tr>
                <th>Тикер</th>
                <th>Вес, %</th>
                <th>Стоимость, ₽</th>
              </tr>
            </thead>
            <tbody>
              {block.targetAllocation.map((item, i) => (
                <tr key={i}>
                  <td>{item.symbol}</td>
                  <td>{item.weight.toFixed(1)}%</td>
                  <td>{item.value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="trades-section">
        <h4>Необходимые сделки</h4>
        <table>
          <thead>
            <tr>
              <th>Тикер</th>
              <th>Действие</th>
              <th>Количество</th>
              <th>Сумма, ₽</th>
            </tr>
          </thead>
          <tbody>
            {block.trades.map((trade, i) => (
              <tr key={i}>
                <td>{trade.symbol}</td>
                <td style={{ color: trade.action === 'BUY' ? '#26a69a' : '#ef5350' }}>
                  {trade.action === 'BUY' ? 'Покупка' : 'Продажа'}
                </td>
                <td>{trade.quantity}</td>
                <td>{trade.estimatedCost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

**RenderSpec Renderer:**

```tsx
// src/ui/components/RenderSpecRenderer.tsx
import React from 'react';
import { SummaryBlockRenderer } from './blocks/SummaryBlock';
import { ChartBlockRenderer } from './blocks/ChartBlock';
import { TableBlockRenderer } from './blocks/TableBlock';
import { RebalanceBlockRenderer } from './blocks/RebalanceBlock';
import { OrderPreviewBlockRenderer } from './blocks/OrderPreviewBlock';
import type { RenderSpec } from '../../types';

export const RenderSpecRenderer: React.FC<{
  spec: RenderSpec;
  onOrderConfirm?: (token: string) => void;
  onOrderCancel?: () => void;
}> = ({ spec, onOrderConfirm, onOrderCancel }) => {
  return (
    <div className="render-spec">
      {spec.blocks.map((block, i) => {
        switch (block.type) {
          case 'summary':
            return <SummaryBlockRenderer key={i} block={block} />;
          case 'chart':
            return <ChartBlockRenderer key={i} block={block} />;
          case 'table':
            return <TableBlockRenderer key={i} block={block} />;
          case 'rebalance':
            return <RebalanceBlockRenderer key={i} block={block} />;
          case 'order_preview':
            return (
              <OrderPreviewBlockRenderer
                key={i}
                block={block}
                onConfirm={onOrderConfirm || (() => {})}
                onCancel={onOrderCancel || (() => {})}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
};
```

**Интеграция в Message компонент:**

```tsx
// src/ui/components/Message.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { RenderSpecRenderer } from './RenderSpecRenderer';
import type { Message } from '../../types';

export const MessageComponent: React.FC<{ message: Message }> = ({ message }) => {
  // Попытка распарсить RenderSpec из контента
  const tryParseRenderSpec = (content: string) => {
    try {
      const json = JSON.parse(content);
      if (json.renderSpec) return json.renderSpec;
    } catch {
      return null;
    }
    return null;
  };

  const renderSpec = message.role === 'assistant' ? tryParseRenderSpec(message.content) : null;

  return (
    <div className={`message message-${message.role}`}>
      {renderSpec ? (
        <RenderSpecRenderer spec={renderSpec} />
      ) : (
        <ReactMarkdown>{message.content}</ReactMarkdown>
      )}
    </div>
  );
};
```

---

## 3. Пользовательские кейсы (расширенные)

### Кейс 1: Портфельный аналитик (базовый)

**Запрос:** "Покажи мой портфель"

**Ожидаемый ответ:**
1. Summary блок: equity, позиций, P&L
2. Таблица позиций с сортировкой

**Backend:**
```typescript
// API endpoint: POST /api/chat
// AgentManager обрабатывает intent: portfolio.view
const account = await mcpClient.callTool('GetAccount', { account_id: '1982834' });
const renderSpec = await portfolioService.analyze(account);
// Возвращает RenderSpec JSON
```

### Кейс 1А: Глубокий анализ портфеля

**Запрос:** "Проанализируй мой портфель. Покажи структуру, динамику и предложи ребалансировку"

**Ожидаемый ответ:**
1. **Summary** (текстовый блок):
   - Общая стоимость: 150,000 ₽
   - Доходность YTD: +12.5%
   - Unrealized P&L: +3,000 ₽
   - Топ актив: SBER (+20%), худший: GAZP (-10%)

2. **Sunburst диаграмма** (ECharts):
   - Структура портфеля по инструментам

3. **Equity Curve** (Lightweight-Charts):
   - Стоимость портфеля за 3 месяца vs IMOEX (бенчмарк)
   - Markers: даты покупок/продаж

4. **Таблица позиций**:
   - Тикер, кол-во, средняя цена, текущая, P&L, вес

5. **Rebalance блок**:
   - Текущий vs целевой вес (равновесный 12.5% каждый)
   - Рекомендуемые сделки

**Backend:**
```typescript
// Intent: portfolio.analyze
const account = await mcpClient.callTool('GetAccount', { account_id: '1982834' });
const trades = await mcpClient.callTool('Trades', {
  start_time: getDateMonthsAgo(3),
  end_time: new Date().toISOString()
});

// Получить бенчмарк (IMOEX bars)
const benchmarkBars = await mcpClient.callTool('Bars', {
  symbol: 'IMOEX@MISX',
  start_time: getDateMonthsAgo(3),
  end_time: new Date().toISOString()
});

const specGen = new SpecGenerator();
const renderSpec = {
  blocks: [
    specGen.generateSummary(account),
    specGen.generatePortfolioSunburst(account.positions),
    specGen.generateEquityCurveWithBenchmark(trades, benchmarkBars),
    portfolioService.generatePositionsTable(account.positions),
    specGen.generateRebalanceBlock(account.positions, {
      'SBER@MISX': 12.5,
      'GAZP@MISX': 12.5,
      'YDEX@MISX': 12.5,
      // ... остальные 12.5%
    })
  ]
};
```

### Кейс 2: Рыночный сканер с Sparklines

**Запрос:** "Найди акции на MOEX: сектор финансы, рост >5% за неделю, объем >100 млн ₽"

**Ожидаемый ответ:**
1. **Summary**:
   - Найдено: 4 инструмента
   - Лидер: SBER +8.2%

2. **Таблица результатов с Sparklines**:
   - Тикер, цена, изменение %, объем
   - **Sparkline**: мини-график цен за последние 7 дней

**Backend:**
```typescript
// Intent: market.scan
const assets = await mcpClient.callTool('Assets', {});
const filtered = assets.filter(a =>
  a.sector === 'Финансы' &&
  a.weeklyChange > 5 &&
  a.volume > 100_000_000
);

// Получить 7-дневные данные для sparklines
const rowsWithSparklines = await Promise.all(
  filtered.map(async asset => {
    const bars = await mcpClient.callTool('Bars', {
      symbol: asset.symbol,
      start_time: getDateDaysAgo(7),
      end_time: new Date().toISOString()
    });

    return {
      symbol: asset.symbol,
      price: asset.currentPrice,
      change: asset.weeklyChange,
      volume: asset.volume,
      priceHistory: bars.map(b => parseFloat(b.close)) // для sparkline
    };
  })
);

const renderSpec = {
  blocks: [
    specGen.generateSummary({ found: filtered.length, leader: 'SBER +8.2%' }),
    specGen.generateTableWithSparklines(rowsWithSparklines, 'priceHistory')
  ]
};
```

### Кейс 3: Анализ инструмента с графиком сделок

**Запрос:** "Покажи SBER за месяц с моими сделками"

**Ожидаемый ответ:**
1. **Summary**: цена, изменение, объем

2. **График с Trade Markers** (Lightweight-Charts):
   - Candlestick за месяц
   - Зеленые стрелки вверх: покупки
   - Красные стрелки вниз: продажи
   - Tooltip с деталями сделки

3. **Таблица последних сделок**:
   - Дата, направление, количество, цена

**Backend:**
```typescript
// Intent: market.instrument_info
const symbol = 'SBER@MISX';
const asset = await mcpClient.callTool('GetAsset', { symbol });
const quote = await mcpClient.callTool('LastQuote', { symbol });

// Bars за месяц
const bars = await mcpClient.callTool('Bars', {
  symbol,
  start_time: getDateMonthsAgo(1),
  end_time: new Date().toISOString()
});

// Сделки пользователя по этому символу
const allTrades = await mcpClient.callTool('Trades', {});
const symbolTrades = allTrades.filter(t => t.symbol === symbol);

const specGen = new SpecGenerator();
const renderSpec = {
  blocks: [
    specGen.generateSummary({ price: quote.last, change: quote.change, volume: quote.volume }),
    specGen.generateTradesChart(symbol, bars, symbolTrades), // График с markers!
    specGen.generateTable([
      { id: 'timestamp', label: 'Дата', type: 'text' },
      { id: 'side', label: 'Направление', type: 'text' },
      { id: 'quantity', label: 'Количество', type: 'number' },
      { id: 'price', label: 'Цена', type: 'currency' }
    ], symbolTrades)
  ]
};
```

### Кейс 4: Размещение ордера с подтверждением

**Запрос:** "Купи 10 акций SBER"

**Флоу:**
1. AgentManager распознает intent: `order.place`
2. OrdersService генерирует OrderPreviewBlock
3. Frontend показывает OrderPreviewBlockRenderer
4. После подтверждения → вызов MCP `PlaceOrder`
5. Обновление портфеля

**Backend:**
```typescript
// AgentManager detectIntent() → order.place
const preview = await ordersService.generatePreview({
  symbol: 'SBER@MISX',
  side: 'BUY',
  quantity: 10,
  type: 'MARKET'
});

// Кэшировать превью с confirmToken (TTL 30 сек)
cache.set(preview.confirmToken, orderParams, 30);

// Вернуть OrderPreviewBlock в RenderSpec
```

**Frontend подтверждение:**
```typescript
const handleOrderConfirm = async (token: string) => {
  await api.post('/api/orders/confirm', { confirmToken: token });
  // Обновить портфель
};
```

---

## 4. План реализации

### Фаза 1: Backend Foundation (1.5 дня)

**Задачи:**

1. **Типы RenderSpec** (45 мин)
   - [ ] Создать `src/types/renderspec.ts`
   - [ ] Экспортировать типы: `SummaryBlock`, `ChartBlock`, `TableBlock`, `RebalanceBlock`, `OrderPreviewBlock`
   - [ ] Добавить поддержку markers в ChartBlock
   - [ ] Добавить тип 'sparkline' в TableBlock columns

2. **SpecGenerator** (3 часа)
   - [ ] Создать `src/agent/services/spec-generator.ts`
   - [ ] `generatePortfolioSunburst()` - ECharts Sunburst
   - [ ] `generateEquityCurve()` - базовая equity curve
   - [ ] `generateEquityCurveWithBenchmark()` - equity curve + IMOEX бенчмарк
   - [ ] `generateTradesChart()` - график с trade markers
   - [ ] `generateRebalanceBlock()` - симулятор ребалансировки
   - [ ] `generateTableWithSparklines()` - таблица с мини-графиками
   - [ ] Вспомогательные методы: `normalizeBenchmark()`, `calculateEquitySeries()`

3. **PortfolioService** (2 часа)
   - [ ] Создать `src/agent/services/portfolio.service.ts`
   - [ ] Реализовать `analyze()` - базовый анализ (summary + table)
   - [ ] Реализовать `analyzeDeep()` - расширенный анализ (+ sunburst, equity curve, rebalance)
   - [ ] Метод `generateSummary(account)`
   - [ ] Метод `generatePositionsTable(positions)`

4. **OrdersService** (2 часа)
   - [ ] Создать `src/agent/services/orders.service.ts`
   - [ ] Реализовать `generatePreview(params)` - OrderPreviewBlock
   - [ ] Метод `generateWarnings(params)`
   - [ ] Метод `generateConfirmToken()`
   - [ ] In-memory cache для confirm tokens (TTL 30 сек)

5. **API Endpoints** (1 час)
   - [ ] Добавить в `server.ts`: `POST /api/orders/preview`
   - [ ] Добавить в `server.ts`: `POST /api/orders/confirm`

6. **System Prompt** (30 мин)
   - [ ] Обновить `TRADING_SYSTEM_PROMPT` в `AgentManager.ts`
   - [ ] Добавить описание всех intents (включая backtest, rebalance)
   - [ ] Описать RenderSpec формат с примерами

### Фаза 2: Frontend Visualizations (1.5 дня)

**Задачи:**

1. **Установка зависимостей** (5 мин)
   - [ ] `npm install echarts lightweight-charts`

2. **Block Renderers - Базовые** (2 часа)
   - [ ] Создать `src/ui/components/blocks/SummaryBlock.tsx`
   - [ ] Создать `src/ui/components/blocks/OrderPreviewBlock.tsx` (с countdown, checkbox)

3. **ChartBlock с расширениями** (2 часа)
   - [ ] Создать `src/ui/components/blocks/ChartBlock.tsx`
   - [ ] Поддержка ECharts (Sunburst)
   - [ ] Поддержка Lightweight-Charts (Area, Line, Candlestick)
   - [ ] Поддержка markers (зеленые/красные стрелки для сделок)
   - [ ] Поддержка multiple series (equity + benchmark)

4. **TableBlock с Sparklines** (2 часа)
   - [ ] Создать `src/ui/components/blocks/TableBlock.tsx`
   - [ ] Canvas-based компонент `Sparkline`
   - [ ] Поддержка типов: text, number, currency, percent, sparkline
   - [ ] Сортировка по колонкам
   - [ ] Цветовая индикация percent (зеленый/красный)

5. **RebalanceBlock** (1.5 часа)
   - [ ] Создать `src/ui/components/blocks/RebalanceBlock.tsx`
   - [ ] Две таблицы: Current vs Target allocation
   - [ ] Таблица рекомендуемых сделок с цветами
   - [ ] Отображение весов в процентах

6. **RenderSpec Renderer** (1 час)
   - [ ] Создать `src/ui/components/RenderSpecRenderer.tsx`
   - [ ] Роутинг блоков по типу (включая rebalance)
   - [ ] Обработчики onOrderConfirm/onOrderCancel

7. **Интеграция в Message** (1 час)
   - [ ] Обновить `src/ui/components/Message.tsx`
   - [ ] Добавить логику парсинга RenderSpec из assistant message
   - [ ] Fallback на ReactMarkdown для обычных текстов

8. **CSS Стили** (1.5 часа)
   - [ ] Стили для summary-block (highlights с цветами)
   - [ ] Стили для table-block (включая sparkline canvas)
   - [ ] Стили для rebalance-block (две колонки для allocations)
   - [ ] Стили для order-preview-block (warnings, countdown)
   - [ ] Стили для chart-block (адаптивная высота)

### Фаза 3: Integration & Testing (1 день)

**Задачи:**

1. **E2E тест Кейса 1: Базовый портфель** (30 мин)
   - [ ] Запустить эмулятор: `npm run emulator`
   - [ ] Запустить demo-agent: `cd demo-agent && npm run dev`
   - [ ] Отправить "Покажи мой портфель"
   - [ ] Проверить: Summary + таблица позиций с сортировкой

2. **E2E тест Кейса 1А: Глубокий анализ портфеля** (1 час)
   - [ ] Отправить "Проанализируй портфель с графиками и ребалансировкой"
   - [ ] Проверить: Summary
   - [ ] Проверить: Sunburst диаграмма отображается
   - [ ] Проверить: Equity curve + бенчмарк (2 линии)
   - [ ] Проверить: Таблица позиций
   - [ ] Проверить: Rebalance блок с current/target/trades

3. **E2E тест Кейса 2: Сканер с Sparklines** (45 мин)
   - [ ] Отправить "Найди акции с ростом >5%"
   - [ ] Проверить: Таблица с колонкой Sparkline
   - [ ] Проверить: Sparklines отрисовываются (canvas)
   - [ ] Проверить: Сортировка работает

4. **E2E тест Кейса 3: График сделок** (45 мин)
   - [ ] Отправить "Покажи SBER за месяц с моими сделками"
   - [ ] Проверить: Candlestick график
   - [ ] Проверить: Зеленые стрелки (покупки) на графике
   - [ ] Проверить: Красные стрелки (продажи) на графике
   - [ ] Проверить: Таблица сделок

5. **E2E тест Кейса 4: Размещение ордера** (30 мин)
   - [ ] Отправить "Купи 10 акций SBER"
   - [ ] Проверить: OrderPreviewBlock появляется
   - [ ] Проверить: Countdown работает (30→29→28...)
   - [ ] Проверить: Checkbox "Понимаю риски"
   - [ ] Подтвердить заявку
   - [ ] Проверить: Ордер размещен через MCP
   - [ ] Проверить: Портфель обновился

6. **Bug fixes & polish** (2 часа)
   - [ ] Исправить найденные проблемы
   - [ ] Оптимизация производительности
   - [ ] Улучшение UX (transitions, loading states)

---

## 5. Критерии приемки

### ✅ Кейс 1: Базовый портфель

**Готово если:**
- Можно отправить "Покажи портфель"
- Получить Summary (equity, позиций, P&L)
- Получить таблицу позиций с сортировкой
- Данные корректные из эмулятора

### ✅ Кейс 1А: Глубокий анализ портфеля

**Готово если:**
- Можно отправить "Проанализируй портфель с графиками"
- Получить 5 блоков:
  1. Summary с highlights (зеленые/красные)
  2. Sunburst диаграмма (ECharts) - структура портфеля
  3. Equity curve (Lightweight-Charts) с ДВУМЯ линиями:
     - Синяя площадь: equity портфеля
     - Серая пунктирная: IMOEX бенчмарк
  4. Таблица позиций (сортируемая)
  5. Rebalance блок:
     - Текущее распределение (таблица)
     - Целевое распределение (таблица)
     - Рекомендуемые сделки (таблица с цветами)

### ✅ Кейс 2: Сканер с Sparklines

**Готово если:**
- Можно отправить "Найди акции с ростом >5%"
- Получить таблицу с колонками:
  - Тикер (text)
  - Цена (currency)
  - Изменение (percent с цветами)
  - Объем (currency)
  - **Тренд (sparkline)** - canvas мини-график
- Sparklines отрисовываются корректно (зеленый/красный цвет)
- Сортировка работает

### ✅ Кейс 3: График сделок

**Готово если:**
- Можно отправить "Покажи SBER за месяц с моими сделками"
- Получить:
  1. Summary (цена, изменение)
  2. Candlestick график с MARKERS:
     - Зеленые стрелки вверх (arrowUp) - покупки
     - Красные стрелки вниз (arrowDown) - продажи
     - Tooltip с деталями сделки
  3. Таблица сделок
- Markers корректно отображаются на графике

### ✅ Кейс 4: Размещение ордера

**Готово если:**
- Можно отправить "Купи 10 SBER"
- Показывается OrderPreviewBlock с:
  - Деталями ордера (символ, направление, количество, тип)
  - Расчетной суммой
  - Комиссией
  - Предупреждениями (⚠️)
- Работает чекбокс "Понимаю риски"
- Работает countdown 30 сек (таймер тикает)
- Кнопка "Подтвердить" disabled до чекбокса
- После подтверждения:
  - Ордер размещается через MCP
  - Портфель обновляется
  - Появляется сообщение об успехе

### ✅ Общие требования к визуализации

**Готово если:**
- Все графики responsive (адаптируются к ширине)
- ECharts Sunburst интерактивный (hover, click)
- Lightweight-Charts с zoom/pan
- Таблицы с сортировкой по всем колонкам
- Sparklines отрисовываются с правильными цветами
- Цветовая кодировка:
  - Зеленый #26a69a: положительные значения, покупки
  - Красный #ef5350: отрицательные значения, продажи
  - Синий #2962FF: equity curve
  - Серый #999: бенчмарк

---

## 6. Конфигурация

### demo-agent/.env

```bash
# Claude API
ANTHROPIC_API_KEY=your-key

# MCP Server (предполагается запущенный на порту 3001)
MCP_SERVER_URL=http://localhost:3001

# Web API Server
WEB_API_PORT=3002
WEB_API_HOST=localhost

# Agent Settings
AGENT_MAX_TURNS=10
AGENT_TIMEOUT=30000
CLAUDE_MODEL=claude-sonnet-4-5-20250929
```

### Структура проекта после доработки

```
demo-agent/
├── src/
│   ├── agent/
│   │   ├── AgentManager.ts          # (обновлен: system prompt)
│   │   ├── MCPConnector.ts
│   │   ├── Session.ts
│   │   └── services/                # (новое)
│   │       ├── portfolio.service.ts
│   │       ├── orders.service.ts
│   │       └── spec-generator.ts
│   ├── api/
│   │   └── server.ts                # (обновлен: новые endpoints)
│   ├── ui/
│   │   ├── components/
│   │   │   ├── blocks/              # (новое)
│   │   │   │   ├── SummaryBlock.tsx
│   │   │   │   ├── ChartBlock.tsx
│   │   │   │   ├── TableBlock.tsx
│   │   │   │   └── OrderPreviewBlock.tsx
│   │   │   ├── RenderSpecRenderer.tsx # (новое)
│   │   │   ├── Message.tsx          # (обновлен)
│   │   │   └── ...
│   │   └── ...
│   └── types/
│       ├── index.ts
│       └── renderspec.ts            # (новое)
└── package.json                     # (обновлен: echarts, lightweight-charts)
```

---

## 7. Рекомендации по реализации

### 7.1. Начни с типов

Создай типы RenderSpec первыми - это контракт между backend и frontend.

### 7.2. Тестируй на эмуляторе

Всегда запускай эмулятор перед тестированием:
```bash
npm run emulator
```

Останавливай после тестирования:
```bash
node scripts kill-emulator.js
```

### 7.3. Используй существующие MCP tools

Не создавай новые API wrappers - используй готовые MCP tools из `test/mcp/`:
- GetAccount
- PlaceOrder
- LastQuote
- Trades
- Assets

### 7.4. Incremental development

Реализуй сначала один кейс полностью (Portfolio), потом добавляй остальные.

### 7.5. Debugging

Логируй RenderSpec JSON в консоль перед отправкой на frontend:
```typescript
console.log('Generated RenderSpec:', JSON.stringify(renderSpec, null, 2));
```

---

## 8. Ожидаемый результат

**После завершения:**

1. Запустить эмулятор: `npm run emulator`
2. Запустить demo-agent: `cd demo-agent && npm run dev`
3. Открыть http://localhost:5173
4. Отправить: "Покажи портфель" → получить таблицу с позициями
5. Отправить: "Купи 10 SBER" → получить окно подтверждения → подтвердить → ордер размещен

**Качество:**
- Визуализация читаемая и интуитивная
- Критические операции требуют подтверждения
- Данные из эмулятора корректно отображаются
- UI responsive и без багов

---

## 9. Расширенные возможности vs TRADER.md

Это ТЗ полностью реализует все ключевые визуализации из `prompts/TRADER.md`:

### ✅ Кейс 1: Портфельный аналитик

**Из TRADER.md:**
- ✅ Текстовое саммари с доходностью и P&L
- ✅ Вложенная круговая диаграмма (Sunburst) структуры портфеля
- ✅ **График доходности с БЕНЧМАРКОМ** (equity curve vs IMOEX)
- ✅ **Симуляция ребалансировки**: интерактивная таблица с целевыми весами и рекомендуемыми сделками

**Реализовано через:**
- `SpecGenerator.generateEquityCurveWithBenchmark()` - equity + бенчмарк
- `SpecGenerator.generateRebalanceBlock()` - current/target allocations + trades

### ✅ Кейс 2: Рыночный сканер

**Из TRADER.md:**
- ✅ Саммари с лидерами роста
- ✅ **Интерактивная таблица с мини-графиками (Sparklines)**

**Реализовано через:**
- `TableBlock` с типом колонки `sparkline`
- Canvas-based `Sparkline` компонент для отрисовки мини-графиков

### ✅ Кейс 3: Песочница для стратегий (Бэктест)

**Из TRADER.md:**
- ✅ **График сделок: котировки с точками входа и выхода** (trade markers)
- ✅ **Кривая доходности: рост капитала** (equity curve с markers)
- ✅ Таблица метрик (кол-во сделок, прибыльность)

**Реализовано через:**
- `SpecGenerator.generateTradesChart()` - Candlestick + зеленые/красные стрелки
- `ChartBlock.markers` - поддержка arrowUp/arrowDown для точек входа/выхода

### ✅ Дополнительно реализовано

**Безопасность:**
- OrderPreviewBlock с confirm token (TTL 30 сек)
- Checkbox "Понимаю риски"
- Countdown таймер для критических операций
- Предупреждения (warnings) для крупных сделок и рыночных заявок

**UX:**
- Цветовая кодировка (зеленый/красный для profit/loss, покупок/продаж)
- Сортируемые таблицы
- Responsive дизайн
- Интерактивные графики (zoom, pan, hover)

### 🎯 Итоговое покрытие TRADER.md

| Функция из TRADER.md | Статус | Компонент |
|---------------------|--------|-----------|
| График доходности vs бенчмарк | ✅ | `generateEquityCurveWithBenchmark()` |
| Симуляция ребалансировки | ✅ | `RebalanceBlock` |
| Sparklines в таблицах | ✅ | `TableBlock` с `Sparkline` |
| График сделок с точками входа/выхода | ✅ | `generateTradesChart()` с markers |
| Кривая доходности с метриками | ✅ | `generateEquityCurve()` + summary |
| Sunburst диаграмма | ✅ | `generatePortfolioSunburst()` |
| Подтверждение критических операций | ✅ | `OrderPreviewBlock` |

**Все 7 ключевых визуализаций из TRADER.md полностью покрыты!** 🎉

---

**Конец ТЗ**
