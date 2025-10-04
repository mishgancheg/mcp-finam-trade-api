import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import InputField from './InputField';
import { useChat } from '../hooks/useChat';

interface ChatWindowProps {
  sessionId: string;
  accountId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ sessionId, accountId }) => {
  const { messages, toolCalls, isLoading, sendMessage, sendMessageStream } = useChat(sessionId, accountId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    // Use streaming by default
    await sendMessageStream(message);
  };

  return (
    <div className="chat-window">
      <MessageList
        messages={messages}
        toolCalls={toolCalls}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
      />
      <InputField onSendMessage={handleSendMessage} disabled={isLoading} />
    </div>
  );
};

export default ChatWindow;
