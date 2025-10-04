import React, { useState, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';
import { useSession } from './hooks/useSession';

const LS_KEYS = {
  secretKey: 'demoAgent.secretKey',
  accountId: 'demoAgent.accountId',
};

const App: React.FC = () => {
  const { sessionId, createSession, clearSession } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [accountId, setAccountId] = useState('1982834');
  const [secretKey, setSecretKey] = useState('');

  // Restore saved values from localStorage on mount
  useEffect(() => {
    try {
      const savedAccountId = typeof window !== 'undefined' ? window.localStorage.getItem(LS_KEYS.accountId) : null;
      const savedSecretKey = typeof window !== 'undefined' ? window.localStorage.getItem(LS_KEYS.secretKey) : null;
      if (savedAccountId !== null) setAccountId(savedAccountId);
      if (savedSecretKey !== null) setSecretKey(savedSecretKey);
    } catch (e) {
      // ignore localStorage errors (e.g., disabled storage)
      console.warn('localStorage is not available:', e);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await createSession();
      setIsLoading(false);
    };
    init();
  }, []);

  const handleNewChat = async () => {
    await createSession();
  };

  const handleAccountIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccountId(e.target.value);
  };

  const handleSecretKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSecretKey(e.target.value);
  };

  const handleAccountIdBlur = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LS_KEYS.accountId, accountId);
      }
    } catch (e) {
      console.warn('Failed to save accountId to localStorage:', e);
    }
  };

  const handleSecretKeyBlur = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LS_KEYS.secretKey, secretKey);
      }
    } catch (e) {
      console.warn('Failed to save secretKey to localStorage:', e);
    }
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Инициализация...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>FINAM Demo Agent</h1>
        <div className="header-controls">
          <div className="account-id-input">
            <label htmlFor="secretKey">Секретный ключ:</label>
            <input
              id="secretKey"
              type="password"
              value={secretKey}
              onChange={handleSecretKeyChange}
              onBlur={handleSecretKeyBlur}
              placeholder="Secret Key"
            />
          </div>
          <div className="account-id-input">
            <label htmlFor="accountId">Номер счета:</label>
            <input
              id="accountId"
              type="text"
              value={accountId}
              onChange={handleAccountIdChange}
              onBlur={handleAccountIdBlur}
              placeholder="Account ID"
            />
          </div>
          <button onClick={handleNewChat} className="btn-new-chat">
            Новый чат
          </button>
        </div>
      </header>
      <main className="app-main">
        {sessionId ? (
          <ChatWindow sessionId={sessionId} accountId={accountId} secretKey={secretKey} />
        ) : (
          <div className="no-session">Нет активной сессии</div>
        )}
      </main>
    </div>
  );
};

export default App;
