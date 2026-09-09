import { useState } from 'react';

export const App = () => {
  const [connectionStatus, setConnectionStatus] = useState('未確認');

  const checkConnection = async () => {
    setConnectionStatus('確認中…');
    const reply = await window.multiAI.ping();
    setConnectionStatus(reply === 'pong' ? '接続済み' : '応答エラー');
  };

  return (
    <main className="app-shell">
      <section className="intro" aria-labelledby="app-title">
        <p className="eyebrow">DESKTOP WORKSPACE</p>
        <h1 id="app-title">Multi-AI</h1>
        <p className="description">
          複数のAIサービスを一つの作業画面で使うための、最小アプリ基盤です。
        </p>
        <div className="status-card">
          <div>
            <span className="status-label">Main / Renderer IPC</span>
            <strong>{connectionStatus}</strong>
          </div>
          <button type="button" onClick={checkConnection}>
            接続を確認
          </button>
        </div>
      </section>
    </main>
  );
};
