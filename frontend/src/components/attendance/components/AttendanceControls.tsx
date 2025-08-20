import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, BarChart3 } from 'lucide-react';

interface AttendanceControlsProps {
  classes?: any[];
  selectedClassId: number | null;
  onClassChange: (classId: number | null) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  viewMode: 'daily' | 'weekly';
  onViewModeChange: (mode: 'daily' | 'weekly') => void;
}

export const AttendanceControls: React.FC<AttendanceControlsProps> = ({
  classes = [],
  selectedClassId,
  onClassChange,
  selectedDate,
  onDateChange,
  viewMode,
  onViewModeChange,
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="space-y-2">
            <Label>Sinif seçin</Label>
            <Select 
              value={selectedClassId?.toString() || ''} 
              onValueChange={(value) => onClassChange(value ? parseInt(value) : null)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sinif seçin..." />
              </SelectTrigger>
              <SelectContent>
                {classes.filter(c => c.is_active).map(cls => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {`${cls.name} (${cls.current_enrollment || 0} şagird)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tarix seçin</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-48"
            />
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant={viewMode === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('daily')}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Günlük
            </Button>
            <Button
              variant={viewMode === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('weekly')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Həftəlik
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};