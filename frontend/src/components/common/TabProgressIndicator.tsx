import React from 'react';
import { cn } from '@/lib/utils';

interface TabProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

/**
 * TabProgressIndicator - Tab-based form üçün progress göstəricisi
 *
 * @example
 * ```tsx
 * <TabProgressIndicator currentStep={1} totalSteps={3} />
 * ```
 */
export const TabProgressIndicator: React.FC<TabProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  className
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
        Addım {currentStep} / {totalSteps}
      </span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Addım ${currentStep} / ${totalSteps}`}
        />
      </div>
    </div>
  );
};
