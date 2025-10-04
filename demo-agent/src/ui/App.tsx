import React, { useState, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';
import { useSession } from './hooks/useSession';

const App: React.FC = () => {
  const { sessionId, createSession, clearSession } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [accountId, setAccountId] = useState('1982834');

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
            <label htmlFor="accountId">Account ID:</label>
            <input
              id="accountId"
              type="text"
              value={accountId}
              onChange={handleAccountIdChange}
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
          <ChatWindow sessionId={sessionId} accountId={accountId} />
        ) : (
          <div className="no-session">Нет активной сессии</div>
        )}
      </main>
    </div>
  );
};

export default App;
