import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  componentDidCatch(error: any) {
    this.setState({ error: error.message });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, color: 'red', background: 'white', minHeight: '100vh' }}>
          <h2>❌ ERRO CRÍTICO</h2>
          <pre>{this.state.error}</pre>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', marginTop: 20 }}>
            Tentar Novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
