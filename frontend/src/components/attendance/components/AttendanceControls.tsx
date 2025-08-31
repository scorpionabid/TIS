import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AttendanceControlsProps {
  classes?: any[];
  selectedClassId: number | null;
  onClassChange: (classId: number | null) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  viewMode: 'daily' | 'weekly';
  onViewModeChange: (mode: 'daily' | 'weekly') => void;
  institutions?: any[];
  selectedInstitutionId: number | null;
  onInstitutionChange: (institutionId: number | null) => void;
  institutionsLoading?: boolean;
}

export const AttendanceControls: React.FC<AttendanceControlsProps> = ({
  classes = [],
  selectedClassId,
  onClassChange,
  selectedDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  institutions = [],
  selectedInstitutionId,
  onInstitutionChange,
  institutionsLoading = false,
}) => {
  const { currentUser } = useAuth();
  
  // Helper functions for safe select values
  const getSafeSelectValue = (value: any): string => {
    if (!value) return '';
    const stringValue = String(value).trim();
    return stringValue === '' || stringValue === 'undefined' || stringValue === 'null' ? '' : stringValue;
  };

  const isValidSelectItem = (item: any): boolean => {
    return item && item.id && item.name && getSafeSelectValue(item.id) !== '';
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Institution Selection - hidden for SchoolAdmin */}
          {currentUser?.role !== 'schooladmin' && (
            <div className="space-y-2">
              <Label>Təşkilat seçin *</Label>
              <Select 
                value={selectedInstitutionId?.toString() || ''} 
                onValueChange={(value) => onInstitutionChange(value ? parseInt(value) : null)}
                disabled={institutionsLoading}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Təşkilat seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(institutions) && institutions
                    .filter(isValidSelectItem)
                    .map((institution) => {
                      const safeValue = getSafeSelectValue(institution.id);
                      return safeValue ? (
                        <SelectItem key={institution.id} value={safeValue}>
                          {institution.name}
                        </SelectItem>
                      ) : null;
                    })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Sinif seçin</Label>
            <Select 
              value={selectedClassId?.toString() || ''} 
              onValueChange={(value) => onClassChange(value ? parseInt(value) : null)}
              disabled={!selectedInstitutionId}
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