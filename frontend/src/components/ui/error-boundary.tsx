import * as React from "react"
import { cn } from "@/lib/utils"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; reset: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo })
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔴 Error Boundary Caught Error')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="text-center">
            <FallbackComponent error={this.state.error} reset={this.handleReset} />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, reset }: { error?: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-destructive bg-destructive/10 p-6 max-w-md mx-auto">
      <div className="flex items-center space-x-2 mb-4">
        <div className="h-8 w-8 rounded-full bg-destructive flex items-center justify-center">
          <span className="text-destructive-foreground text-lg font-bold">!</span>
        </div>
        <h2 className="text-lg font-semibold text-destructive-foreground">
          Something went wrong
        </h2>
      </div>
      
      <div className="space-y-2">
        <p className="text-destructive-foreground">
          We encountered an unexpected error. This has been logged and our team will look into it.
        </p>
        
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-destructive-foreground hover:text-destructive">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto text-muted-foreground">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
      
      <button
        onClick={reset}
        className="mt-4 w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  )
}

export { ErrorBoundary, type ErrorBoundaryProps }
