import React from 'react';
import type { SummaryBlock } from '../../../types/index.js';

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
