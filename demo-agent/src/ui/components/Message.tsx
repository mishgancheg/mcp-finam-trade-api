import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message as MessageType } from '../../types/index';

interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`message ${message.role}`}>
      <div className="message-bubble">
        <ReactMarkdown>{message.content}</ReactMarkdown>
        <div className="message-time">{formatTime(message.timestamp)}</div>
      </div>
    </div>
  );
};

export default Message;
