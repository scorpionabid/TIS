import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teacherAvailabilityService, DayOfWeek, SlotStatus } from '@/services/teacherAvailability';
import { academicYearService } from '@/services/academicYears';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  Star, 
  RotateCcw,
  Calendar,
  Clock,
  AlertCircle,
  Settings2
} from 'lucide-react';
import { useShiftConfig } from '@/hooks/useShiftConfig';
import { ShiftConfigurationPanel } from './ShiftConfigurationPanel';

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'monday', label: 'B.e' },
  { value: 'tuesday', label: 'Ç.a' },
  { value: 'wednesday', label: 'Ç' },
  { value: 'thursday', label: 'C.a' },
  { value: 'friday', label: 'C' },
];

// Enhanced 4-status system
const STATUS_COLORS: Record<SlotStatus, string> = {
  available: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm',
  preferred: 'bg-amber-400 text-amber-900 hover:bg-amber-500 shadow-sm ring-2 ring-amber-200',
  unavailable: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm',
  none: 'bg-slate-200 text-slate-400 hover:bg-slate-300 border border-slate-300',
};

const STATUS_LABELS: Record<SlotStatus, string> = {
  available: 'Olar',
  preferred: 'Üstünlük',
  unavailable: 'Olmaz',
  none: 'Təyin edilməyib',
};

const STATUS_ICONS: Record<SlotStatus, React.ReactNode> = {
  available: <CheckCircle2 className="h-3 w-3" />,
  preferred: <Star className="h-3 w-3" />,
  unavailable: <XCircle className="h-3 w-3" />,
  none: null,
};

interface SimpleAvailabilityGridProps {
  teacherId: number;
}

