import { useState, useCallback } from 'react';
import { sendMessage as apiSendMessage, sendMessageStream as apiSendMessageStream } from '../services/api';
import type { Message, ToolCall } from '../../types/index';

export const useChat = (sessionId: string, accountId: string, secretKey: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    // Add user message immediately (should always appear in the dialog)
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // secretKey может быть пустым - сервер использует API_SECRET_TOKEN из env как резервный вариант
    const effectiveSecret = String(secretKey ?? '').trim();

    // Validate only accountId (secretKey will be validated on server side)
    if (!accountId) {
      console.error('Номер счета не задан');
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Ошибка: не задан номер счета',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    setIsLoading(true);
    setToolCalls([]);

    try {
      const response = await apiSendMessage(sessionId, message, accountId, effectiveSecret);

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(response.timestamp),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        setToolCalls(response.toolCalls);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Ошибка при обработке сообщения: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, accountId, secretKey]);

  const sendMessageStream = useCallback(async (message: string) => {
    if (!message.trim()) return;

    // Add user message immediately (should always appear in the dialog)
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // secretKey может быть пустым - сервер использует API_SECRET_TOKEN из env как резервный вариант
    const effectiveSecret = String(secretKey ?? '').trim();

    // Validate only accountId (secretKey will be validated on server side)
    if (!accountId) {
      console.error('Номер счета не задан');
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Ошибка: не задан номер счета',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    setIsLoading(true);
    setToolCalls([]);

    let assistantMessageContent = '';

    try {
      await apiSendMessageStream(
        sessionId,
        message,
        accountId,
        effectiveSecret,
        (chunk) => {
          if (chunk.type === 'text') {
            const textContent = typeof chunk.content === 'string' ? chunk.content : '';

            // Check for clear marker (RenderSpec replacement)
            if (textContent.startsWith('\x00CLEAR\x00')) {
              // Clear previous content and use only RenderSpec
              assistantMessageContent = textContent.replace('\x00CLEAR\x00', '');
            } else {
              assistantMessageContent += textContent;
            }

            // Update the last message (assistant's response) in real-time
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];

              if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.content = assistantMessageContent;
              } else {
                newMessages.push({
                  role: 'assistant',
                  content: assistantMessageContent,
                  timestamp: new Date(),
                });
              }

              return newMessages;
            });
          } else if (chunk.type === 'tool_call') {
            setToolCalls(prev => [...prev, chunk.content as ToolCall]);
          }
        },
      );
    } catch (error) {
      console.error('Failed to send streaming message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Ошибка при обработке сообщения: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, accountId, secretKey]);

  return {
    messages,
    toolCalls,
    isLoading,
    sendMessage,
    sendMessageStream,
  };
};
