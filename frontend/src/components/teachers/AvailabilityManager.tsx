import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RotateCcw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

interface AvailabilityManagerProps {
  teacherId: number;
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
  },
  shift2: {
    name: 'II NÖVBƏ',
    startTime: '14:00',
    lessonCount: 6,
    lessonDuration: 45,
    breaks: { ...DEFAULT_BREAKS },
    color: 'orange',
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

export const AvailabilityManager: React.FC<AvailabilityManagerProps> = ({ teacherId }) => {
  const [shifts, setShifts] = useState(DEFAULT_SHIFTS);
  
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

  // Calculate end time for a shift
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
    console.log('Saving availability:', { teacherId, shifts, activeDays, availability });
    alert('İş vaxtı məlumatları saxlanıldı!');
  };

  return (
    <div className="space-y-4">
      {/* Shift Configuration with Sub-tabs */}
      <Tabs defaultValue="shift1" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="shift1" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            I NÖVBƏ
          </TabsTrigger>
          <TabsTrigger value="shift2" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            II NÖVBƏ
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
