import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: string;
  errorFallback?: React.ReactNode;
}

const DefaultFallback = ({ minHeight = "400px" }: { minHeight?: string }) => (
  <div 
    className="flex items-center justify-center w-full bg-background/50" 
    style={{ minHeight }}
  >
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Yüklənir...</p>
    </div>
  </div>
);

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback,
  minHeight = "400px",
  errorFallback
}) => {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback || <DefaultFallback minHeight={minHeight} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyWrapper;