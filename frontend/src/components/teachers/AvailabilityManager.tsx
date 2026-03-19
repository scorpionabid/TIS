import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Save, RotateCcw, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { workloadService } from '@/services/workload';
import { gradeService } from '@/services/grades';

interface BreakConfig {
  smallBreakDuration: number;
  bigBreakDuration: number;
  bigBreakAfterLesson: number;
}

interface ShiftConfig {
  name: string;
  startTime: string;
  lessonCount: number;
  lessonDuration: number;
  breaks: BreakConfig;
  color: string;
  enabled: boolean; // Whether this shift is enabled/active
}

interface AvailabilityManagerProps {
  teacherId: number;
  externalShifts?: Record<string, ShiftConfig>;
  onShiftsChange?: (shifts: Record<string, ShiftConfig>) => void;
}

const DAYS = [
  { key: 'mon', label: 'Bazar ertəsi', shortLabel: 'B.E.' },
  { key: 'tue', label: 'Çərşənbə axşamı', shortLabel: 'Ç.A.' },
  { key: 'wed', label: 'Çərşənbə', shortLabel: 'Çər.' },
  { key: 'thu', label: 'Cümə axşamı', shortLabel: 'C.A.' },
  { key: 'fri', label: 'Cümə', shortLabel: 'Cüm.' },
  { key: 'sat', label: 'Şənbə', shortLabel: 'Şən.' },
  { key: 'sun', label: 'Bazar', shortLabel: 'Baz.' },
];

const DEFAULT_BREAKS: BreakConfig = {
  smallBreakDuration: 10,
  bigBreakDuration: 20,
  bigBreakAfterLesson: 2,
};

const DEFAULT_SHIFTS: Record<string, ShiftConfig> = {
  shift1: {
    name: 'I NÖVBƏ',
    startTime: '08:00',
    lessonCount: 6,
    lessonDuration: 45,
    breaks: { ...DEFAULT_BREAKS },
    color: 'blue',
    enabled: true, // Default active
  },
  shift2: {
    name: 'II NÖVBƏ',
    startTime: '14:00',
    lessonCount: 6,
    lessonDuration: 45,
    breaks: { ...DEFAULT_BREAKS },
    color: 'orange',
    enabled: false, // Default inactive
  },
};

const formatOrdinal = (n: number) => {
  switch (n) {
    case 1:
    case 2:
    case 5:
    case 7:
    case 8:
      return `${n}-ci`;
    case 3:
    case 4:
      return `${n}-cü`;
    case 6:
      return `${n}-cı`;
    default:
      return `${n}-ci`;
  }
};

