import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Algo deu errado
          </h1>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            Ocorreu uma falha inesperada ao carregar a interface. Tente recarregar a página.
          </p>

          {this.state.error && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono max-w-lg mb-6 overflow-x-auto text-left">
              {this.state.error.message}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recarregar página</span>
            </button>
            <button
              onClick={this.handleGoHome}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Ir para o Início</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
