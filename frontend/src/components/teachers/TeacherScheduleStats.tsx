import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, CheckCircle2, XCircle, Briefcase } from 'lucide-react';

interface TeacherScheduleStatsProps {
  teacherId: number;
}

// Default shift configuration (should match AvailabilityManager)
const DEFAULT_SHIFTS = {
  shift1: { name: 'I NÖVBƏ', lessonCount: 6, startTime: '08:00', color: 'blue' },
  shift2: { name: 'II NÖVBƏ', lessonCount: 6, startTime: '14:00', color: 'orange' },
};

const DAYS = [
  { key: 'monday', label: 'B.e' },
  { key: 'tuesday', label: 'Ç.a' },
  { key: 'wednesday', label: 'Ç' },
  { key: 'thursday', label: 'C.a' },
  { key: 'friday', label: 'C' },
  { key: 'saturday', label: 'Ş' },
  { key: 'sunday', label: 'B' },
];

export const TeacherScheduleStats: React.FC<TeacherScheduleStatsProps> = ({ teacherId }) => {
  // For now, use default values. In future, this can fetch from API
  const isLoading = false;
  
  // Calculate stats based on default availability (Mon-Fri active, all slots available)
  const activeDays = 5; // Monday-Friday
  const totalDays = 7;
  const shift1Lessons = DEFAULT_SHIFTS.shift1.lessonCount;
  const shift2Lessons = DEFAULT_SHIFTS.shift2.lessonCount;
  
  // Total available slots (active days × lessons per day)
  const totalSlotsPerDay = shift1Lessons + shift2Lessons;
  const totalAvailableSlots = activeDays * totalSlotsPerDay;
  const totalPossibleSlots = totalDays * totalSlotsPerDay;
  
  // Calculate hours (assuming 45 min per lesson)
  const lessonDuration = 45;
  const totalAvailableHours = Math.round((totalAvailableSlots * lessonDuration) / 60);
  const totalPossibleHours = Math.round((totalPossibleSlots * lessonDuration) / 60);
  
  const utilizationPercentage = Math.round((activeDays / totalDays) * 100);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

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
              <span className="text-xs text-muted-foreground">/ {totalPossibleHours} saat</span>
            </div>
            <Progress value={utilizationPercentage} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Doluluk: {utilizationPercentage}%</span>
              <Badge variant="outline" className="text-xs">{activeDays} gün aktiv</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts Info */}
      <div className="grid grid-cols-1 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">{DEFAULT_SHIFTS.shift1.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">{shift1Lessons} dərs</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Başlama: {DEFAULT_SHIFTS.shift1.startTime}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">{DEFAULT_SHIFTS.shift2.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">{shift2Lessons} dərs</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Başlama: {DEFAULT_SHIFTS.shift2.startTime}
            </div>
          </CardContent>
        </Card>
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
              <span className="font-semibold">{totalSlotsPerDay} dərs</span>
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
