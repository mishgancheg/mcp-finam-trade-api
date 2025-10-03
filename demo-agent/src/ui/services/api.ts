import axios from 'axios';
import type { StreamChunk } from '../../types/index';

const API_BASE = '/api';

export interface CreateSessionResponse {
  sessionId: string;
  userId: string;
  createdAt: string;
}

export interface SendMessageResponse {
  sessionId: string;
  message: string;
  toolCalls: any[];
  timestamp: string;
}

export const createSession = async (userId: string): Promise<CreateSessionResponse> => {
  const response = await axios.post(`${API_BASE}/sessions`, { userId });
  return response.data;
};

export const getSessionHistory = async (sessionId: string) => {
  const response = await axios.get(`${API_BASE}/sessions/${sessionId}/history`);
  return response.data;
};

export const deleteSession = async (sessionId: string) => {
  const response = await axios.delete(`${API_BASE}/sessions/${sessionId}`);
  return response.data;
};

export const sendMessage = async (
  sessionId: string,
  message: string
): Promise<SendMessageResponse> => {
  const response = await axios.post(`${API_BASE}/chat`, {
    sessionId,
    message
  });
  return response.data;
};

export const sendMessageStream = async (
  sessionId: string,
  message: string,
  onChunk: (chunk: StreamChunk) => void
): Promise<void> => {
  const url = `${API_BASE}/chat/stream?sessionId=${encodeURIComponent(sessionId)}&message=${encodeURIComponent(message)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            onChunk(parsed as StreamChunk);

            if (parsed.type === 'done') {
              return;
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
};

export const getTools = async () => {
  const response = await axios.get(`${API_BASE}/tools`);
  return response.data;
};
