import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceStatus } from '../hooks/useAttendanceStatus';

interface BulkActionsProps {
  bulkStatus: string;
  onBulkStatusChange: (status: string) => void;
  onBulkApply: () => void;
  onSave: () => void;
  isRecordingAttendance: boolean;
  hasStudents: boolean;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  bulkStatus,
  onBulkStatusChange,
  onBulkApply,
  onSave,
  isRecordingAttendance,
  hasStudents,
}) => {
  const { getStatusText } = useAttendanceStatus();

  const handleBulkApply = () => {
    if (!bulkStatus) {
      toast.error('Zəhmət olmasa status seçin');
      return;
    }
    onBulkApply();
    toast.success(`Bütün şagirdlər üçün "${getStatusText(bulkStatus)}" statusu tətbiq edildi`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium whitespace-nowrap">Toplu əməliyyat:</span>
          <Select value={bulkStatus} onValueChange={onBulkStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="present">Var</SelectItem>
              <SelectItem value="absent">Yox</SelectItem>
              <SelectItem value="late">Gecikmə</SelectItem>
              <SelectItem value="excused">İzinli</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleBulkApply}
            disabled={!bulkStatus || !hasStudents}
          >
            Tətbiq et
          </Button>
        </div>
      </div>
      
      <Button 
        onClick={onSave}
        disabled={isRecordingAttendance || !hasStudents}
        className="self-end"
      >
        <Save className="h-4 w-4 mr-2" />
        {isRecordingAttendance ? 'Yadda saxlanılır...' : 'Yadda saxla'}
      </Button>
    </div>
  );
};