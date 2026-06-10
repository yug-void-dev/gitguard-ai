import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '400px', width: '100%', padding: '40px', textAlign: 'center',
          background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#f87171', fontSize: 20, marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
            Something went wrong
          </h2>
          <p style={{ color: '#fca5a5', fontSize: 14, marginBottom: 24, fontFamily: "'Inter', sans-serif", opacity: 0.8 }}>
            {this.props.fallbackMessage || this.state.error?.message || 'An unexpected error occurred in this component.'}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif"
            }}
          >
            <RefreshCcw size={14} /> Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
