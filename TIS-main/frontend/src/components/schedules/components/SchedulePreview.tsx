import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Download,
  Filter,
  Grid3X3,
  List
} from 'lucide-react';
import { Schedule, TimeSlot } from '../ScheduleBuilder';

interface SchedulePreviewProps {
  schedule: Schedule;
  timeSlots: TimeSlot[];
}

interface ScheduleSession {
  id: number;
  period_number: number;
  day_of_week: number;
  teacher: {
    id: number;
    name: string;
  };
  subject: {
    id: number;
    name: string;
    code: string;
  };
  class: {
    id: number;
    name: string;
  };
  room?: {
    id: number;
    name: string;
  };
  start_time: string;
  end_time: string;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'teacher' | 'class' | 'subject';

export const SchedulePreview: React.FC<SchedulePreviewProps> = ({
  schedule,
  timeSlots
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedWeek, setSelectedWeek] = useState(0);

  // Mock data - in real implementation, this would come from schedule.sessions
  const sessions: ScheduleSession[] = useMemo(() => {
    // Generate some mock sessions for preview
    const mockSessions: ScheduleSession[] = [];
    for (let day = 1; day <= 5; day++) {
      for (let period = 1; period <= 7; period++) {
        if (Math.random() > 0.3) { // 70% chance of having a session
          mockSessions.push({
            id: day * 100 + period,
            day_of_week: day,
            period_number: period,
            teacher: {
              id: Math.floor(Math.random() * 10) + 1,
              name: `Müəllim ${Math.floor(Math.random() * 10) + 1}`
            },
            subject: {
              id: Math.floor(Math.random() * 8) + 1,
              name: ['Riyaziyyat', 'Azərbaycan dili', 'İngilis dili', 'Tarix', 'Coğrafiya', 'Biologiya', 'Fizika', 'Kimya'][Math.floor(Math.random() * 8)],
              code: ['RZ', 'AD', 'ID', 'TR', 'CG', 'BL', 'FZ', 'KM'][Math.floor(Math.random() * 8)]
            },
            class: {
              id: Math.floor(Math.random() * 12) + 1,
              name: `${Math.floor(Math.random() * 4) + 9}-${['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]}`
            },
            room: Math.random() > 0.5 ? {
              id: Math.floor(Math.random() * 20) + 1,
              name: `${Math.floor(Math.random() * 3) + 1}0${Math.floor(Math.random() * 9) + 1}`
            } : undefined,
            start_time: `0${8 + Math.floor(period/2)}:${period % 2 === 1 ? '00' : '45'}`,
            end_time: `0${8 + Math.floor((period+1)/2)}:${(period+1) % 2 === 1 ? '00' : '45'}`
          });
        }
      }
    }
    return mockSessions;
  }, []);

  const dayNames = ['Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə'];
  const dayAbbrev = ['B.E', 'Ç.A', 'Çər', 'C.A', 'Cümə'];

  const getSessionsForDay = (day: number) => {
    return sessions.filter(session => session.day_of_week === day);
  };

  const getSessionsForPeriod = (day: number, period: number) => {
    return sessions.find(session => 
      session.day_of_week === day && session.period_number === period
    );
  };

  const renderGridView = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          <div className="p-2 font-medium text-center text-gray-600 text-sm">
            Dərs / Gün
          </div>
          {dayAbbrev.map((day, index) => (
            <div key={index} className="p-2 font-medium text-center bg-gray-50 rounded-lg text-sm">
              {day}
            </div>
          ))}
        </div>

        {/* Time slots and sessions */}
        <div className="space-y-2">
          {timeSlots.filter(slot => !slot.is_break).map((slot) => (
            <div key={slot.period_number} className="grid grid-cols-6 gap-2">
              {/* Time slot info */}
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <div className="text-xs text-blue-600 font-medium">
                  {slot.period_number}-ci dərs
                </div>
                <div className="text-xs text-blue-500">
                  {slot.start_time} - {slot.end_time}
                </div>
              </div>

              {/* Sessions for each day */}
              {[1, 2, 3, 4, 5].map((day) => {
                const session = getSessionsForPeriod(day, slot.period_number);
                return (
                  <div key={day} className="min-h-[60px] rounded-lg border border-gray-200">
                    {session ? (
                      <div className="p-2 h-full bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {session.subject.name}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {session.teacher.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {session.class.name}
                          {session.room && ` • ${session.room.name}`}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 h-full flex items-center justify-center text-gray-400 text-xs">
                        Boş
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="space-y-4">
      {dayNames.map((dayName, dayIndex) => {
        const dayNumber = dayIndex + 1;
        const daySessions = getSessionsForDay(dayNumber);
        
        return (
          <Card key={dayIndex}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {dayName}
                <Badge variant="outline" className="ml-auto">
                  {daySessions.length} dərs
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {daySessions.length > 0 ? (
                <div className="space-y-3">
                  {daySessions
                    .sort((a, b) => a.period_number - b.period_number)
                    .map((session) => (
                      <div key={session.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 min-w-[80px]">
                          <Clock className="w-4 h-4" />
                          {session.start_time}
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <div>
                              <div className="font-medium text-sm">{session.subject.name}</div>
                              <div className="text-xs text-gray-500">{session.subject.code}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-green-600" />
                            <div>
                              <div className="text-sm">{session.teacher.name}</div>
                              <div className="text-xs text-gray-500">Müəllim</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-purple-600 rounded-sm flex items-center justify-center">
                              <span className="text-xs text-white font-bold">S</span>
                            </div>
                            <div>
                              <div className="text-sm">{session.class.name}</div>
                              <div className="text-xs text-gray-500">
                                {session.room ? `Otaq: ${session.room.name}` : 'Otaq təyin edilməyib'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <Badge variant="outline" className="text-xs">
                          {session.period_number}-ci
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">Bu gün üçün dərs planlaşdırılmayıb</div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderStatistics = () => {
    const totalSessions = sessions.length;
    const uniqueTeachers = new Set(sessions.map(s => s.teacher.id)).size;
    const uniqueClasses = new Set(sessions.map(s => s.class.id)).size;
    const uniqueSubjects = new Set(sessions.map(s => s.subject.id)).size;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalSessions}</div>
            <div className="text-sm text-gray-600">Dərs Seansı</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{uniqueTeachers}</div>
            <div className="text-sm text-gray-600">Müəllim</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{uniqueClasses}</div>
            <div className="text-sm text-gray-600">Sinif</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{uniqueSubjects}</div>
            <div className="text-sm text-gray-600">Fənn</div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cədvəl Nəzərdən Keçirilməsi</h3>
          <p className="text-gray-600 text-sm">
            Yaradılan cədvəli yoxlayın və təsdiq edin
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Yüklə
          </Button>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {renderStatistics()}

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grid" className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            Cədvəl Görünüşü
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Siyahı Görünüşü
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-6">
          <Card>
            <CardContent className="p-6">
              {renderGridView()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          {renderListView()}
        </TabsContent>
      </Tabs>

      {/* Schedule Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>Cədvəl ID: <strong className="text-gray-900">{schedule.id}</strong></span>
              <span>Yaradılma tarixi: <strong className="text-gray-900">{new Date(schedule.created_at).toLocaleDateString('az-AZ')}</strong></span>
              <span>Status: <Badge variant="secondary" className="text-green-600">{schedule.status}</Badge></span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};