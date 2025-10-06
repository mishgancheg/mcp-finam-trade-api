import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChartBlockRenderer } from './blocks/ChartBlock.js';
import { TableBlockRenderer } from './blocks/TableBlock.js';
import { RebalanceBlockRenderer } from './blocks/RebalanceBlock.js';
import type { RenderBlock } from '../../types/index.js';

interface RefTag {
  type: 'chart' | 'table' | 'rebalance';
  id: string;
  fullMatch: string;
}

interface TextWithVisualizationProps {
  content: string;
  onOrderConfirm?: (token: string) => void;
  onOrderCancel?: () => void;
}

export const TextWithVisualization: React.FC<TextWithVisualizationProps> = ({
  content,
  onOrderConfirm,
  onOrderCancel,
}) => {
  const [blocks, setBlocks] = useState<Map<string, RenderBlock>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const parseTags = (): RefTag[] => {
      const tags: RefTag[] = [];

      // Parse chart-ref tags
      const chartRegex = /<chart-ref\s+id="([^"]+)"\s*\/>/g;
      let match;
      while ((match = chartRegex.exec(content)) !== null) {
        tags.push({
          type: 'chart',
          id: match[1],
          fullMatch: match[0],
        });
      }

      // Parse table-ref tags
      const tableRegex = /<table-ref\s+id="([^"]+)"\s*\/>/g;
      while ((match = tableRegex.exec(content)) !== null) {
        tags.push({
          type: 'table',
          id: match[1],
          fullMatch: match[0],
        });
      }

      // Parse rebalance-ref tags
      const rebalanceRegex = /<rebalance-ref\s+id="([^"]+)"\s*\/>/g;
      while ((match = rebalanceRegex.exec(content)) !== null) {
        tags.push({
          type: 'rebalance',
          id: match[1],
          fullMatch: match[0],
        });
      }

      return tags;
    };

    const fetchSpecs = async () => {
      const tags = parseTags();

      if (tags.length === 0) {
        setLoading(false);
        return;
      }

      const newBlocks = new Map<string, RenderBlock>();

      // Fetch all specs in parallel
      await Promise.all(
        tags.map(async (tag) => {
          try {
            const response = await fetch(`/api/specs/${tag.id}`);
            if (response.ok) {
              const spec = await response.json();
              newBlocks.set(tag.id, spec);
            } else {
              console.error(`Failed to fetch spec ${tag.id}:`, response.statusText);
            }
          } catch (error) {
            console.error(`Error fetching spec ${tag.id}:`, error);
          }
        })
      );

      setBlocks(newBlocks);
      setLoading(false);
    };

    fetchSpecs();
  }, [content]);

  // Split content into parts (text and visualization blocks)
  const renderContent = () => {
    const refRegex = /<(chart|table|rebalance)-ref\s+id="([^"]+)"\s*\/>/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = refRegex.exec(content)) !== null) {
      // Add text before the tag
      if (match.index > lastIndex) {
        const textPart = content.substring(lastIndex, match.index);
        parts.push(
          <ReactMarkdown key={`text-${lastIndex}`}>{textPart}</ReactMarkdown>
        );
      }

      // Add visualization block
      const blockType = match[1] as 'chart' | 'table' | 'rebalance';
      const blockId = match[2];
      const block = blocks.get(blockId);

      if (block) {
        if (blockType === 'chart' && block.type === 'chart') {
          parts.push(
            <ChartBlockRenderer
              key={`chart-${blockId}`}
              block={block}
            />
          );
        } else if (blockType === 'table' && block.type === 'table') {
          parts.push(
            <TableBlockRenderer
              key={`table-${blockId}`}
              block={block}
            />
          );
        } else if (blockType === 'rebalance' && block.type === 'rebalance') {
          parts.push(
            <RebalanceBlockRenderer
              key={`rebalance-${blockId}`}
              block={block}
            />
          );
        }
      } else if (!loading) {
        // Show placeholder if spec not found and not loading
        parts.push(
          <div key={`error-${blockId}`} className="visualization-error">
            ⚠️ Visualization not available (ID: {blockId})
          </div>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const textPart = content.substring(lastIndex);
      parts.push(
        <ReactMarkdown key={`text-${lastIndex}`}>{textPart}</ReactMarkdown>
      );
    }

    return parts.length > 0 ? parts : <ReactMarkdown>{content}</ReactMarkdown>;
  };

  if (loading) {
    return <div>Loading visualizations...</div>;
  }

  return <div className="text-with-visualization">{renderContent()}</div>;
};
