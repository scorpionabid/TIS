import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, BookOpen, MapPin, Download, Filter } from 'lucide-react';
import { scheduleService } from '@/services/schedule';
import { useAuth } from '@/contexts/AuthContext';
import { ScheduleGrid } from '@/components/schedules/ScheduleGrid';
import { ScheduleListView } from '@/components/schedules/components/ScheduleListView';
import { Badge } from '@/components/ui/badge';

interface TeacherScheduleProps {}

export default function TeacherSchedule({}: TeacherScheduleProps) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());

  const { data: scheduleData, isLoading, error } = useQuery({
    queryKey: ['teacher-schedule', user?.id, selectedWeek],
    queryFn: async () => {
      if (!user?.id) return [];
      return scheduleService.getTeacherSchedule(user.id);
    },
    enabled: !!user?.id,
  });

  const scheduleSlots = scheduleData?.data || [];

  // Group slots by day of week
  const groupedSchedule = React.useMemo(() => {
    const groups = {
      1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] // Monday to Sunday
    } as Record<number, any[]>;

    scheduleSlots.forEach(slot => {
      if (groups[slot.day_of_week]) {
        groups[slot.day_of_week].push(slot);
      }
    });

    // Sort each day's slots by start time
    Object.keys(groups).forEach(day => {
      groups[Number(day)].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return groups;
  }, [scheduleSlots]);

  const weekDays = [
    { key: 1, name: 'Bazar ertəsi', short: 'B.e' },
    { key: 2, name: 'Çərşənbə axşamı', short: 'Ç.a' },
    { key: 3, name: 'Çərşənbə', short: 'Ç' },
    { key: 4, name: 'Cümə axşamı', short: 'C.a' },
    { key: 5, name: 'Cümə', short: 'C' },
    { key: 6, name: 'Şənbə', short: 'Ş' },
  ];

  const getCurrentWeekStats = () => {
    const totalHours = scheduleSlots.length;
    const uniqueClasses = new Set(scheduleSlots.map(slot => slot.class_id)).size;
    const uniqueSubjects = new Set(scheduleSlots.map(slot => slot.subject_id)).size;
    
    return { totalHours, uniqueClasses, uniqueSubjects };
  };

  const stats = getCurrentWeekStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          Cədvəl yüklənərkən xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mənim Dərs Cədvəlim</h1>
          <p className="text-gray-600">Şəxsi dərs cədvəlinizi görüntüləyin</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={viewMode} onValueChange={(value: 'grid' | 'list') => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Cədvəl</SelectItem>
              <SelectItem value="list">Siyahı</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            İxrac et
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Həftəlik saatlar</p>
                <p className="text-2xl font-bold">{stats.totalHours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Siniflər</p>
                <p className="text-2xl font-bold">{stats.uniqueClasses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Fənlər</p>
                <p className="text-2xl font-bold">{stats.uniqueSubjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Həftəlik Cədvəl
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={getCurrentWeek()}>Bu həftə</SelectItem>
                  <SelectItem value={getNextWeek()}>Gələn həftə</SelectItem>
                  <SelectItem value={getPreviousWeek()}>Keçən həftə</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {scheduleSlots.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Cədvəl tapılmadı</h3>
              <p className="text-gray-600">Bu həftə üçün heç bir dərs təyin olunmayıb.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <ScheduleGrid 
              schedule={groupedSchedule}
              timeSlots={getDefaultTimeSlots()}
              weekDays={weekDays}
              readonly={true}
            />
          ) : (
            <ScheduleListView 
              schedule={scheduleSlots}
              groupBy="day"
              showActions={false}
            />
          )}
        </CardContent>
      </Card>

      {/* Today's Schedule - if current day */}
      {isToday(selectedWeek) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Bugünkü dərslər
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TodaySchedule schedule={groupedSchedule[getCurrentDayOfWeek()]} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Today's schedule component
function TodaySchedule({ schedule }: { schedule: any[] }) {
  if (!schedule || schedule.length === 0) {
    return (
      <p className="text-gray-600 text-center py-4">Bu gün heç bir dərsiniz yoxdur.</p>
    );
  }

  return (
    <div className="space-y-3">
      {schedule.map((slot, index) => (
        <div key={slot.id || index} className="flex items-center gap-4 p-3 border rounded-lg">
          <div className="text-sm text-gray-600 min-w-20">
            {slot.start_time} - {slot.end_time}
          </div>
          
          <div className="flex-1">
            <div className="font-medium">{slot.subject?.name}</div>
            <div className="text-sm text-gray-600 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {slot.class?.name}
              </span>
              {slot.room && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {slot.room.name}
                </span>
              )}
            </div>
          </div>
          
          <Badge variant="outline">{slot.session_type || 'regular'}</Badge>
        </div>
      ))}
    </div>
  );
}

// Helper functions
function getCurrentWeek(): string {
  const now = new Date();
  const year = now.getFullYear();
  const week = getWeekNumber(now);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getNextWeek(): string {
  const now = new Date();
  now.setDate(now.getDate() + 7);
  const year = now.getFullYear();
  const week = getWeekNumber(now);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getPreviousWeek(): string {
  const now = new Date();
  now.setDate(now.getDate() - 7);
  const year = now.getFullYear();
  const week = getWeekNumber(now);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function getCurrentDayOfWeek(): number {
  return new Date().getDay() || 7; // Sunday = 7, Monday = 1
}

function isToday(weekString: string): boolean {
  return weekString === getCurrentWeek();
}

function getDefaultTimeSlots() {
  return [
    { id: '1', start_time: '08:00', end_time: '08:45', name: '1-ci dərs' },
    { id: '2', start_time: '08:55', end_time: '09:40', name: '2-ci dərs' },
    { id: '3', start_time: '10:00', end_time: '10:45', name: '3-cü dərs' },
    { id: '4', start_time: '10:55', end_time: '11:40', name: '4-cü dərs' },
    { id: '5', start_time: '11:50', end_time: '12:35', name: '5-ci dərs' },
    { id: '6', start_time: '13:30', end_time: '14:15', name: '6-cı dərs' },
    { id: '7', start_time: '14:25', end_time: '15:10', name: '7-ci dərs' },
    { id: '8', start_time: '15:20', end_time: '16:05', name: '8-ci dərs' },
  ];
}