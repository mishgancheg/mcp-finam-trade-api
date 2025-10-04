/**
 * RenderSpec Protocol Types
 *
 * Backend generates JSON visualization specifications,
 * Frontend deterministically renders them.
 */

export interface RenderSpec {
  blocks: RenderBlock[];
  metadata?: {
    generatedAt: string;
    dataSource: 'emulator' | 'live';
  };
}

export type RenderBlock =
  | SummaryBlock
  | ChartBlock
  | TableBlock
  | RebalanceBlock
  | OrderPreviewBlock;

/**
 * Text summary with bullet points
 */
export interface SummaryBlock {
  type: 'summary';
  title?: string;
  bullets: string[];
  highlights?: {
    positive?: string[];
    negative?: string[];
  };
}

/**
 * Charts using ECharts or Lightweight-Charts
 */
export interface ChartBlock {
  type: 'chart';
  engine: 'echarts' | 'lightweight';
  chartKind: string; // 'sunburst', 'equity-curve', 'candlestick', 'trades-chart'
  title?: string;
  spec: any; // ECharts option or Lightweight config
  markers?: ChartMarker[];
}

export interface ChartMarker {
  time: string;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
  text: string;
}

/**
 * Tables with Sparklines support
 */
export interface TableBlock {
  type: 'table';
  title?: string;
  columns: TableColumn[];
  rows: Record<string, any>[];
  sortable?: boolean;
}

export interface TableColumn {
  id: string;
  label: string;
  type?: 'text' | 'number' | 'percent' | 'currency' | 'sparkline';
  sparklineData?: number[]; // for type: 'sparkline'
}

/**
 * Portfolio rebalancing simulator
 */
export interface RebalanceBlock {
  type: 'rebalance';
  title?: string;
  currentAllocation: AllocationItem[];
  targetAllocation: AllocationItem[];
  trades: RebalanceTrade[];
}

export interface AllocationItem {
  symbol: string;
  weight: number; // 0-100%
  value: number;
}

export interface RebalanceTrade {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  estimatedCost: number;
}

/**
 * Order preview with confirmation
 */
export interface OrderPreviewBlock {
  type: 'order_preview';
  order: OrderDetails;
  warnings: string[];
  confirmToken: string;
}

export interface OrderDetails {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  type: 'MARKET' | 'LIMIT' | 'STOP';
  price?: string;
  estimated_total: string;
  estimated_commission: string;
}

/**
 * MCP API data types (from FINAM Trade API)
 */
export interface Position {
  symbol: string;
  quantity: { value: string };
  average_price?: { value: string };
  current_price?: { value: string };
  unrealized_pnl?: string;
}

export interface Account {
  equity: { value: string };
  positions: Position[];
}

export interface Trade {
  symbol: string;
  timestamp: string;
  side: 'SIDE_BUY' | 'SIDE_SELL';
  quantity: { value: string };
  executed_price?: { value: string };
}

export interface Bar {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}
