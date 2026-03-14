import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherAvailabilityService, AvailabilityType, DayOfWeek } from '@/services/teacherAvailability';
import { useToast } from '@/hooks/use-toast';

interface TeacherAvailabilityModalProps {
  open: boolean;
  onClose: () => void;
  teacherId: number;
  academicYearId: number;
}

const DAY_OPTIONS: Array<{ value: DayOfWeek; label: string }> = [
  { value: 'monday', label: 'B.e' },
  { value: 'tuesday', label: 'Ç.a' },
  { value: 'wednesday', label: 'Ç' },
  { value: 'thursday', label: 'C.a' },
  { value: 'friday', label: 'C' },
  { value: 'saturday', label: 'Ş' },
  { value: 'sunday', label: 'B' },
];

const TYPE_OPTIONS: Array<{ value: AvailabilityType; label: string }> = [
  { value: 'available', label: 'Mövcud' },
  { value: 'preferred', label: 'Üstünlük' },
  { value: 'unavailable', label: 'Qadağa' },
  { value: 'restricted', label: 'Məhdud' },
  { value: 'meeting', label: 'Görüş' },
  { value: 'training', label: 'Təlim' },
  { value: 'preparation', label: 'Hazırlıq' },
  { value: 'examination', label: 'İmtahan' },
  { value: 'consultation', label: 'Konsultasiya' },
];

export const TeacherAvailabilityModal: React.FC<TeacherAvailabilityModalProps> = ({
  open,
  onClose,
  teacherId,
  academicYearId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [day, setDay] = React.useState<DayOfWeek>('monday');
  const [type, setType] = React.useState<AvailabilityType>('available');
  const [start, setStart] = React.useState('08:00');
  const [end, setEnd] = React.useState('15:30');
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setDay('monday');
    setType('available');
    setStart('08:00');
    setEnd('15:30');
    setReason('');
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () =>
      teacherAvailabilityService.create({
        teacher_id: teacherId,
        academic_year_id: academicYearId,
        day_of_week: day,
        availability_type: type,
        start_time: start,
        end_time: end,
        reason: reason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-availabilities', teacherId, academicYearId] });
      toast({ title: 'Yadda saxlandı', description: 'Mövcudluq əlavə edildi' });
      onClose();
    },
    onError: () => {
      toast({
        title: 'Xəta',
        description: 'Mövcudluq əlavə edilərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mövcudluq əlavə et</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Gün</Label>
            <Select value={day} onValueChange={(v) => setDay(v as DayOfWeek)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Tip</Label>
            <Select value={type} onValueChange={(v) => setType(v as AvailabilityType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Başlanğıc</Label>
              <Input value={start} onChange={(e) => setStart(e.target.value)} placeholder="08:00" />
            </div>
            <div className="grid gap-2">
              <Label>Bitmə</Label>
              <Input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="15:30" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Səbəb</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>
              Ləğv et
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              Yadda saxla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
