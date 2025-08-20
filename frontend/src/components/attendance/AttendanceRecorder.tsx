import React, { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { School } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Components
import { AttendanceHeader } from './components/AttendanceHeader';
import { AttendanceControls } from './components/AttendanceControls';
import { DailyStatsCards } from './components/DailyStatsCards';
import { BulkActions } from './components/BulkActions';
import { AttendanceList } from './components/AttendanceList';
import { WeeklyView } from './components/WeeklyView';

// Hooks
import { useAttendanceData } from './hooks/useAttendanceData';

interface AttendanceRecorderProps {
  className?: string;
}

export const AttendanceRecorder: React.FC<AttendanceRecorderProps> = ({ className }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late' | 'excused' | ''>('');

  const {
    // Data
    classes,
    students,
    attendanceStats,
    attendanceData,
    dailyStats,
    currentUser,
    
    // Loading states
    studentsLoading,
    statsLoading,
    isRecordingAttendance,
    
    // Actions
    updateAttendanceStatus,
    updateAttendanceNotes,
    applyBulkStatus,
    saveAttendance,
    refetchAttendance,
  } = useAttendanceData({ selectedClassId, selectedDate });

  const handleBulkApply = () => {
    if (!bulkStatus) return;
    applyBulkStatus(bulkStatus);
    setBulkStatus('');
  };

  const handleSaveAttendance = () => {
    if (!selectedClassId) return;
    saveAttendance(selectedClassId, selectedDate);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <AttendanceHeader
        currentUser={currentUser}
        onRefresh={refetchAttendance}
      />

      {/* Controls */}
      <AttendanceControls
        classes={classes}
        selectedClassId={selectedClassId}
        onClassChange={setSelectedClassId}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {selectedClassId ? (
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
          <TabsContent value="daily" className="space-y-6">
            {/* Daily Stats */}
            {dailyStats && <DailyStatsCards stats={dailyStats} />}

            {/* Bulk Actions */}
            <BulkActions
              bulkStatus={bulkStatus}
              onBulkStatusChange={setBulkStatus}
              onBulkApply={handleBulkApply}
              onSave={handleSaveAttendance}
              isRecordingAttendance={isRecordingAttendance}
              hasStudents={!!(students && students.length > 0)}
            />

            {/* Student List */}
            <AttendanceList
              students={students || []}
              attendanceData={attendanceData}
              studentsLoading={studentsLoading}
              onStatusChange={updateAttendanceStatus}
              onNotesChange={updateAttendanceNotes}
            />
          </TabsContent>

          <TabsContent value="weekly">
            <WeeklyView
              attendanceStats={attendanceStats}
              statsLoading={statsLoading}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <School className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Sinif seçin</h3>
              <p className="text-muted-foreground">
                Davamiyyət qeydə almaq üçün əvvəlcə sinif seçin
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};