export const AvailabilityManager: React.FC<AvailabilityManagerProps> = ({ 
  teacherId,
  externalShifts,
  onShiftsChange
}) => {
  const [internalShifts, setInternalShifts] = useState(DEFAULT_SHIFTS);
  const shifts = externalShifts || internalShifts;
  const setShifts = onShiftsChange || setInternalShifts;
  const [manualOverride, setManualOverride] = useState<Record<string, boolean>>({});
  
  // Fetch teaching loads to determine which shifts should be active
  const { data: workloadData } = useQuery({
    queryKey: ['teacher-workload', teacherId],
    queryFn: () => workloadService.getTeacherWorkload(teacherId),
    enabled: !!teacherId,
  });

  // Fetch grades to get shift information for each class
  const { data: gradesData } = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradeService.get({ per_page: 100 }),
    enabled: !!teacherId,
  });

  // Auto-activate shifts based on teaching loads
  useEffect(() => {
    if (!workloadData?.loads || !gradesData?.data) return;

    const loads = workloadData.loads;
    const grades = Array.isArray(gradesData.data) ? gradesData.data : 
                   gradesData.data?.grades || gradesData.data?.data || [];

    // Determine which shifts are needed based on assigned classes
    const neededShifts = new Set<string>();
    
    loads.forEach((load: any) => {
      const grade = grades.find((g: any) => g.id === load.class_id);
      if (grade?.teaching_shift) {
        // Map teaching_shift to shift key
        const shift = grade.teaching_shift;
        if (shift === '1' || shift === 'I' || shift === 'first' || shift === 'shift1') {
          neededShifts.add('shift1');
        } else if (shift === '2' || shift === 'II' || shift === 'second' || shift === 'shift2') {
          neededShifts.add('shift2');
        }
      } else {
        // If no shift specified, default to shift1
        neededShifts.add('shift1');
      }
    });

    // If no teaching loads, keep defaults (shift1 active, shift2 inactive)
    if (neededShifts.size === 0) {
      neededShifts.add('shift1');
    }

    // Only auto-activate if not manually overridden
    setShifts(prev => ({
      ...prev,
      shift1: {
        ...prev.shift1,
        enabled: manualOverride.shift1 !== undefined ? prev.shift1.enabled : neededShifts.has('shift1')
      },
      shift2: {
        ...prev.shift2,
        enabled: manualOverride.shift2 !== undefined ? prev.shift2.enabled : neededShifts.has('shift2')
      }
    }));
  }, [workloadData, gradesData, manualOverride]);

  // Toggle shift enabled state manually
  const toggleShiftEnabled = (shiftKey: string) => {
    setManualOverride(prev => ({ ...prev, [shiftKey]: true }));
    setShifts(prev => ({
      ...prev,
      [shiftKey]: {
        ...prev[shiftKey],
        enabled: !prev[shiftKey].enabled
      }
    }));
  };
  
  // Default: Monday-Friday active (green), Saturday-Sunday inactive
  const [activeDays, setActiveDays] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    DAYS.forEach((day, index) => {
      // Mon-Fri (0-4) active, Sat-Sun (5-6) inactive
      initial[day.key] = index < 5;
    });
    return initial;
  });
  
  const [availability, setAvailability] = useState<Record<string, boolean>>(() => {
    // Initialize all slots as available (green)
    const initial: Record<string, boolean> = {};
    DAYS.forEach(day => {
      for (let period = 1; period <= 9; period++) {
        initial[`${day.key}-shift1-${period}`] = true;
        initial[`${day.key}-shift2-${period}`] = true;
      }
    });
    return initial;
  });

  // Calculate lesson start times for a shift
  const calculateLessonTimes = (shift: ShiftConfig) => {
    const times: string[] = [];
    const [hours, minutes] = shift.startTime.split(':').map(Number);
    let currentMinutes = hours * 60 + minutes;
    
    for (let i = 0; i < shift.lessonCount; i++) {
      const startH = Math.floor(currentMinutes / 60);
      const startM = currentMinutes % 60;
      times.push(`${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`);
      
      currentMinutes += shift.lessonDuration;
      
      if (i < shift.lessonCount - 1) {
        if (i + 1 === shift.breaks.bigBreakAfterLesson) {
          currentMinutes += shift.breaks.bigBreakDuration;
        } else {
          currentMinutes += shift.breaks.smallBreakDuration;
        }
      }
    }
    return times;
  };

  // Calculate work time for a day based on first and last active lessons
  const calculateDailyWorkTime = (dayKey: string) => {
    let firstStart: string | null = null;
    let lastEnd: string | null = null;

    (Object.entries(shifts) as [string, ShiftConfig][]).forEach(([shiftKey, shift]) => {
      if (!shift.enabled) return;

      const times = calculateLessonTimes(shift);
      times.forEach((time, periodIndex) => {
        const slotKey = `${dayKey}-${shiftKey}-${periodIndex + 1}`;
        if (availability[slotKey] && activeDays[dayKey]) {
          if (!firstStart || time < firstStart) {
            firstStart = time;
          }
          // Calculate end time for this lesson
          const [h, m] = time.split(':').map(Number);
          const endMinutes = h * 60 + m + shift.lessonDuration;
          const endH = Math.floor(endMinutes / 60);
          const endM = endMinutes % 60;
          const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
          
          if (!lastEnd || endTime > lastEnd) {
            lastEnd = endTime;
          }
        }
      });
    });

    if (!firstStart || !lastEnd) return null;
    
    const [startH, startM] = firstStart.split(':').map(Number);
    const [endH, endM] = lastEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const totalMinutes = endMinutes - startMinutes;
    
    return {
      start: firstStart,
      end: lastEnd,
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      totalMinutes
    };
  };

  // Calculate total weekly work time
  const calculateWeeklyWorkTime = () => {
    let totalWorkMinutes = 0;
    let activeDaysCount = 0;

    DAYS.forEach(day => {
      const dailyTime = calculateDailyWorkTime(day.key);
      if (dailyTime) {
        totalWorkMinutes += dailyTime.totalMinutes;
        activeDaysCount++;
      }
    });

    return {
      totalHours: Math.floor(totalWorkMinutes / 60),
      totalMinutes: totalWorkMinutes % 60,
      activeDays: activeDaysCount,
      maxHours: 36 // Standard max work hours
    };
  };
  const calculateEndTime = (shift: ShiftConfig) => {
    const times = calculateLessonTimes(shift);
    if (times.length === 0) return shift.startTime;
    const lastStart = times[times.length - 1];
    const [h, m] = lastStart.split(':').map(Number);
    const endMinutes = h * 60 + m + shift.lessonDuration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  const toggleSlot = (day: string, shiftKey: string, period: number) => {
    const key = `${day}-${shiftKey}-${period}`;
    setAvailability(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleDay = (dayKey: string) => {
    setActiveDays(prev => ({
      ...prev,
      [dayKey]: !prev[dayKey],
    }));
  };

  const updateBreakConfig = (shiftKey: string, field: keyof BreakConfig, value: number) => {
    setShifts(prev => ({
      ...prev,
      [shiftKey]: {
        ...prev[shiftKey],
        breaks: {
          ...prev[shiftKey].breaks,
          [field]: value,
        },
      },
    }));
  };

  const updateShift = (shiftKey: string, field: keyof ShiftConfig, value: any) => {
    setShifts(prev => ({
      ...prev,
      [shiftKey]: {
        ...prev[shiftKey],
        [field]: value,
      },
    }));
  };

  const resetToDefault = () => {
    setShifts(DEFAULT_SHIFTS);
    
    // Reset active days to Mon-Fri
    const initialActive: Record<string, boolean> = {};
    DAYS.forEach((day, index) => {
      initialActive[day.key] = index < 5;
    });
    setActiveDays(initialActive);
    
    // Reset availability
    const initialAvail: Record<string, boolean> = {};
    DAYS.forEach(day => {
      for (let period = 1; period <= 9; period++) {
        initialAvail[`${day.key}-shift1-${period}`] = true;
        initialAvail[`${day.key}-shift2-${period}`] = true;
      }
    });
    setAvailability(initialAvail);
  };

  const saveAvailability = () => {
    alert('İş vaxtı məlumatları saxlanıldı!');
  };

  return (
    <div className="space-y-4">
      {/* Shift Enable/Disable Toggles */}
      <div className="flex gap-4 mb-4">
        {(Object.entries(shifts) as [string, ShiftConfig][]).map(([shiftKey, shift]) => (
          <div 
            key={shiftKey}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg border flex-1",
              shift.enabled 
                ? (shift.color === 'blue' 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-orange-50 border-orange-200')
                : 'bg-gray-50 border-gray-200 opacity-60'
            )}
          >
            <Clock className={cn(
              "h-5 w-5",
              shift.color === 'blue' ? 'text-blue-600' : 'text-orange-600'
            )} />
            <div className="flex-1">
              <div className={cn(
                "font-medium",
                shift.enabled ? '' : 'text-gray-500'
              )}>
                {shift.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {shift.enabled ? 'Aktiv' : 'Deaktiv'}
              </div>
            </div>
            <Switch
              checked={shift.enabled}
              onCheckedChange={() => toggleShiftEnabled(shiftKey)}
            />
          </div>
        ))}
      </div>

      {/* Shift Configuration with Sub-tabs */}
      <Tabs defaultValue="shift1" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="shift1" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            I NÖVBƏ
            {!shifts.shift1.enabled && <span className="text-xs text-gray-400">(Deaktiv)</span>}
          </TabsTrigger>
          <TabsTrigger value="shift2" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            II NÖVBƏ
            {!shifts.shift2.enabled && <span className="text-xs text-gray-400">(Deaktiv)</span>}
          </TabsTrigger>
        </TabsList>

        {(Object.entries(shifts) as [string, ShiftConfig][]).map(([shiftKey, shift]) => (
          <TabsContent key={shiftKey} value={shiftKey} className="space-y-4">
            <Card className={cn(
              "overflow-hidden border-l-4",
              shift.color === 'blue' ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-orange-500 bg-orange-50/30'
            )}>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Başlama saatı</label>
                    <Input
                      type="time"
                      value={shift.startTime}
                      onChange={(e) => updateShift(shiftKey, 'startTime', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Dərs saatı sayı</label>
                    <Select
                      value={shift.lessonCount.toString()}
                      onValueChange={(v) => updateShift(shiftKey, 'lessonCount', parseInt(v))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} dərs</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Dərs müddəti</label>
                    <Select
                      value={shift.lessonDuration.toString()}
                      onValueChange={(v) => updateShift(shiftKey, 'lessonDuration', parseInt(v))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="35">35 dəqiqə</SelectItem>
                        <SelectItem value="40">40 dəqiqə</SelectItem>
                        <SelectItem value="45">45 dəqiqə</SelectItem>
                        <SelectItem value="50">50 dəqiqə</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Kiçik fasilə</label>
                    <Select
                      value={shift.breaks.smallBreakDuration.toString()}
                      onValueChange={(v) => updateBreakConfig(shiftKey, 'smallBreakDuration', parseInt(v))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 dəqiqə</SelectItem>
                        <SelectItem value="10">10 dəqiqə</SelectItem>
                        <SelectItem value="15">15 dəqiqə</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Böyük fasilə</label>
                    <Select
                      value={shift.breaks.bigBreakDuration.toString()}
                      onValueChange={(v) => updateBreakConfig(shiftKey, 'bigBreakDuration', parseInt(v))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 dəqiqə</SelectItem>
                        <SelectItem value="20">20 dəqiqə</SelectItem>
                        <SelectItem value="25">25 dəqiqə</SelectItem>
                        <SelectItem value="30">30 dəqiqə</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Böyük fasilə hansı dərsdən sonra</label>
                    <Select
                      value={shift.breaks.bigBreakAfterLesson.toString()}
                      onValueChange={(v) => updateBreakConfig(shiftKey, 'bigBreakAfterLesson', parseInt(v))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                          <SelectItem key={n} value={n.toString()}>{formatOrdinal(n)} dərsdən sonra</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className={cn(
                  "p-2 rounded text-center text-sm font-medium",
                  shift.color === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                )}>
                  Bitmə saati: {calculateEndTime(shift)}
                  <div className="text-xs opacity-75 mt-1">
                    Hər dərs {shift.lessonDuration} dəq, böyük fasilə {formatOrdinal(shift.breaks.bigBreakAfterLesson)} dərsdən sonra ({shift.breaks.bigBreakDuration} dəq)
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Single Shift Availability Grid */}
            <Card>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse table-fixed">
                    <colgroup>
                      <col className="w-32" />
                      {[...Array(9)].map((_, i) => (
                        <col key={`col-${shiftKey}-${i}`} className="w-10" />
                      ))}
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="p-2 text-xs font-medium text-muted-foreground border-b">Gün</th>
                        {[...Array(9)].map((_, i) => (
                          <th
                            key={`header-${i}`}
                            className={cn(
                              "p-1 text-[10px] text-center border-b",
                              shift.color === 'blue' ? 'text-blue-700 bg-blue-50' : 'text-orange-700 bg-orange-50'
                            )}
                          >
                            {i + 1}
                          </th>
                        ))}
                      </tr>
                      <tr className="bg-gray-50/50">
                        <th className="p-1 text-[10px] text-muted-foreground border-b font-medium">Başlama</th>
                        {(() => {
                          const times = calculateLessonTimes(shift);
                          return (
                            <>
                              {times.map((time, i) => (
                                <th
                                  key={`${shiftKey}-time-${i}`}
                                  className={cn(
                                    "p-1 text-[9px] text-center font-medium border-b",
                                    shift.color === 'blue'
                                      ? 'text-blue-600 bg-blue-50/30'
                                      : 'text-orange-600 bg-orange-50/30'
                                  )}
                                >
                                  {time}
                                </th>
                              ))}
                              {[...Array(9 - times.length)].map((_, i) => (
                                <th key={`${shiftKey}-empty-${i}`} className="p-1 border-b bg-gray-100/50" />
                              ))}
                            </>
                          );
                        })()}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map((day) => (
                        <tr key={`${shiftKey}-${day.key}`} className="border-b last:border-b-0">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleDay(day.key)}
                                className={cn(
                                  "w-3 h-3 rounded-full transition-colors",
                                  activeDays[day.key] ? "bg-green-500" : "bg-gray-300"
                                )}
                                title={activeDays[day.key] ? "Deaktiv et" : "Aktiv et"}
                              />
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  activeDays[day.key] ? "" : "text-gray-400"
                                )}
                              >
                                {day.label}
                              </span>
                            </div>
                          </td>
                          {[...Array(9)].map((_, period) => {
                            const key = `${day.key}-${shiftKey}-${period + 1}`;
                            const isAvailable = availability[key];
                            const isWithinLessons = period < shift.lessonCount;
                            const isActiveDay = activeDays[day.key];
                            return (
                              <td key={key} className="p-1 text-center">
                                <button
                                  onClick={() =>
                                    isActiveDay && isWithinLessons &&
                                    toggleSlot(day.key, shiftKey, period + 1)
                                  }
                                  disabled={!isActiveDay || !isWithinLessons}
                                  className={cn(
                                    "w-8 h-8 rounded text-[10px] font-medium transition-colors",
                                    (!isActiveDay || !isWithinLessons) &&
                                      "bg-gray-100 text-gray-300 cursor-not-allowed",
                                    isActiveDay && isWithinLessons && isAvailable &&
                                      "bg-green-500 text-white hover:bg-green-600",
                                    isActiveDay && isWithinLessons && !isAvailable &&
                                      "bg-red-500 text-white hover:bg-red-600"
                                  )}
                                  title={
                                    isActiveDay && isWithinLessons
                                      ? (isAvailable ? 'Mövcuddur' : 'Mövcud deyil')
                                      : 'Deaktiv'
                                  }
                                >
                                  {period + 1}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={resetToDefault}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Sıfırla
        </Button>
        <Button
          size="sm"
          onClick={saveAvailability}
          className="gap-2 bg-primary"
        >
          <Save className="h-4 w-4" />
          Yadda Saxla
        </Button>
      </div>
    </div>
  );
};
