/**
 * Enhanced Error Boundary with Advanced Error Tracking
 * 
 * Provides comprehensive error handling with:
 * - Automatic error tracking and reporting
 * - Performance monitoring integration
 * - User-friendly error recovery
 * - Development debugging tools
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Copy, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { errorTracker, trackComponentError } from '@/utils/errorTracker';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { cacheService } from '@/services/CacheService';

export interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
  name?: string;
  showDetails?: boolean;
  enableRecovery?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  retryCount: number;
  showDetails: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryLimit = 3;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const startTime = performance.now();

    // Track error with advanced error tracker
    const errorId = trackComponentError(error, errorInfo, {
      component: this.props.name || 'EnhancedErrorBoundary',
      additionalInfo: {
        level: this.props.level || 'component',
        retryCount: this.state.retryCount,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    });

    // Record performance metric
    const endTime = performance.now();
    performanceMonitor.recordComponentRender({
      name: 'error-boundary-catch',
      componentName: this.props.name || 'EnhancedErrorBoundary',
      duration: endTime - startTime,
      renderCount: 1,
      props: { errorId, level: this.props.level }
    });

    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Clear potentially corrupted cache
    if (this.props.level === 'page') {
      cacheService.clearByTags(['page', 'navigation']);
    }

    console.group(`🚨 Error Boundary Triggered [${this.props.name || 'Unknown'}]`);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.log('Error ID:', errorId);
    console.log('Retry Count:', this.state.retryCount);
    console.groupEnd();
  }

  handleRetry = () => {
    if (this.state.retryCount < this.retryLimit) {
      console.log(`🔄 Retrying error recovery (attempt ${this.state.retryCount + 1}/${this.retryLimit})`);
      
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReload = () => {
    console.log('🔄 Reloading page due to error boundary');
    window.location.reload();
  };

  handleReset = () => {
    console.log('🔄 Resetting error boundary state');
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      retryCount: 0
    });
  };

  handleCopyError = () => {
    const errorData = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2))
      .then(() => console.log('📋 Error data copied to clipboard'))
      .catch(err => console.error('Failed to copy error data:', err));
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  renderErrorSeverityBadge() {
    const level = this.props.level || 'component';
    const variant = level === 'page' ? 'destructive' : level === 'section' ? 'secondary' : 'outline';
    
    return (
      <Badge variant={variant} className="mb-2">
        {level === 'page' ? 'Page Error' : level === 'section' ? 'Section Error' : 'Component Error'}
      </Badge>
    );
  }

  renderErrorActions() {
    const canRetry = this.props.enableRecovery !== false && this.state.retryCount < this.retryLimit;
    
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {canRetry && (
          <Button onClick={this.handleRetry} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Təkrar cəhd et ({this.retryLimit - this.state.retryCount} qaldı)
          </Button>
        )}
        
        <Button onClick={this.handleReset} variant="outline" size="sm">
          Sıfırla
        </Button>

        {this.props.level === 'page' && (
          <Button onClick={this.handleReload} size="sm">
            Səhifəni yenilə
          </Button>
        )}

        {process.env.NODE_ENV === 'development' && (
          <Button onClick={this.handleCopyError} variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Xəta məlumatını kopyala
          </Button>
        )}
      </div>
    );
  }

  renderErrorDetails() {
    if (!this.props.showDetails && process.env.NODE_ENV !== 'development') {
      return null;
    }

    return (
      <Collapsible open={this.state.showDetails} onOpenChange={this.toggleDetails}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full mt-4">
            <Bug className="w-4 h-4 mr-2" />
            {this.state.showDetails ? 'Xəta məlumatını gizlə' : 'Xəta məlumatını göstər'}
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${this.state.showDetails ? 'transform rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Xəta məlumatları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {this.state.errorId && (
                  <div>
                    <strong className="text-xs">Error ID:</strong>
                    <code className="block mt-1 p-2 bg-muted rounded text-xs font-mono">
                      {this.state.errorId}
                    </code>
                  </div>
                )}
                
                {this.state.error && (
                  <div>
                    <strong className="text-xs">Error Message:</strong>
                    <code className="block mt-1 p-2 bg-muted rounded text-xs font-mono">
                      {this.state.error.message}
                    </code>
                  </div>
                )}

                {this.state.error?.stack && (
                  <div>
                    <strong className="text-xs">Stack Trace:</strong>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}

                {this.state.errorInfo?.componentStack && (
                  <div>
                    <strong className="text-xs">Component Stack:</strong>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default enhanced fallback UI
      const isPageLevel = this.props.level === 'page';
      const containerClass = isPageLevel 
        ? "flex flex-col items-center justify-center min-h-[60vh] p-8 text-center"
        : "flex flex-col items-center justify-center min-h-[300px] p-6 text-center border border-destructive/20 rounded-lg bg-destructive/5";

      return (
        <div className={containerClass}>
          {this.renderErrorSeverityBadge()}
          
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          
          <h3 className={`font-bold text-foreground mb-2 ${isPageLevel ? 'text-2xl' : 'text-lg'}`}>
            {isPageLevel ? 'Səhifə yüklənmədi' : 'Bu bölmə yüklənmədi'}
          </h3>
          
          <p className="text-muted-foreground mb-6 max-w-md text-sm">
            {isPageLevel 
              ? 'Səhifə yüklənərkən gözlənilməz bir problem yarandı. Səhifəni yenidən yükləyin və ya dəstək komandası ilə əlaqə saxlayın.'
              : 'Bu komponent yüklənərkən xəta yarandı. Təkrar cəhd edin və ya səhifəni yeniləyin.'
            }
          </p>

          {this.state.errorId && (
            <p className="text-xs text-muted-foreground mb-4">
              Xəta kodu: <code className="font-mono bg-muted px-1 py-0.5 rounded">{this.state.errorId}</code>
            </p>
          )}

          {this.renderErrorActions()}
          {this.renderErrorDetails()}
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
