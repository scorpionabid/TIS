/**
 * WizardStepper Component
 * Visual step indicator with progress tracking
 */

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStepperProps, WizardStep } from '../types';

export function WizardStepper({
  currentStep,
  steps,
  validation,
  onStepClick,
  canNavigateToStep,
}: WizardStepperProps) {
  return (
    <div className="flex items-center gap-1 mb-6 px-2">
      {steps.map(({ n, label }, i) => {
        const isActive = currentStep === n;
        const isCompleted = currentStep > n;
        const isValid = n === 1 ? validation.step1.valid :
                       n === 2 ? validation.step2.valid :
                       validation.step3.valid;
        
        const canClick = canNavigateToStep?.(n) ?? (n <= currentStep || isValid);

        return (
          <React.Fragment key={n}>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => canClick && onStepClick?.(n)}
                disabled={!canClick}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2',
                  isActive && 'bg-emerald-600 text-white ring-2 ring-emerald-600 ring-offset-2',
                  isCompleted && 'bg-emerald-100 text-emerald-700',
                  !isActive && !isCompleted && 'bg-gray-100 text-gray-400',
                  canClick && !isActive && 'hover:bg-gray-200 cursor-pointer',
                  !canClick && 'cursor-not-allowed opacity-60'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  n
                )}
              </button>
              <div className="hidden sm:block">
                <p
                  className={cn(
                    'text-sm font-medium leading-tight',
                    isActive ? 'text-gray-900' : 'text-gray-500'
                  )}
                >
                  {label}
                </p>
                {!isValid && n < currentStep && (
                  <p className="text-xs text-red-500">Xətalar var</p>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 transition-colors',
                  isCompleted ? 'bg-emerald-300' : 'bg-gray-200'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
