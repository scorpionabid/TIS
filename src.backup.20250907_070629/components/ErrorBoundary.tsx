import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = () => {
    // Reset the error boundary state
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    // Optionally reload the page
    window.location.reload();
  };

  handleReset = () => {
    // Just reset the error boundary state without reloading
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Bir xəta baş verdi
          </h2>
          
          <p className="text-muted-foreground mb-6 max-w-md">
            Bu səhifə yüklənərkən gözlənilməz bir problem yarandı. 
            Səhifəni yenidən yükləməyi və ya təkrar cəhd etməyi sınayın.
          </p>

          {/* Show detailed error in development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mb-6 p-4 bg-muted rounded-lg text-left max-w-2xl overflow-auto">
              <h3 className="font-medium text-sm mb-2">Xəta məlumatları (yalnız development-də):</h3>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack && (
                  <>\n\nComponent Stack:{this.state.errorInfo.componentStack}</>
                )}
              </pre>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button onClick={this.handleReset} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Təkrar cəhd et
            </Button>
            
            <Button onClick={this.handleReload}>
              Səhifəni yenilə
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  return { captureError, resetError };
};

// Higher-order component version
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};