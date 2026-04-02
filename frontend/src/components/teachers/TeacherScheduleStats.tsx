import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, CheckCircle2, XCircle, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShiftConfig {
  name: string;
  startTime: string;
  lessonCount: number;
  enabled: boolean;
  color: string;
}

interface TeacherScheduleStatsProps {
  teacherId: number;
  shifts?: Record<string, ShiftConfig>;
}

// Default shift configuration (should match AvailabilityManager)
const DEFAULT_SHIFTS: Record<string, ShiftConfig> = {
  shift1: { name: 'I NÖVBƏ', startTime: '08:00', lessonCount: 6, enabled: true, color: 'blue' },
  shift2: { name: 'II NÖVBƏ', startTime: '14:00', lessonCount: 6, enabled: false, color: 'orange' },
};

const DAYS = [
  { key: 'mon', label: 'B.e' },
  { key: 'tue', label: 'Ç.a' },
  { key: 'wed', label: 'Ç' },
  { key: 'thu', label: 'C.a' },
  { key: 'fri', label: 'C' },
  { key: 'sat', label: 'Ş' },
  { key: 'sun', label: 'B' },
];

const TOTAL_DAYS = 7;

export const TeacherScheduleStats: React.FC<TeacherScheduleStatsProps> = ({ 
  teacherId, 
  shifts: providedShifts 
}) => {
  const shifts = providedShifts || DEFAULT_SHIFTS;
  // Default active days (Mon-Fri)
  const activeDays = 5;
  const totalDays = TOTAL_DAYS;
  
  // Calculate stats based on ACTIVE shifts only
  const activeShiftEntries = Object.entries(shifts).filter(([_, shift]) => shift.enabled);
  
  // Calculate total lessons from active shifts only
  const totalLessonsPerDay = activeShiftEntries.reduce((sum, [_, shift]) => sum + shift.lessonCount, 0);
  const totalAvailableSlots = activeDays * totalLessonsPerDay;
  
  // Calculate individual shift lessons
  const shift1Lessons = shifts.shift1?.enabled ? shifts.shift1.lessonCount : 0;
  const shift2Lessons = shifts.shift2?.enabled ? shifts.shift2.lessonCount : 0;
  
  // Calculate hours (assuming 45 min per lesson)
  const lessonDuration = 45;
  const totalAvailableHours = Math.round((totalAvailableSlots * lessonDuration) / 60);
  const maxWorkHours = 36;
  
  const utilizationPercentage = maxWorkHours > 0 
    ? Math.min(100, Math.round((totalAvailableHours / maxWorkHours) * 100))
    : 0;

  return (
    <div className="space-y-4">
      {/* Main Stats Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            İş Vaxtı Statistikası
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{totalAvailableHours}</span>
              <span className="text-xs text-muted-foreground">/ {maxWorkHours} saat</span>
            </div>
            <Progress value={utilizationPercentage} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Doluluk: {utilizationPercentage}%</span>
              <Badge variant="outline" className="text-xs">{activeDays} gün aktiv</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts Info - Show based on enabled status */}
      <div className="grid grid-cols-1 gap-3">
        {Object.entries(shifts).map(([shiftKey, shift]) => (
          <Card 
            key={shiftKey}
            className={cn(
              "border-l-4",
              shift.enabled 
                ? (shift.color === 'blue' ? 'border-l-blue-500' : 'border-l-orange-500')
                : 'border-l-gray-300 opacity-60'
            )}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className={cn(
                    "h-4 w-4",
                    shift.enabled 
                      ? (shift.color === 'blue' ? 'text-blue-500' : 'text-orange-500')
                      : 'text-gray-400'
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    !shift.enabled && 'text-gray-500'
                  )}>
                    {shift.name}
                  </span>
                  {!shift.enabled && <span className="text-xs text-gray-400">(Deaktiv)</span>}
                </div>
                <Badge 
                  variant={shift.enabled ? "secondary" : "outline"} 
                  className={cn("text-xs", !shift.enabled && "text-gray-400")}
                >
                  {shift.enabled ? shift.lessonCount : 0} dərs
                </Badge>
              </div>
              <div className={cn(
                "text-xs mt-1",
                shift.enabled ? 'text-muted-foreground' : 'text-gray-400'
              )}>
                {shift.enabled ? `Başlama: ${shift.startTime}` : 'Növbə deaktivdir'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Days Summary */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Günlər
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Aktiv günlər</span>
              </div>
              <span className="font-semibold">{activeDays}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-400" />
                <span className="text-muted-foreground">Passiv günlər</span>
              </div>
              <span className="font-semibold text-muted-foreground">{totalDays - activeDays}</span>
            </div>
          </div>
          
          {/* Day indicators */}
          <div className="flex flex-wrap gap-1 mt-3">
            {DAYS.map((day, index) => (
              <div
                key={day.key}
                className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                  index < activeDays
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
                title={day.label}
              >
                {day.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Slots Summary */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Dərs Slotları
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Həftəlik slot:</span>
              <span className="font-semibold">{totalAvailableSlots}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gündəlik:</span>
              <span className="font-semibold">{totalLessonsPerDay} dərs</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t">
              <span>I NÖVBƏ:</span>
              <span>{shift1Lessons} dərs</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>II NÖVBƏ:</span>
              <span>{shift2Lessons} dərs</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
