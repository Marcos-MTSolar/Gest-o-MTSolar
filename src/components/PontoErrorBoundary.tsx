import React, { Component, ErrorInfo, ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

/**
 * PontoErrorBoundary:
 * Envolve a tela de Ponto Eletrônico para capturar erros de renderização
 * (ex: React error #31 — objeto renderizado diretamente no JSX).
 * Exibe uma mensagem amigável com botão "Tentar novamente" em vez de
 * derrubar a página inteira.
 */
export class PontoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      errorMessage: '',
    };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error: any): State {
    const msg =
      typeof error?.message === 'string' && error.message.length > 0
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Erro inesperado ao renderizar a tela de ponto.';
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(error: any, info: ErrorInfo) {
    console.error('[PontoErrorBoundary] Erro de renderização capturado:', error, info.componentStack);
  }

  handleRetry() {
    (this as any).setState({ hasError: false, errorMessage: '' });
  }

  render() {
    const { hasError, errorMessage } = (this as any).state || {};
    if (hasError) {
      return (
        <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow-lg text-center space-y-4">
          <span className="text-5xl">⚠️</span>
          <h2 className="text-lg font-bold text-gray-800">
            Ocorreu um erro na tela de Ponto
          </h2>
          <p className="text-sm text-gray-500">
            {errorMessage}
          </p>
          <p className="text-xs text-gray-400">
            Sua última batida pode ter sido registrada normalmente.
            Verifique seu histórico de hoje após recarregar.
          </p>
          <button
            onClick={this.handleRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors"
          >
            🔄 Tentar novamente
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
