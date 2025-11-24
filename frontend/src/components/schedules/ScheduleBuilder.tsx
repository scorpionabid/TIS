import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Settings, 
  Users, 
  BookOpen,
  Calendar,
  Loader2,
  Play,
  RefreshCw,
  Eye
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { WorkloadReview } from './components/WorkloadReview';
import { ScheduleSettings } from './components/ScheduleSettings';
import { GenerationProgress } from './components/GenerationProgress';
import { SchedulePreview } from './components/SchedulePreview';
import { ConflictsList } from './components/ConflictsList';
import { workloadScheduleIntegrationService } from '@/services/workloadScheduleIntegrationService';

export interface Schedule {
  id: number;
  name: string;
  status: string;
  created_at: string;
  sessions?: any[];
  conflicts?: any[];
  statistics?: any;
}

export interface WorkloadData {
  institution: {
    id: number;
    name: string;
    type: string;
  };
  academic_year_id: number;
  settings: GenerationSettings;
  teaching_loads: TeachingLoad[];
  time_slots: TimeSlot[];
  validation: ValidationResult;
  statistics: WorkloadStatistics;
  ready_for_generation: boolean;
}

export interface GenerationSettings {
  working_days: number[];
  daily_periods: number;
  period_duration: number;
  break_periods: number[];
  lunch_break_period?: number;
  first_period_start: string;
  break_duration: number;
  lunch_duration: number;
  generation_preferences?: any;
}

export interface TeachingLoad {
  id: number;
  teacher: {
    id: number;
    name: string;
    email: string;
  };
  subject: {
    id: number;
    name: string;
    code?: string;
  };
  class: {
    id: number;
    name: string;
    grade_level?: number;
  };
  weekly_hours: number;
  priority_level: number;
  preferred_consecutive_hours: number;
  preferred_time_slots: string[];
  unavailable_periods: string[];
  distribution_pattern: any;
  ideal_distribution: any[];
  constraints: any;
}

export interface TimeSlot {
  period_number: number;
  start_time: string;
  end_time: string;
  duration: number;
  is_break: boolean;
  slot_type: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  total_hours: number;
  teacher_hours: any;
  loads_count: number;
}

export interface WorkloadStatistics {
  total_loads: number;
  total_weekly_hours: number;
  unique_teachers: number;
  unique_subjects: number;
  unique_classes: number;
  average_hours_per_teacher: number;
  max_hours_per_teacher: number;
  min_hours_per_teacher: number;
}

interface ScheduleBuilderProps {
  scheduleId?: number;
  onSave?: (schedule: Schedule) => void;
  onCancel?: () => void;
  className?: string;
}

type BuilderStep = 'settings' | 'workload' | 'generation' | 'review';

