import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Upload,
  Download,
  Activity,
  Timer
} from 'lucide-react';

interface ProgressStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

interface ProgressTrackerProps {
  title: string;
  description?: string;
  steps: ProgressStep[];
  currentStep?: string;
  overallProgress?: number;
  showEstimatedTime?: boolean;
  estimatedTimeRemaining?: number; // in seconds
  icon?: React.ReactNode;
  variant?: 'import' | 'export' | 'general';
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  title,
  description,
  steps,
  currentStep,
  overallProgress,
  showEstimatedTime = false,
  estimatedTimeRemaining,
  icon,
  variant = 'general'
}) => {
  const getVariantIcon = () => {
    switch (variant) {
      case 'import':
        return <Upload className="h-5 w-5 text-blue-600" />;
      case 'export':
        return <Download className="h-5 w-5 text-green-600" />;
      default:
        return <Activity className="h-5 w-5 text-purple-600" />;
    }
  };

  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepStatusColor = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'in_progress':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)} saniyə`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} dəqiqə`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.ceil((seconds % 3600) / 60);
      return `${hours} saat ${minutes} dəqiqə`;
    }
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const calculatedProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const displayProgress = overallProgress !== undefined ? overallProgress : calculatedProgress;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon || getVariantIcon()}
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Ümumi İrəliləyiş</span>
            <span className="text-muted-foreground">
              {Math.round(displayProgress)}% ({completedSteps}/{totalSteps})
            </span>
          </div>
          <Progress value={displayProgress} className="h-2" />
          
          {showEstimatedTime && estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" />
              <span>Təxmini qalan vaxt: {formatTime(estimatedTimeRemaining)}</span>
            </div>
          )}
        </div>

        {/* Step Details */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Addımlar:</h4>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div 
                key={step.id} 
                className={`p-3 rounded-lg border transition-all duration-200 ${getStepStatusColor(step)} ${
                  currentStep === step.id ? 'ring-2 ring-blue-500/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      {index + 1}
                    </Badge>
                    {getStepIcon(step)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="font-medium text-sm truncate">{step.title}</h5>
                      {step.status === 'in_progress' && step.progress !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {step.progress}%
                        </span>
                      )}
                    </div>
                    
                    {step.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    )}
                    
                    {step.status === 'in_progress' && step.progress !== undefined && (
                      <Progress value={step.progress} className="h-1 mt-2" />
                    )}
                    
                    {step.error && (
                      <p className="text-xs text-red-600 mt-1 break-words">
                        ❌ {step.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Summary */}
        <div className="flex items-center justify-between pt-3 border-t text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-green-600">{completedSteps} tamamlandı</span>
            </div>
            
            {steps.some(s => s.status === 'error') && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-600" />
                <span className="text-red-600">
                  {steps.filter(s => s.status === 'error').length} xəta
                </span>
              </div>
            )}
            
            {steps.some(s => s.status === 'in_progress') && (
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-blue-600" />
                <span className="text-blue-600">
                  {steps.filter(s => s.status === 'in_progress').length} davam edir
                </span>
              </div>
            )}
          </div>
          
          <div className="text-muted-foreground">
            {steps.filter(s => s.status === 'pending').length} gözləyir
          </div>
        </div>
      </CardContent>
    </Card>
  );
};