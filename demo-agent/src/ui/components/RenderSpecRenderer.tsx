import React from 'react';
import { SummaryBlockRenderer } from './blocks/SummaryBlock.js';
import { ChartBlockRenderer } from './blocks/ChartBlock.js';
import { TableBlockRenderer } from './blocks/TableBlock.js';
import { RebalanceBlockRenderer } from './blocks/RebalanceBlock.js';
import { OrderPreviewBlockRenderer } from './blocks/OrderPreviewBlock.js';
import type { RenderSpec } from '../../types/index.js';

interface RenderSpecRendererProps {
  spec: RenderSpec;
  onOrderConfirm?: (token: string) => void;
  onOrderCancel?: () => void;
}

export const RenderSpecRenderer: React.FC<RenderSpecRendererProps> = ({
  spec,
  onOrderConfirm,
  onOrderCancel
}) => {
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
