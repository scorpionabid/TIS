import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { teacherAvailabilityService } from '@/services/teacherAvailability';
import { academicYearService } from '@/services/academicYears';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

interface TeacherAvailabilityStatsProps {
  teacherId: number;
}

export const TeacherAvailabilityStats: React.FC<TeacherAvailabilityStatsProps> = ({ teacherId }) => {
  // Get current academic year
  const { data: yearsResponse, isLoading: yearsLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => academicYearService.getAll(),
  });

  const years = yearsResponse?.data || [];
  const currentYear = years.find((y: any) => y.is_current) || years[0];
  const academicYearId = currentYear?.id;

  const { data: availabilities, isLoading } = useQuery({
    queryKey: ['teacher-availabilities', teacherId, academicYearId],
    queryFn: () => teacherAvailabilityService.list({ teacher_id: teacherId, academic_year_id: academicYearId }),
    enabled: !!teacherId && !!academicYearId,
  });

  const items = availabilities?.data || [];

  // Calculate stats
  const totalSlots = 60; // 5 days × 12 periods
  const availableSlots = items.filter((i: any) => i.availability_type === 'available' || i.availability_type === 'preferred').length;
  const unavailableSlots = items.filter((i: any) => i.availability_type === 'unavailable').length;
  const preferredSlots = items.filter((i: any) => i.availability_type === 'preferred').length;
  
  const availabilityPercentage = Math.round((availableSlots / totalSlots) * 100);
  const filledSlots = availableSlots + unavailableSlots;
  const completionPercentage = Math.round((filledSlots / totalSlots) * 100);

  if (isLoading || yearsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Availability Card */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-500" />
            Mövcudluq Statistikası
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{availableSlots}</span>
              <span className="text-xs text-muted-foreground">/ {totalSlots} slot</span>
            </div>
            <Progress value={availabilityPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {availabilityPercentage}% mövcuddur
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-l-2 border-l-emerald-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Olar</span>
            </div>
            <p className="text-xl font-bold mt-1">{availableSlots - preferredSlots}</p>
          </CardContent>
        </Card>
        <Card className="border-l-2 border-l-rose-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-rose-500" />
              <span className="text-xs text-muted-foreground">Olmaz</span>
            </div>
            <p className="text-xl font-bold mt-1">{unavailableSlots}</p>
          </CardContent>
        </Card>
      </div>

      {/* Preference Stats */}
      <Card className="border-l-2 border-l-amber-500">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Üstünlük Verilir</span>
          </div>
          <p className="text-xl font-bold mt-1">{preferredSlots}</p>
        </CardContent>
      </Card>

      {/* Completion Status */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tamamlanma
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {completionPercentage === 0 ? (
            <p className="text-sm text-muted-foreground">Mövcudluq təyin edilməyib</p>
          ) : completionPercentage < 50 ? (
            <p className="text-sm text-amber-600">⚠️ Davam edir ({completionPercentage}%)</p>
          ) : completionPercentage < 100 ? (
            <p className="text-sm text-blue-600">⏳ Əksəriyyət tamamlandı ({completionPercentage}%)</p>
          ) : (
            <p className="text-sm text-green-600">✅ Tamamlandı (100%)</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
