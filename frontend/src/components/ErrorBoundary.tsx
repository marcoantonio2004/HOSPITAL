import React, { ErrorInfo } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '2rem', textAlign: 'center', background: 'var(--bg-color)' }}>
          <AlertTriangle size={64} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h1 style={{ color: 'var(--text-dark)', marginBottom: '1rem' }}>Algo salió mal</h1>
          <p style={{ color: 'var(--text-light)', marginBottom: '2rem', maxWidth: '500px' }}>
            Ha ocurrido un error inesperado en la aplicación. Por favor, intenta de nuevo o regresa a la página de inicio.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.href = '/'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Home size={16} /> Volver al inicio
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => window.location.reload()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={16} /> Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
