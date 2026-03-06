import React from 'react';
import { Calendar, Save, X, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateScheduleData, ScheduleConflict } from '@/services/schedule';

interface ScheduleControlsProps {
  scheduleData: CreateScheduleData;
  conflicts: ScheduleConflict[];
  isSaving: boolean;
  scheduleId?: number;
  onScheduleDataChange: (data: CreateScheduleData) => void;
  onSave: () => void;
  onCancel?: () => void;
}

export const ScheduleControls: React.FC<ScheduleControlsProps> = ({
  scheduleData,
  conflicts,
  isSaving,
  scheduleId,
  onScheduleDataChange,
  onSave,
  onCancel
}) => {
  const handleFieldChange = (field: keyof CreateScheduleData, value: any) => {
    onScheduleDataChange({
      ...scheduleData,
      [field]: value
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {scheduleId ? 'Dərs Cədvəlini Redaktə Et' : 'Yeni Dərs Cədvəli'}
            </CardTitle>
            <CardDescription>
              Interactive dərs cədvəli yaradın və ya redaktə edin
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {conflicts.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {conflicts.length} konflikt
              </Badge>
            )}
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Ləğv et
              </Button>
            )}
            <Button onClick={onSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saxlanır...' : 'Saxla'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="name">Cədvəl Adı</Label>
            <Input
              id="name"
              value={scheduleData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Məs: Payız 2024 Dərs Cədvəli"
            />
          </div>
          <div>
            <Label htmlFor="type">Cədvəl Növü</Label>
            <Select
              value={scheduleData.type}
              onValueChange={(value: 'weekly' | 'daily' | 'custom') => 
                handleFieldChange('type', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Həftəlik</SelectItem>
                <SelectItem value="daily">Günlük</SelectItem>
                <SelectItem value="custom">Xüsusi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="start_date">Başlama Tarixi</Label>
            <Input
              id="start_date"
              type="date"
              value={scheduleData.start_date}
              onChange={(e) => handleFieldChange('start_date', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};