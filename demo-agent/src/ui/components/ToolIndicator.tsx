import React from 'react';
import type { ToolCall } from '../../types/index';

interface ToolIndicatorProps {
  toolCall: ToolCall;
}

const ToolIndicator: React.FC<ToolIndicatorProps> = ({ toolCall }) => {
  return (
    <div className="tool-indicator">
      <span className="tool-indicator-icon">🔧</span>
      <span>
        Используется инструмент: <strong>{toolCall.name}</strong>
      </span>
    </div>
  );
};

export default ToolIndicator;
