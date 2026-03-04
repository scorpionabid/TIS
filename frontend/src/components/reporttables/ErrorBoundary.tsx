/**
 * Error Boundary for Report Tables
 * Gracefully handles errors in table components
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ReportTableErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ReportTable Error:', error, errorInfo);
    this.setState({ errorInfo });

    // Log to error tracking service in production
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold text-red-700">Cədvəl yüklənərkən xəta baş verdi</h3>
          </div>

          <p className="text-sm text-red-600 mb-4">
            Cədvəl məlumatlarını göstərərkən bir problem yarandı. Səhifəni yeniləməklə və ya təkrar cəhd edin.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <details className="mb-4 text-xs">
              <summary className="cursor-pointer text-red-500 hover:text-red-700">
                Texniki detalları göstər
              </summary>
              <pre className="mt-2 p-3 bg-red-100 rounded overflow-auto max-h-40">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Yenidən cəhd et
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Səhifəni yenilə
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Smaller error boundary for individual table rows
 */
export class TableRowErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TableRow Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <tr className="bg-red-50">
          <td colSpan={100} className="px-4 py-3 text-sm text-red-600">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Sətir göstərilmədi</span>
              <button
                onClick={this.handleReset}
                className="text-xs underline hover:text-red-800 ml-2"
              >
                Yenidən cəhd et
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return this.props.children;
  }
}
