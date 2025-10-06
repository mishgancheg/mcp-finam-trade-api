import React from 'react';
import ReactMarkdown from 'react-markdown';
import { TextWithVisualization } from './TextWithVisualization.js';
import type { Message as MessageType } from '../../types/index.js';

interface MessageProps {
  message: MessageType;
  onOrderConfirm?: (token: string) => void;
  onOrderCancel?: () => void;
}

const Message: React.FC<MessageProps> = ({ message, onOrderConfirm, onOrderCancel }) => {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if content has visualization ref tags
  const hasVisualizationTags = (content: string): boolean => {
    return /<(chart|table|rebalance)-ref\s+id="[^"]+"\s*\/>/.test(content);
  };

  const needsVisualization = message.role === 'assistant' && hasVisualizationTags(message.content);

  return (
    <div className={`message ${message.role}`}>
      <div className="message-bubble">
        {needsVisualization ? (
          <TextWithVisualization
            content={message.content}
            onOrderConfirm={onOrderConfirm}
            onOrderCancel={onOrderCancel}
          />
        ) : (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        )}
        <div className="message-time">{formatTime(message.timestamp)}</div>
      </div>
    </div>
  );
};

export default Message;
