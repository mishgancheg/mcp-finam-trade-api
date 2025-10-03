import React, { useState, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';
import { useSession } from './hooks/useSession';

const App: React.FC = () => {
  const { sessionId, createSession, clearSession } = useSession();
  const [isLoading, setIsLoading] = useState(true);

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
        <button onClick={handleNewChat} className="btn-new-chat">
          Новый чат
        </button>
      </header>
      <main className="app-main">
        {sessionId ? (
          <ChatWindow sessionId={sessionId} />
        ) : (
          <div className="no-session">Нет активной сессии</div>
        )}
      </main>
    </div>
  );
};

export default App;
