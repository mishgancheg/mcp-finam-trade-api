import { useState } from 'react';
import { createSession as apiCreateSession } from '../services/api';

export const useSession = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId] = useState<string>('user_' + Date.now());

  const createSession = async () => {
    try {
      const response = await apiCreateSession(userId);
      setSessionId(response.sessionId);
      return response.sessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  };

  const clearSession = () => {
    setSessionId(null);
  };

  return {
    sessionId,
    userId,
    createSession,
    clearSession
  };
};
