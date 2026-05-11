import React, { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state as any;
    if (hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2>❌ ERRO CRÍTICO NO SISTEMA</h2>
          <p>Ocorreu um erro inesperado que impediu o carregamento da página.</p>
          <pre style={{ background: '#f8f8f8', padding: 10, borderRadius: 5, overflow: 'auto', maxWidth: '100%' }}>
            {error}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '12px 24px', 
              marginTop: 20, 
              backgroundColor: '#1e3a8a', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8,
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Recarregar Aplicativo
          </button>
        </div>
      );
    }
    // @ts-ignore
    return (this.props as any).children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