export const ScheduleBuilder: React.FC<ScheduleBuilderProps> = ({ 
  scheduleId, 
  onSave, 
  onCancel, 
  className 
}) => {
  const [currentStep, setCurrentStep] = useState<BuilderStep>('settings');
  const [workloadData, setWorkloadData] = useState<WorkloadData | null>(null);
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedSchedule, setGeneratedSchedule] = useState<Schedule | null>(null);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const loadWorkloadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await workloadScheduleIntegrationService.getWorkloadReadyData();

      if (!data) {
        throw new Error('Dərs yükü məlumatları yüklənə bilmədi');
      }

      setWorkloadData(data);
      setGenerationSettings(data.settings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Xəta baş verdi';
      setError(errorMessage);
      toast({
        title: "Xəta",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadWorkloadData();
  }, [loadWorkloadData]);

  const handleSettingsNext = (settings: GenerationSettings) => {
    setGenerationSettings(settings);
    setCurrentStep('workload');
  };

  const handleWorkloadNext = () => {
    if (workloadData?.ready_for_generation) {
      setCurrentStep('generation');
    } else {
      toast({
        title: "Xəta",
        description: "Dərs yükü məlumatları cədvəl yaratmaq üçün hazır deyil",
        variant: "destructive"
      });
    }
  };

  const handleGenerateSchedule = async () => {
    if (!workloadData || !generationSettings) {
      toast({
        title: "Xəta", 
        description: "Məlumatlar tam yüklənməyib",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setError(null);

    try {
      const result = await workloadScheduleIntegrationService.generateScheduleFromWorkload({
        workload_data: workloadData,
        generation_preferences: generationSettings.generation_preferences || {}
      });

      if (!result || !result.schedule) {
        throw new Error('Cədvəl yaradılması uğursuz oldu');
      }

      setGeneratedSchedule(result.schedule);
      setConflicts(result.conflicts || []);
      setGenerationProgress(100);
      setCurrentStep('review');
      
      toast({
        title: "Uğurlu",
        description: `Cədvəl yaradıldı! ${result.sessions_created} dərs seansı planlaşdırıldı.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Cədvəl yaradıla bilmədi';
      setError(errorMessage);
      toast({
        title: "Xəta",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScheduleSave = () => {
    if (generatedSchedule && onSave) {
      onSave(generatedSchedule);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'settings', label: 'Tənzimləmələr', icon: Settings },
      { id: 'workload', label: 'Dərs Yükü', icon: BookOpen },
      { id: 'generation', label: 'Yaratma', icon: Play },
      { id: 'review', label: 'Baxış', icon: Eye },
    ];

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isActive 
                    ? 'border-primary bg-primary text-white'
                    : isCompleted 
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                <span className={`ml-3 text-sm font-medium ${
                  isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-px mx-4 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Dərs yükü məlumatları yüklənir...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !workloadData) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Button onClick={loadWorkloadData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Yenidən cəhd et
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Avtomatik Cədvəl Yaradıcısı
          </CardTitle>
          <CardDescription>
            Dərs yüklərindən avtomatik olaraq məktəb cədvəli yaradın
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepIndicator()}

          {currentStep === 'settings' && generationSettings && (
            <ScheduleSettings
              settings={generationSettings}
              onNext={handleSettingsNext}
              onCancel={onCancel}
            />
          )}

          {currentStep === 'workload' && workloadData && (
            <WorkloadReview
              workloadData={workloadData}
              onNext={handleWorkloadNext}
              onBack={() => setCurrentStep('settings')}
            />
          )}

          {currentStep === 'generation' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Cədvəl Yaratmaya Hazır</h3>
                <p className="text-gray-600 mb-6">
                  Dərs yükü məlumatları əsasında avtomatik cədvəl yaradılacaq
                </p>

                {workloadData && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">{workloadData.statistics.unique_teachers}</div>
                        <div className="text-sm text-gray-600">Müəllim</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <BookOpen className="w-6 h-6 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold">{workloadData.statistics.total_loads}</div>
                        <div className="text-sm text-gray-600">Dərs Yükü</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Clock className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl font-bold">{workloadData.statistics.total_weekly_hours}</div>
                        <div className="text-sm text-gray-600">Həftəlik Saat</div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {isGenerating ? (
                  <GenerationProgress 
                    progress={generationProgress}
                    onComplete={() => setCurrentStep('review')}
                  />
                ) : (
                  <div className="space-y-4">
                    <Button 
                      onClick={handleGenerateSchedule}
                      size="lg"
                      className="w-full md:w-auto"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Cədvəl Yarat
                    </Button>
                    
                    <div className="flex justify-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setCurrentStep('workload')}
                      >
                        Geri
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'review' && generatedSchedule && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Cədvəl Yaradıldı</h3>
                <Badge variant="secondary" className="text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Tamamlandı
                </Badge>
              </div>

              <SchedulePreview 
                schedule={generatedSchedule}
                timeSlots={workloadData?.time_slots || []}
              />

              {conflicts.length > 0 && (
                <ConflictsList 
                  conflicts={conflicts}
                  onResolve={(conflict) => {
                    // Handle conflict resolution
                    console.log('Resolving conflict:', conflict);
                  }}
                />
              )}

              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('generation')}
                >
                  Geri
                </Button>
                <div className="space-x-4">
                  <Button variant="outline" onClick={onCancel}>
                    Ləğv et
                  </Button>
                  <Button onClick={handleScheduleSave}>
                    Cədvəli Saxla
                  </Button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Also export as EnhancedScheduleBuilder for backward compatibility
export const EnhancedScheduleBuilder = ScheduleBuilder;
export default ScheduleBuilder;
