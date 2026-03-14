import React from 'react';
import { cn } from '@/lib/utils';
import type { TeacherAvailability, DayOfWeek } from '@/services/teacherAvailability';

export type SlotStatus = 'available' | 'preferred' | 'unavailable' | 'none';

interface TeacherAvailabilityWeekGridProps {
  items: TeacherAvailability[];
  periodsPerDay?: number;
  dayOrder?: DayOfWeek[];
  onSlotClick?: (day: DayOfWeek, period: number, currentStatus: SlotStatus) => void;
  readOnly?: boolean;
}

const DEFAULT_DAY_ORDER: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

const DAY_LABEL: Record<DayOfWeek, string> = {
  monday: 'B.e',
  tuesday: 'Ç.a',
  wednesday: 'Ç',
  thursday: 'C.a',
  friday: 'C',
  saturday: 'Ş',
  sunday: 'B',
};

const STATUS_COLORS: Record<SlotStatus, string> = {
  available: 'bg-emerald-500 hover:bg-emerald-600',
  preferred: 'bg-blue-500 hover:bg-blue-600',
  unavailable: 'bg-rose-500 hover:bg-rose-600',
  none: 'bg-slate-100 hover:bg-slate-200',
};

const STATUS_ICONS: Record<SlotStatus, string> = {
  available: '✓',
  preferred: '★',
  unavailable: '✕',
  none: '',
};

const TIME_RANGES = [
  '08:00-08:45',
  '08:50-09:35',
  '09:40-10:25',
  '10:30-11:15',
  '11:20-12:05',
  '12:10-12:55',
  '13:00-13:45',
  '13:50-14:35',
];

export const TeacherAvailabilityWeekGrid: React.FC<TeacherAvailabilityWeekGridProps> = ({
  items,
  periodsPerDay = 8,
  dayOrder = DEFAULT_DAY_ORDER,
  onSlotClick,
  readOnly = false,
}) => {
  const periods = React.useMemo(() => 
    Array.from({ length: periodsPerDay }, (_, i) => i + 1),
    [periodsPerDay]
  );

  const itemsByDayAndPeriod = React.useMemo(() => {
    const map = new Map<string, TeacherAvailability[]>();
    
    items.forEach((item) => {
      const day = item.day_of_week;
      // Determine which periods this availability covers (rough approximation)
      const startHour = parseInt(item.start_time.split(':')[0]);
      const endHour = parseInt(item.end_time.split(':')[0]);
      
      for (let p = 1; p <= periodsPerDay; p++) {
        const periodStart = 8 + (p - 1); // Approximate hour
        if (periodStart >= startHour && periodStart < endHour) {
          const key = `${day}-${p}`;
          const existing = map.get(key) || [];
          existing.push(item);
          map.set(key, existing);
        }
      }
    });
    
    return map;
  }, [items, periodsPerDay]);

  const getSlotStatus = (day: DayOfWeek, period: number): SlotStatus => {
    const key = `${day}-${period}`;
    const matches = itemsByDayAndPeriod.get(key) || [];
    
    if (matches.length === 0) return 'none';
    
    const types = matches.map(m => m.availability_type);
    if (types.includes('unavailable')) return 'unavailable';
    if (types.includes('preferred')) return 'preferred';
    if (types.includes('available')) return 'available';
    return 'none';
  };

  const handleClick = (day: DayOfWeek, period: number) => {
    if (readOnly || !onSlotClick) return;
    const status = getSlotStatus(day, period);
    onSlotClick(day, period, status);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-6 gap-1 mb-2">
        <div className="text-xs text-muted-foreground text-center py-2">Saat</div>
        {dayOrder.map((d) => (
          <div key={d} className="text-xs font-medium text-center py-2 bg-slate-50 rounded">
            {DAY_LABEL[d]}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="space-y-1">
        {periods.map((period) => (
          <div key={period} className="grid grid-cols-6 gap-1">
            {/* Time label */}
            <div className="text-[10px] text-muted-foreground flex items-center justify-center">
              {period}-ci
              <br />
              {TIME_RANGES[period - 1] || ''}
            </div>
            
            {/* Day cells */}
            {dayOrder.map((day) => {
              const status = getSlotStatus(day, period);
              const clickable = !readOnly && onSlotClick;
              
              return (
                <button
                  key={`${day}-${period}`}
                  onClick={() => handleClick(day, period)}
                  disabled={!clickable}
                  className={cn(
                    'h-10 rounded-md flex items-center justify-center text-sm font-medium transition-all',
                    STATUS_COLORS[status],
                    status === 'none' ? 'text-slate-400' : 'text-white',
                    clickable && 'cursor-pointer active:scale-95',
                    !clickable && 'cursor-default'
                  )}
                  title={`${DAY_LABEL[day]} - ${period}-ci saat: ${status}`}
                >
                  {STATUS_ICONS[status]}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-emerald-500" />
          <span>Mövcud</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span>Üstünlük</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-rose-500" />
          <span>Qadağa</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-slate-100 border" />
          <span>Boş</span>
        </div>
      </div>
    </div>
  );
};
