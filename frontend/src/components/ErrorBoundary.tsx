import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MONOTUNE ERROR BOUNDARY]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
          <div className="max-w-md w-full brutalist-border-thick p-8 md:p-12 flex flex-col items-center gap-8 bg-grey-silver shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <AlertTriangle size={48} className="text-red-600" />
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-center">
              SIGNAL INTERRUPTED
            </h2>
            <p className="text-xs font-bold tracking-widest uppercase text-grey-mid text-center">
              A COMPONENT HAS CRASHED. YOUR DATA IS SAFE.
            </p>
            {this.state.error && (
              <pre className="w-full bg-black text-white p-4 text-[10px] font-mono overflow-x-auto max-h-32 overflow-y-auto">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="brutalist-button py-4 px-8 flex items-center gap-3 text-lg"
            >
              <RotateCcw size={20} /> RETRY
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
