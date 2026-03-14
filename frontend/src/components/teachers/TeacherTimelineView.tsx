import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Info } from 'lucide-react';

interface TeacherTimelineViewProps {
  teacherId: number;
}

// Mock data for demonstration - will be replaced with real data fetching
const DAYS = [
  { value: 'monday', label: 'B.E.', full: 'Bazar ertəsi' },
  { value: 'tuesday', label: 'Ç.A.', full: 'Çərşənbə axşamı' },
  { value: 'wednesday', label: 'Ç.', full: 'Çərşənbə' },
  { value: 'thursday', label: 'C.A.', full: 'Cümə axşamı' },
  { value: 'friday', label: 'C.', full: 'Cümə' },
  { value: 'saturday', label: 'Ş.', full: 'Şənbə' },
];

const PERIODS = [
  { num: 1, time: '08:00-08:45' },
  { num: 2, time: '08:50-09:35' },
  { num: 3, time: '09:40-10:25' },
  { num: 4, time: '10:30-11:15' },
  { num: 5, time: '11:20-12:05' },
  { num: 6, time: '12:10-12:55' },
  { num: 7, time: '13:00-13:45' },
  { num: 8, time: '13:50-14:35' },
  { num: 9, time: '14:40-15:25' },
  { num: 10, time: '15:30-16:15' },
  { num: 11, time: '16:20-17:05' },
  { num: 12, time: '17:10-17:55' },
];

// Subject colors for visual distinction
const SUBJECT_COLORS: Record<string, string> = {
  'Riyaziyyat': 'bg-blue-100 text-blue-800 border-blue-200',
  'Fizika': 'bg-purple-100 text-purple-800 border-purple-200',
  'Kimya': 'bg-green-100 text-green-800 border-green-200',
  'Biologiya': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Azərbaycan dili': 'bg-amber-100 text-amber-800 border-amber-200',
  'Ədəbiyyat': 'bg-pink-100 text-pink-800 border-pink-200',
  'Tarix': 'bg-orange-100 text-orange-800 border-orange-200',
  'Coğrafiya': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'İngilis dili': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Rus dili': 'bg-rose-100 text-rose-800 border-rose-200',
};

export const TeacherTimelineView: React.FC<TeacherTimelineViewProps> = ({ teacherId }) => {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate loading - will be replaced with real data fetching
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [teacherId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Həftəlik Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Mock schedule data - will be replaced with real data
  const schedule: Record<string, Record<number, { class: string; subject: string }>> = {
    monday: {
      1: { class: '9A', subject: 'Riyaziyyat' },
      3: { class: '10B', subject: 'Fizika' },
      5: { class: '9A', subject: 'Riyaziyyat' },
    },
    tuesday: {
      2: { class: '10A', subject: 'Kimya' },
      4: { class: '9B', subject: 'Azərbaycan dili' },
    },
    wednesday: {
      1: { class: '11A', subject: 'Biologiya' },
      6: { class: '9C', subject: 'Riyaziyyat' },
    },
  };

  const getSlotContent = (day: string, period: number) => {
    const slot = schedule[day]?.[period];
    if (!slot) return null;
    
    const colorClass = SUBJECT_COLORS[slot.subject] || 'bg-gray-100 text-gray-800 border-gray-200';
    
    return (
      <div className={`p-2 rounded border text-xs ${colorClass} h-full flex flex-col justify-center min-h-[60px]`}>
        <div className="font-semibold">{slot.class}</div>
        <div className="text-[10px] opacity-90">{slot.subject}</div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Həftəlik Timeline Görünüşü
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Info className="h-3 w-3 mr-1" />
            Demo versiya
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[800px] p-4">
            {/* Header Row */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              <div className="text-xs font-medium text-muted-foreground p-2 flex items-center justify-center">
                <Clock className="h-3 w-3 mr-1" />
                Saat
              </div>
              {DAYS.map((day) => (
                <div 
                  key={day.value} 
                  className="text-xs font-semibold text-center p-2 bg-slate-50 rounded"
                >
                  <div>{day.label}</div>
                  <div className="text-[10px] text-muted-foreground font-normal">{day.full}</div>
                </div>
              ))}
            </div>

            {/* Period Rows */}
            <div className="space-y-1">
              {PERIODS.map((period) => (
                <div key={period.num} className="grid grid-cols-7 gap-2">
                  {/* Time Column */}
                  <div className="text-[10px] text-muted-foreground p-2 flex flex-col items-center justify-center bg-slate-50 rounded">
                    <span className="font-medium">{period.num}</span>
                    <span className="text-[9px]">{period.time}</span>
                  </div>
                  
                  {/* Day Columns */}
                  {DAYS.map((day) => (
                    <div 
                      key={`${day.value}-${period.num}`} 
                      className="min-h-[60px] p-1"
                    >
                      {getSlotContent(day.value, period.num) || (
                        <div className="h-full min-h-[60px] border border-dashed border-slate-200 rounded bg-slate-50/50 hover:bg-slate-100 transition-colors cursor-pointer" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-3 text-xs">
              <span className="text-muted-foreground">Fənnlər:</span>
              {Object.entries(SUBJECT_COLORS).slice(0, 6).map(([subject, colorClass]) => (
                <div key={subject} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded ${colorClass.split(' ')[0]}`} />
                  <span>{subject}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