export const SimpleAvailabilityGrid: React.FC<SimpleAvailabilityGridProps> = ({ teacherId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [academicYearId, setAcademicYearId] = React.useState<number | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  
  const { config, setActiveShift, getShiftPeriods } = useShiftConfig();
  const { shift1, shift2 } = getShiftPeriods();

  // Convert periods to the format used by the grid
  const shift1Periods = shift1.map(p => ({ num: p.num, time: `${p.startTime}-${p.endTime}` }));
  const shift2Periods = shift2.map(p => ({ num: p.num, time: `${p.startTime}-${p.endTime}` }));
  const allPeriods = [...shift1Periods, ...shift2Periods];

  const { data: years, isLoading: yearsLoading } = useQuery({
    queryKey: ['academic-years', 'dropdown'],
    queryFn: () => academicYearService.getAllForDropdown(),
  });

  React.useEffect(() => {
    if (academicYearId) return;
    const active = years?.find((y) => y.is_active);
    if (active?.id) setAcademicYearId(active.id);
  }, [years, academicYearId]);

  const { data: itemsResponse, isLoading } = useQuery({
    queryKey: ['teacher-availabilities', teacherId, academicYearId],
    queryFn: () => teacherAvailabilityService.list({ teacher_id: teacherId, academic_year_id: academicYearId ?? undefined }),
    enabled: !!teacherId && !!academicYearId,
  });

  const items = itemsResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: { day: DayOfWeek; period: number; status: Exclude<SlotStatus, 'none'> }) => {
      const periodInfo = allPeriods.find(p => p.num === data.period);
      const [startTime, endTime] = periodInfo?.time.split('-') || ['08:00', '08:45'];
      
      return teacherAvailabilityService.create({
        teacher_id: teacherId,
        academic_year_id: academicYearId!,
        day_of_week: data.day,
        start_time: startTime,
        end_time: endTime,
        availability_type: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-availabilities', teacherId, academicYearId] });
      toast({ title: 'Yadda saxlandı' });
    },
    onError: () => {
      toast({ title: 'Xəta', variant: 'destructive' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => teacherAvailabilityService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-availabilities', teacherId, academicYearId] });
      toast({ title: 'Silindi' });
    },
  });

  const getSlotStatus = (day: DayOfWeek, period: number): SlotStatus => {
    const periodInfo = allPeriods.find(p => p.num === period);
    if (!periodInfo) return 'none';
    
    const [startHour] = periodInfo.time.split('-')[0].split(':').map(Number);
    const endHour = startHour + 1;

    const match = items.find(item => {
      const itemStart = parseInt(item.start_time.split(':')[0]);
      const itemEnd = parseInt(item.end_time.split(':')[0]);
      return item.day_of_week === day && itemStart <= startHour && itemEnd >= endHour;
    });

    // If no match found, default is 'none' (not set)
    if (!match) return 'none';
    return match.availability_type as SlotStatus;
  };

  const getSlotItemId = (day: DayOfWeek, period: number): number | null => {
    const periodInfo = allPeriods.find(p => p.num === period);
    if (!periodInfo) return null;
    
    const [startHour] = periodInfo.time.split('-')[0].split(':').map(Number);
    
    const match = items.find(item => {
      const itemStart = parseInt(item.start_time.split(':')[0]);
      return item.day_of_week === day && itemStart <= startHour && itemStart + 1 > startHour;
    });
    
    return match?.id || null;
  };

  const handleSlotClick = (day: DayOfWeek, period: number) => {
    const currentStatus = getSlotStatus(day, period);
    const existingId = getSlotItemId(day, period);
    
    // Cycle: none -> available -> preferred -> unavailable -> none
    let newStatus: SlotStatus;
    
    switch (currentStatus) {
      case 'none':
        newStatus = 'available';
        break;
      case 'available':
        newStatus = 'preferred';
        break;
      case 'preferred':
        newStatus = 'unavailable';
        break;
      case 'unavailable':
        newStatus = 'none';
        break;
      default:
        newStatus = 'available';
    }
    
    if (newStatus === 'none') {
      // Remove existing
      if (existingId) {
        removeMutation.mutate(existingId);
      }
    } else {
      // Create or update
      if (existingId && currentStatus !== 'none') {
        // Remove old and create new
        removeMutation.mutate(existingId, {
          onSuccess: () => {
            createMutation.mutate({ day, period, status: newStatus as Exclude<SlotStatus, 'none'> });
          }
        });
      } else {
        createMutation.mutate({ day, period, status: newStatus as Exclude<SlotStatus, 'none'> });
      }
    }
  };

  const handleClearAll = () => {
    if (confirm('Bütün mövcudluq təyinatlarını silmək istəyirsiniz?')) {
      Promise.all(items.map((item: any) => removeMutation.mutateAsync(item.id)))
        .then(() => {
          toast({ title: 'Bütün təyinatlar silindi' });
        });
    }
  };

  // Calculate stats
  const availableCount = items.filter((i: any) => i.availability_type === 'available').length;
  const preferredCount = items.filter((i: any) => i.availability_type === 'preferred').length;
  const unavailableCount = items.filter((i: any) => i.availability_type === 'unavailable').length;
  const filledCount = items.length;
  const totalSlots = allPeriods.length * 5; // periods × 5 days

  if (!academicYearId || yearsLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Mövcudluq</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Mövcudluq Grid-i
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                {availableCount} Olar
              </span>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">
                {preferredCount} Üstünlük
              </span>
              <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded">
                {unavailableCount} Olmaz
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Shift Selector */}
            <Select 
              value={config.activeShift} 
              onValueChange={(v) => setActiveShift(v as 'shift1' | 'shift2' | 'both')}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Növbə seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both" className="text-xs">Hər ikisi</SelectItem>
                <SelectItem value="shift1" className="text-xs">I NÖVBƏ</SelectItem>
                <SelectItem value="shift2" className="text-xs">II NÖVBƏ</SelectItem>
              </SelectContent>
            </Select>

            <Select value={academicYearId?.toString()} onValueChange={(v) => setAcademicYearId(parseInt(v))}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(years || []).map((y) => (
                  <SelectItem key={y.id} value={y.id.toString()} className="text-xs">
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Config Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowConfigPanel(true)}
              className="h-8 text-xs"
            >
              <Settings2 className="h-3 w-3 mr-1" />
              Saatlar
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearAll}
              className="h-8 text-xs text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Sıfırla
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-6">
            {/* I NOVBƏ - Morning Shift */}
            {(config.activeShift === 'both' || config.activeShift === 'shift1') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    I NÖVBƏ
                  </div>
                  <span className="text-xs text-muted-foreground">{config.shift1.startTime} - {config.shift1.endTime}</span>
                  <div className="flex-1" />
                  <span className="text-[10px] text-muted-foreground">
                    {shift1Periods.length} dərs saatı
                  </span>
                </div>
                
                {/* Grid Header */}
                <div className="grid grid-cols-6 gap-1">
                  <div className="text-xs text-muted-foreground text-center py-2">Saat</div>
                  {DAYS.map((d) => (
                    <div key={d.value} className="text-xs font-medium text-center py-2 bg-slate-50 rounded">
                      {d.label}
                    </div>
                  ))}
                </div>

                {/* Grid Body - Shift 1 */}
                <div className="space-y-1">
                  {shift1Periods.map((period) => (
                    <div key={period.num} className="grid grid-cols-6 gap-1">
                      <div className="text-[10px] text-muted-foreground flex items-center justify-center flex-col bg-slate-50 rounded py-1">
                        <span className="font-semibold">{period.num}</span>
                        <span className="text-[9px]">{period.time}</span>
                      </div>
                      {DAYS.map((day) => {
                        const status = getSlotStatus(day.value, period.num);
                        const isPending = createMutation.isPending || removeMutation.isPending;
                        
                        return (
                          <button
                            key={`shift1-${day.value}-${period.num}`}
                            onClick={() => handleSlotClick(day.value, period.num)}
                            disabled={isPending}
                            className={`h-12 rounded-md text-xs font-medium transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${STATUS_COLORS[status]}`}
                            title={`${day.label} - ${period.time}: ${STATUS_LABELS[status]}`}
                          >
                            {STATUS_ICONS[status]}
                            {status !== 'none' && <span className="text-[9px]">{STATUS_LABELS[status]}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* II NOVBƏ - Afternoon/Evening Shift */}
            {(config.activeShift === 'both' || config.activeShift === 'shift2') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    II NÖVBƏ
                  </div>
                  <span className="text-xs text-muted-foreground">{config.shift2.startTime} - {config.shift2.endTime}</span>
                  <div className="flex-1" />
                  <span className="text-[10px] text-muted-foreground">
                    {shift2Periods.length} dərs saatı
                  </span>
                </div>
                
                {/* Grid Header */}
                <div className="grid grid-cols-6 gap-1">
                  <div className="text-xs text-muted-foreground text-center py-2 font-medium">Saat</div>
                  {DAYS.map((d) => (
                    <div key={d.value} className="text-xs font-medium text-center py-2 bg-slate-50 rounded">
                      {d.label}
                    </div>
                  ))}
                </div>

                {/* Grid Body - Shift 2 */}
                <div className="space-y-1">
                  {shift2Periods.map((period) => (
                    <div key={period.num} className="grid grid-cols-6 gap-1">
                      <div className="text-[10px] text-muted-foreground flex items-center justify-center flex-col bg-slate-50 rounded py-1">
                        <span className="font-semibold">{period.num}</span>
                        <span className="text-[9px]">{period.time}</span>
                      </div>
                      {DAYS.map((day) => {
                        const status = getSlotStatus(day.value, period.num);
                        const isPending = createMutation.isPending || removeMutation.isPending;
                        
                        return (
                          <button
                            key={`shift2-${day.value}-${period.num}`}
                            onClick={() => handleSlotClick(day.value, period.num)}
                            disabled={isPending}
                            className={`h-12 rounded-md text-xs font-medium transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${STATUS_COLORS[status]}`}
                            title={`${day.label} - ${period.time}: ${STATUS_LABELS[status]}`}
                          >
                            {STATUS_ICONS[status]}
                            {status !== 'none' && <span className="text-[9px]">{STATUS_LABELS[status]}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs pt-4 border-t">
              <span className="text-muted-foreground font-medium">Statuslar:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                </div>
                <span>Olar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-400 flex items-center justify-center ring-2 ring-amber-200">
                  <Star className="h-2.5 w-2.5 text-amber-900" />
                </div>
                <span>Üstünlük</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-rose-500 flex items-center justify-center">
                  <XCircle className="h-2.5 w-2.5 text-white" />
                </div>
                <span>Olmaz</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-200 border border-slate-300" />
                <span className="text-muted-foreground">Təyin edilməyib</span>
              </div>
              <div className="flex-1" />
              <span className="text-muted-foreground">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                Klikləmə ilə dəyiş: Boş → Olar → Üstünlük → Olmaz → Boş
              </span>
            </div>

            {/* Progress */}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">Tamamlanma</span>
                <span className="font-semibold">{filledCount}/{totalSlots} slot ({Math.round((filledCount/totalSlots)*100)}%)</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(filledCount/totalSlots)*100}%` }}
                />
              </div>
            </div>
          </div>
        )}
        {/* Configuration Panel Modal */}
        <ShiftConfigurationPanel 
          isOpen={showConfigPanel} 
          onClose={() => setShowConfigPanel(false)} 
        />
      </CardContent>
    </Card>
  );
};
