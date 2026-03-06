import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Calendar, 
  Settings as SettingsIcon, 
  AlertTriangle,
  CheckCircle,
  Coffee,
  Utensils
} from 'lucide-react';
import { GenerationSettings } from '../ScheduleBuilder';

interface ScheduleSettingsProps {
  settings: GenerationSettings;
  onNext: (settings: GenerationSettings) => void;
  onCancel?: () => void;
}

export const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({
  settings: initialSettings,
  onNext,
  onCancel
}) => {
  const [settings, setSettings] = useState<GenerationSettings>(initialSettings);
  const [errors, setErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'preferences'>('basic');

  const dayNames = [
    { value: 1, label: 'Bazar ertəsi' },
    { value: 2, label: 'Çərşənbə axşamı' },
    { value: 3, label: 'Çərşənbə' },
    { value: 4, label: 'Cümə axşamı' },
    { value: 5, label: 'Cümə' },
    { value: 6, label: 'Şənbə' },
    { value: 7, label: 'Bazar' }
  ];

  const validateSettings = (): string[] => {
    const validationErrors: string[] = [];

    if (settings.working_days.length === 0) {
      validationErrors.push('Ən azı bir iş günü seçilməlidir');
    }

    if (settings.daily_periods < 1 || settings.daily_periods > 12) {
      validationErrors.push('Günlük dərs sayı 1 və 12 arasında olmalıdır');
    }

    if (settings.period_duration < 30 || settings.period_duration > 120) {
      validationErrors.push('Dərs müddəti 30 və 120 dəqiqə arasında olmalıdır');
    }

    if (settings.break_duration < 5 || settings.break_duration > 30) {
      validationErrors.push('Fasilə müddəti 5 və 30 dəqiqə arasında olmalıdır');
    }

    if (settings.lunch_duration < 30 || settings.lunch_duration > 120) {
      validationErrors.push('Nahar fasiləsi 30 və 120 dəqiqə arasında olmalıdır');
    }

    settings.break_periods.forEach((period) => {
      if (period > settings.daily_periods) {
        validationErrors.push(`Fasilə dövrü (${period}) günlük dərs sayından (${settings.daily_periods}) böyük ola bilməz`);
      }
    });

    if (settings.lunch_break_period && settings.lunch_break_period > settings.daily_periods) {
      validationErrors.push(`Nahar fasiləsi dövrü (${settings.lunch_break_period}) günlük dərs sayından (${settings.daily_periods}) böyük ola bilməz`);
    }

    return validationErrors;
  };

  const handleSettingsChange = (key: keyof GenerationSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Real-time validation
    const validationErrors = validateSettings();
    setErrors(validationErrors);
  };

  const handleWorkingDayToggle = (day: number, checked: boolean) => {
    const newWorkingDays = checked
      ? [...settings.working_days, day].sort()
      : settings.working_days.filter(d => d !== day);
    
    handleSettingsChange('working_days', newWorkingDays);
  };

  const handleBreakPeriodToggle = (period: number, checked: boolean) => {
    const newBreakPeriods = checked
      ? [...settings.break_periods, period].sort()
      : settings.break_periods.filter(p => p !== period);
    
    handleSettingsChange('break_periods', newBreakPeriods);
  };

  const handlePreferenceChange = (key: string, value: any) => {
    const newPreferences = {
      ...settings.generation_preferences,
      [key]: value
    };
    handleSettingsChange('generation_preferences', newPreferences);
  };

  const handleNext = () => {
    const validationErrors = validateSettings();
    setErrors(validationErrors);
    
    if (validationErrors.length === 0) {
      onNext(settings);
    }
  };

  const calculateEndTime = () => {
    const [hours, minutes] = settings.first_period_start.split(':').map(Number);
    const totalMinutes = (settings.daily_periods * settings.period_duration) +
                        (settings.break_periods.length * settings.break_duration) +
                        (settings.lunch_break_period ? settings.lunch_duration : 0);
    
    const endMinutes = minutes + totalMinutes;
    const endHour = hours + Math.floor(endMinutes / 60);
    const finalMinutes = endMinutes % 60;
    
    return `${endHour.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
  };

  const renderBasicSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            İş Günləri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {dayNames.map((day) => (
              <div key={day.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`day-${day.value}`}
                  checked={settings.working_days.includes(day.value)}
                  onCheckedChange={(checked) => 
                    handleWorkingDayToggle(day.value, checked as boolean)
                  }
                />
                <Label htmlFor={`day-${day.value}`} className="text-sm">
                  {day.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dərs Tənzimləmələri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="daily_periods">Günlük dərs sayı</Label>
              <Input
                id="daily_periods"
                type="number"
                min="1"
                max="12"
                value={settings.daily_periods}
                onChange={(e) => handleSettingsChange('daily_periods', parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="period_duration">Dərs müddəti (dəqiqə)</Label>
              <Input
                id="period_duration"
                type="number"
                min="30"
                max="120"
                value={settings.period_duration}
                onChange={(e) => handleSettingsChange('period_duration', parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="first_period_start">İlk dərsin başlama vaxtı</Label>
              <Input
                id="first_period_start"
                type="time"
                value={settings.first_period_start}
                onChange={(e) => handleSettingsChange('first_period_start', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fasilə Tənzimləmələri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="break_duration">Fasilə müddəti (dəqiqə)</Label>
              <Input
                id="break_duration"
                type="number"
                min="5"
                max="30"
                value={settings.break_duration}
                onChange={(e) => handleSettingsChange('break_duration', parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="lunch_duration">Nahar fasiləsi (dəqiqə)</Label>
              <Input
                id="lunch_duration"
                type="number"
                min="30"
                max="120"
                value={settings.lunch_duration}
                onChange={(e) => handleSettingsChange('lunch_duration', parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label>Nahar fasiləsi dövrü</Label>
              <Select
                value={settings.lunch_break_period?.toString() || ''}
                onValueChange={(value) => 
                  handleSettingsChange('lunch_break_period', value ? parseInt(value) : null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Dövrü seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nahar fasiləsi yox</SelectItem>
                  {Array.from({ length: settings.daily_periods }, (_, i) => i + 1).map(period => (
                    <SelectItem key={period} value={period.toString()}>
                      {period}. dərsdən sonra
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderScheduleSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Coffee className="w-4 h-4" />
            Fasilə Dövrləri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
            {Array.from({ length: settings.daily_periods }, (_, i) => i + 1).map(period => (
              <div key={period} className="flex items-center space-x-2">
                <Checkbox
                  id={`break-${period}`}
                  checked={settings.break_periods.includes(period)}
                  onCheckedChange={(checked) => 
                    handleBreakPeriodToggle(period, checked as boolean)
                  }
                />
                <Label htmlFor={`break-${period}`} className="text-sm">
                  {period}. dərs
                </Label>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-gray-600">
            Seçilmiş dərslər bitdikdən sonra fasilə veriləcək
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Cədvəl Məlumatları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">İş günləri:</span>
              <div className="font-medium">{settings.working_days.length} gün</div>
            </div>
            <div>
              <span className="text-gray-600">Günlük dərs:</span>
              <div className="font-medium">{settings.daily_periods} dərs</div>
            </div>
            <div>
              <span className="text-gray-600">Başlama:</span>
              <div className="font-medium">{settings.first_period_start}</div>
            </div>
            <div>
              <span className="text-gray-600">Bitmə (təxmini):</span>
              <div className="font-medium">{calculateEndTime()}</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600 mb-2">Seçilmiş fasilələr:</div>
            <div className="flex gap-2 flex-wrap">
              {settings.break_periods.length > 0 ? (
                settings.break_periods.map(period => (
                  <Badge key={period} variant="outline">
                    {period}. dərsdən sonra ({settings.break_duration} dəq)
                  </Badge>
                ))
              ) : (
                <span className="text-gray-500 text-sm">Fasilə seçilməyib</span>
              )}
              
              {settings.lunch_break_period && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  <Utensils className="w-3 h-3 mr-1" />
                  {settings.lunch_break_period}. dərsdən sonra nahar ({settings.lunch_duration} dəq)
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cədvəl Yaratma Tərcihləri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="prioritize_teacher_preferences">
                Müəllim tərcihlərinə prioritet ver
              </Label>
              <p className="text-sm text-gray-600">
                Müəllimlerin vaxt tərcihləri daha çox nəzərə alınsın
              </p>
            </div>
            <Checkbox
              id="prioritize_teacher_preferences"
              checked={settings.generation_preferences?.prioritize_teacher_preferences || false}
              onCheckedChange={(checked) => 
                handlePreferenceChange('prioritize_teacher_preferences', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="minimize_gaps">
                Boşluqları minimize et
              </Label>
              <p className="text-sm text-gray-600">
                Müəllimlər üçün dərslər arasında boşluqları azalt
              </p>
            </div>
            <Checkbox
              id="minimize_gaps"
              checked={settings.generation_preferences?.minimize_gaps || false}
              onCheckedChange={(checked) => 
                handlePreferenceChange('minimize_gaps', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="balance_daily_load">
                Günlük yükü balanslaşdır
              </Label>
              <p className="text-sm text-gray-600">
                Hər gün dərsləri bərabər paylaşdırmağa çalış
              </p>
            </div>
            <Checkbox
              id="balance_daily_load"
              checked={settings.generation_preferences?.balance_daily_load || false}
              onCheckedChange={(checked) => 
                handlePreferenceChange('balance_daily_load', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="prefer_morning_core_subjects">
                Əsas fənləri səhərə yerləşdir
              </Label>
              <p className="text-sm text-gray-600">
                Riyaziyyat, dil kimi əsas fənlər səhər saatlarında olsun
              </p>
            </div>
            <Checkbox
              id="prefer_morning_core_subjects"
              checked={settings.generation_preferences?.prefer_morning_core_subjects || false}
              onCheckedChange={(checked) => 
                handlePreferenceChange('prefer_morning_core_subjects', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ardıcıl Dərs Tənzimləmələri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="max_consecutive_same_subject">
                Maksimum ardıcıl eyni fənn dərsi
              </Label>
              <Select
                value={settings.generation_preferences?.max_consecutive_same_subject?.toString() || '2'}
                onValueChange={(value) => 
                  handlePreferenceChange('max_consecutive_same_subject', parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} dərs
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="min_break_between_same_subject">
                Eyni fənn dərsləri arası minimum fasilə
              </Label>
              <Select
                value={settings.generation_preferences?.min_break_between_same_subject?.toString() || '1'}
                onValueChange={(value) => 
                  handlePreferenceChange('min_break_between_same_subject', parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num === 0 ? 'Fasilə lazım deyil' : `${num} dərs fasilə`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Konflikt Həlli</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="conflict_resolution_strategy">
                Konflikt həlli strategiyası
              </Label>
              <Select
                value={settings.generation_preferences?.conflict_resolution_strategy || 'balanced'}
                onValueChange={(value) => 
                  handlePreferenceChange('conflict_resolution_strategy', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher_priority">Müəllim prioriteti</SelectItem>
                  <SelectItem value="class_priority">Sinif prioriteti</SelectItem>
                  <SelectItem value="balanced">Balanslaşdırılmış</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 mt-2">
                Konflikt zamanı hansı tərəfə prioritet veriləcək
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Cədvəl Tənzimləmələri</h3>
        <p className="text-gray-600">
          Avtomatik cədvəl yaratmaq üçün əsas tənzimləmələri konfiqurasiya edin
        </p>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Tənzimləmələrdə xətalar:</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab as any}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Əsas</TabsTrigger>
          <TabsTrigger value="schedule">Cədvəl</TabsTrigger>
          <TabsTrigger value="preferences">Tərcihlər</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          {renderBasicSettings()}
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          {renderScheduleSettings()}
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          {renderPreferences()}
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onCancel}>
          Ləğv et
        </Button>
        <Button 
          onClick={handleNext}
          disabled={errors.length > 0}
          className={errors.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}
        >
          {errors.length > 0 ? (
            <>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Xətalar var
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Davam et
            </>
          )}
        </Button>
      </div>
    </div>
  );
};