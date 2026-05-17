import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ratingConfigService } from '@/services/staffRating';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RotateCcw, AlertTriangle, CheckCircle2, Settings } from 'lucide-react';
import type { RatingConfiguration, ConfigurationUpdate } from '@/types/staffRating';

export default function RatingConfigurationPage() {
  const [configs, setConfigs] = useState<ConfigurationUpdate[]>([]);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get configurations
  const { data, isLoading } = useQuery({
    queryKey: ['rating-configuration'],
    queryFn: () => ratingConfigService.getAll(),
  });

  // Update configs when data changes
  useEffect(() => {
    if (data?.configurations) {
      setConfigs(
        data.configurations.map((c: RatingConfiguration) => ({
          component_name: c.component_name,
          weight: c.weight,
        }))
      );
    }
  }, [data]);

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: (configs: ConfigurationUpdate[]) => ratingConfigService.validate(configs),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (configs: ConfigurationUpdate[]) =>
      ratingConfigService.bulkUpdate(configs, 'Konfiqurasiya yeniləndi'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rating-configuration'] });
      toast({
        title: 'Uğurlu',
        description: 'Konfiqurasiya yeniləndi',
      });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: (reason: string) => ratingConfigService.reset(reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rating-configuration'] });
      toast({
        title: 'Uğurlu',
        description: 'Konfiqurasiya default dəyərlərə qaytarıldı',
      });
      setResetModalOpen(false);
      setResetReason('');
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  const configurations = data?.configurations as RatingConfiguration[];
  const totalWeight = configs.reduce((sum, c) => sum + c.weight, 0);
  const isValid = Math.abs(totalWeight - 1.0) < 0.001;

  const handleWeightChange = (componentName: string, newWeight: number) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.component_name === componentName ? { ...c, weight: newWeight / 100 } : c
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validate first
    const validation = await validateMutation.mutateAsync(configs);
    if (!validation.valid) {
      toast({
        title: 'Validasiya xətası',
        description: validation.message,
        variant: 'destructive',
      });
      return;
    }

    // Update
    updateMutation.mutate(configs);
  };

  const handleReset = () => {
    if (!resetReason.trim()) {
      toast({
        title: 'Xəta',
        description: 'Səbəb daxil edilməlidir',
        variant: 'destructive',
      });
      return;
    }
    resetMutation.mutate(resetReason);
  };

  const getComponentLabel = (name: string): string => {
    const labels: Record<string, string> = {
      staff_task_performance: 'Tapşırıq İcrası',
      staff_survey_performance: 'Sorğu Cavabdehliyi',
      staff_document_activity: 'Sənəd Fəaliyyəti',
      staff_link_management: 'Link İdarəetməsi',
    };
    return labels[name] || name;
  };

  const getComponentDescription = (name: string): string => {
    const descriptions: Record<string, string> = {
      staff_task_performance: 'Tapşırıqların vaxtında və keyfiyyətli icra edilməsi',
      staff_survey_performance: 'Sorğulara cavabdehlik və vaxtında tamamlama',
      staff_document_activity: 'Sənəd yükləmə, paylaşma və idarəetmə fəaliyyəti',
      staff_link_management: 'Link yaratma, paylaşma və aktivlik göstəriciləri',
    };
    return descriptions[name] || '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Qiymətləndirmə Konfiqurasiyası
          </h1>
          <p className="text-muted-foreground mt-2">
            Avtomatik qiymətləndirmə komponentlərinin çəkilərini idarə edin
          </p>
        </div>
      </div>

      {/* Validation Alert */}
      {!isValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Ümumi çəki 100%-ə bərabər olmalıdır. Cari ümumi: {(totalWeight * 100).toFixed(1)}%
          </AlertDescription>
        </Alert>
      )}

      {isValid && hasChanges && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Konfiqurasiya düzgündür. Dəyişiklikləri yadda saxlaya bilərsiniz.
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Cards */}
      <div className="space-y-4">
        {configurations && configs.map((config) => {
          const fullConfig = configurations.find((c) => c.component_name === config.component_name);
          if (!fullConfig) return null;

          const weightPercent = config.weight * 100;

          return (
            <Card key={config.component_name}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {getComponentLabel(config.component_name)}
                </CardTitle>
                <CardDescription>
                  {getComponentDescription(config.component_name)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Çəki</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={weightPercent.toFixed(0)}
                        onChange={(e) =>
                          handleWeightChange(
                            config.component_name,
                            Number(e.target.value)
                          )
                        }
                        className="w-20 text-right"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <Slider
                    value={[weightPercent]}
                    onValueChange={(value) =>
                      handleWeightChange(config.component_name, value[0])
                    }
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Hesablanan çəkili bal əmsalı:</span>
                  <span className="font-semibold">{config.weight.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Card */}
      <Card className={isValid ? 'border-green-200' : 'border-red-200'}>
        <CardHeader>
          <CardTitle className="text-lg">Ümumi Məlumat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Ümumi Çəki:</span>
              <span className={`text-2xl font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                {(totalWeight * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {isValid ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Konfiqurasiya düzgündür
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Ümumi çəki 100% olmalıdır
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={!isValid || !hasChanges || updateMutation.isPending}
          className="flex-1"
        >
          {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Dəyişiklikləri Yadda Saxla
        </Button>
        <Button variant="outline" onClick={() => setResetModalOpen(true)}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Default-a Qaytar
        </Button>
      </div>

      {/* Default Values Info */}
      <Alert>
        <AlertDescription>
          <p className="font-semibold mb-2">Default Dəyərlər:</p>
          <ul className="space-y-1 text-sm">
            <li>• Tapşırıq İcrası: 40%</li>
            <li>• Sorğu Cavabdehliyi: 30%</li>
            <li>• Sənəd Fəaliyyəti: 20%</li>
            <li>• Link İdarəetməsi: 10%</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Default Dəyərlərə Qaytar</DialogTitle>
            <DialogDescription>
              Bütün konfiqurasiya dəyərləri default vəziyyətə qaytarılacaq.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Səbəb *</Label>
              <Textarea
                id="reason"
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="Sıfırlama səbəbini daxil edin..."
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetModalOpen(false)}>
              İmtina
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={!resetReason.trim() || resetMutation.isPending}
            >
              {resetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Təsdiq Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
