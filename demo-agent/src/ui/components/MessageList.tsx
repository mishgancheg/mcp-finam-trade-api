import React from 'react';
import Message from './Message';
import ToolIndicator from './ToolIndicator';
import type { Message as MessageType, ToolCall } from '../../types/index';

interface MessageListProps {
  messages: MessageType[];
  toolCalls: ToolCall[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  toolCalls,
  isLoading,
  messagesEndRef
}) => {
  return (
    <div className="message-list">
      {messages.map((message, index) => (
        <Message key={index} message={message} />
      ))}

      {toolCalls.length > 0 && (
        <div className="tool-calls">
          {toolCalls.map((toolCall, index) => (
            <ToolIndicator key={index} toolCall={toolCall} />
          ))}
        </div>
      )}

      {isLoading && (
        <div className="typing-indicator">
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
