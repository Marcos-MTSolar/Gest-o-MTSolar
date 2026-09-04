import React, { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 🔒 Tratador de erros de importação dinâmica de chunks (vite:preloadError / Safari iOS cache bug)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const attempts = parseInt(sessionStorage.getItem('chunk_reload_attempts') || '0', 10);
  if (attempts < 1) {
    sessionStorage.setItem('chunk_reload_attempts', '1');
    window.location.reload();
  }
});

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string | null; isChunkError: boolean }> {
  state = { hasError: false, error: null, isChunkError: false };

  static getDerivedStateFromError(error: any) {
    const errMsg = error?.message || String(error);
    const isChunkError = /importing a module script failed|failed to fetch dynamically imported module|preload/i.test(errMsg);
    
    // Tenta 1 auto-reload se for erro de chunk JS e ainda não tiver tentado nesta sessão
    if (isChunkError) {
      const attempts = parseInt(sessionStorage.getItem('chunk_reload_attempts') || '0', 10);
      if (attempts < 1) {
        sessionStorage.setItem('chunk_reload_attempts', '1');
        window.location.reload();
      }
    }

    return { hasError: true, error: errMsg, isChunkError };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    const { hasError, error, isChunkError } = this.state as any;
    if (hasError) {
      return (
        <div style={{ padding: 24, color: '#1e293b', background: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
          <div style={{ background: 'white', padding: 32, borderRadius: 16, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: 48 }}>{isChunkError ? '🔄' : '⚠️'}</span>
            <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: '16px 0 8px 0', color: '#0f172a' }}>
              {isChunkError ? 'Nova versão do sistema disponível' : 'Erro inesperado'}
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
              {isChunkError 
                ? 'O sistema foi atualizado recentemente. Por favor, feche esta aba/aplicativo e abra novamente para carregar os módulos mais recentes.'
                : 'Ocorreu um erro ao carregar esta página.'}
            </p>

            <pre style={{ background: '#f1f5f9', padding: 12, borderRadius: 8, fontSize: 12, textAlign: 'left', overflow: 'auto', maxHeight: 100, marginBottom: 20, color: '#334155' }}>
              {error}
            </pre>

            <button 
              onClick={() => window.location.reload()} 
              style={{ 
                width: '100%',
                padding: '12px 20px', 
                backgroundColor: '#2563eb', 
                color: 'white', 
                border: 'none', 
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              🔄 Recarregar Aplicativo
            </button>
          </div>
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

