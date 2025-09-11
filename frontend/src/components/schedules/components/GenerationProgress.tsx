import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Loader2, Zap, Users, Calendar } from 'lucide-react';

interface GenerationProgressProps {
  progress: number;
  onComplete: () => void;
}

interface ProgressStep {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  minProgress: number;
  maxProgress: number;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  progress,
  onComplete
}) => {
  const steps: ProgressStep[] = [
    {
      id: 'validation',
      label: 'Dərs yükü yoxlanılır',
      description: 'Məlumatların düzgünlüyü təsdiqlənir',
      icon: CheckCircle,
      minProgress: 0,
      maxProgress: 20
    },
    {
      id: 'preparation',
      label: 'Məlumatlar hazırlanır',
      description: 'Müəllim, sinif və fənn məlumatları işlənir',
      icon: Users,
      minProgress: 20,
      maxProgress: 40
    },
    {
      id: 'generation',
      label: 'Cədvəl yaradılır',
      description: 'AI alqoritmi ilə optimal cədvəl yaradılır',
      icon: Zap,
      minProgress: 40,
      maxProgress: 80
    },
    {
      id: 'finalization',
      label: 'Son yoxlama',
      description: 'Konfliktlər aşkarlanır və həll edilir',
      icon: Calendar,
      minProgress: 80,
      maxProgress: 100
    }
  ];

  const getCurrentStep = () => {
    return steps.find(step => progress >= step.minProgress && progress < step.maxProgress) || steps[steps.length - 1];
  };

  const currentStep = getCurrentStep();

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  const getProgressMessage = () => {
    if (progress >= 100) {
      return 'Cədvəl uğurla yaradıldı!';
    }
    return currentStep.label;
  };

  const getProgressDescription = () => {
    if (progress >= 100) {
      return 'Cədvəliniz hazırdır və nəzərdən keçirilə bilər';
    }
    return currentStep.description;
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          {/* Main Progress Circle */}
          <div className="relative inline-flex">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              {progress >= 100 ? (
                <CheckCircle className="w-12 h-12 text-green-600" />
              ) : (
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              )}
            </div>
            
            {/* Progress Ring */}
            <div className="absolute inset-0">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-primary/20"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  className="text-primary transition-all duration-300 ease-in-out"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 44}`,
                    strokeDashoffset: `${2 * Math.PI * 44 * (1 - progress / 100)}`
                  }}
                />
              </svg>
            </div>
          </div>

          {/* Progress Percentage */}
          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">
              {Math.round(progress)}%
            </div>
            <div className="text-lg font-medium text-gray-900">
              {getProgressMessage()}
            </div>
            <div className="text-sm text-gray-600">
              {getProgressDescription()}
            </div>
          </div>

          {/* Linear Progress Bar */}
          <div className="w-full space-y-2">
            <Progress 
              value={progress} 
              className="h-2 bg-gray-100"
            />
            <div className="text-xs text-gray-500">
              {progress < 100 ? 'Gözləyin...' : 'Tamamlandı'}
            </div>
          </div>

          {/* Step Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
            {steps.map((step) => {
              const StepIcon = step.icon;
              const isCompleted = progress > step.maxProgress;
              const isCurrent = currentStep.id === step.id;
              const isUpcoming = progress < step.minProgress;
              
              return (
                <div key={step.id} className="text-center space-y-2">
                  <div className={`w-10 h-10 mx-auto rounded-full border-2 flex items-center justify-center transition-colors ${
                    isCompleted 
                      ? 'bg-green-100 border-green-500 text-green-600'
                      : isCurrent
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <div className={`text-xs font-medium transition-colors ${
                    isCompleted 
                      ? 'text-green-600'
                      : isCurrent
                        ? 'text-primary'
                        : 'text-gray-500'
                  }`}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Estimated Time */}
          {progress < 100 && (
            <div className="pt-4 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
              <div className="font-medium mb-1">Təxmini vaxt</div>
              <div>
                {progress < 20 && '30-45 saniyə'}
                {progress >= 20 && progress < 40 && '20-30 saniyə'}
                {progress >= 40 && progress < 80 && '60-90 saniyə'}
                {progress >= 80 && '10-15 saniyə'}
              </div>
            </div>
          )}

          {/* Success Message */}
          {progress >= 100 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  Cədvəl yaratma prosesi tamamlandı
                </span>
              </div>
              <div className="text-green-700 text-sm mt-1">
                Nəticələri nəzərdən keçirməyə davam edə bilərsiniz
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};