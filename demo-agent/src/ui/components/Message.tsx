import React from 'react';
import ReactMarkdown from 'react-markdown';
import { RenderSpecRenderer } from './RenderSpecRenderer.js';
import type { Message as MessageType, RenderSpec } from '../../types/index.js';

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

  // Try to parse RenderSpec JSON from assistant messages
  const tryParseRenderSpec = (content: string): RenderSpec | null => {
    if (message.role !== 'assistant') return null;

    try {
      const json = JSON.parse(content);
      if (json.renderSpec) return json.renderSpec;
    } catch {
      return null;
    }
    return null;
  };

  const renderSpec = tryParseRenderSpec(message.content);

  return (
    <div className={`message ${message.role}`}>
      <div className="message-bubble">
        {renderSpec ? (
          <RenderSpecRenderer
            spec={renderSpec}
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
