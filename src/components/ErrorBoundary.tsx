import { Component, ReactNode, ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary [${this.props.name || 'Global'}]:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6 p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
            <div className="relative w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="space-y-2 max-w-xs">
            <h2 className="text-xl font-bold text-foreground">A small hiccup occurred</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Something didn't quite work as expected. We've logged the issue and are looking into it.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <Button onClick={this.handleReset} variant="default" className="flex-1 gap-2 rounded-xl shadow-lg shadow-primary/20">
              <RefreshCw className="w-4 h-4" /> Try Again
            </Button>
            <Button onClick={this.handleGoHome} variant="outline" className="flex-1 gap-2 rounded-xl border-border/50">
              <Home className="w-4 h-4" /> Go Home
            </Button>
          </div>

          <button 
            onClick={this.handleReload}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
          >
            Hard refresh page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
