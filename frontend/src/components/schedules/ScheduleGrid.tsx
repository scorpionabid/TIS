import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScheduleSlot } from '@/services/schedule';
import { startOfWeek, endOfWeek } from 'date-fns';
import { useScheduleData } from './hooks/useScheduleData';
import { useScheduleLogic } from './hooks/useScheduleLogic';
import { ScheduleHeader } from './components/ScheduleHeader';
import { ScheduleNavigation } from './components/ScheduleNavigation';
import { ScheduleGridView } from './components/ScheduleGridView';
import { ScheduleListView } from './components/ScheduleListView';
import { ScheduleEmptyState } from './components/ScheduleEmptyState';
import { ScheduleSlotContent } from './components/ScheduleSlotContent';

interface ScheduleGridProps {
  scheduleId?: number;
  classId?: number;
  teacherId?: number;
  roomId?: number;
  viewMode?: 'week' | 'day' | 'month';
  showConflicts?: boolean;
  readOnly?: boolean;
  onSlotClick?: (slot: ScheduleSlot) => void;
  onSlotEdit?: (slot: ScheduleSlot) => void;
  onEmptySlotClick?: (dayOfWeek: number, timeSlot: string) => void;
  className?: string;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  scheduleId,
  classId,
  teacherId,
  roomId,
  viewMode = 'week',
  showConflicts = true,
  readOnly = false,
  onSlotClick,
  onSlotEdit,
  onEmptySlotClick,
  className
}) => {
  const { toast } = useToast();
  
  // Calculate week boundaries for current period
  const currentDate = new Date();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Load schedule data
  const { slots, conflicts, isLoading, error, refetch } = useScheduleData({
    scheduleId,
    classId,
    teacherId,
    roomId,
    weekStart,
    showConflicts
  });

  // Schedule logic and state management
  const {
    currentWeek,
    selectedSlot,
    filterType,
    viewScale,
    gridView,
    filteredSlots,
    timeSlots,
    daysOfWeek,
    setFilterType,
    setViewScale,
    setGridView,
    getSlotForCell,
    hasConflict,
    getSlotConflicts,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    handleSlotClick,
    handleEmptySlotClick
  } = useScheduleLogic({
    slots,
    conflicts,
    onSlotClick,
    onSlotEdit,
    onEmptySlotClick,
    readOnly
  });

  // Get slot content based on view scale
  const getSlotContent = (slot: ScheduleSlot, hasConflictFlag: boolean) => {
    const slotConflicts = getSlotConflicts(slot);
    
    return (
      <ScheduleSlotContent
        slot={slot}
        hasConflict={hasConflictFlag}
        viewScale={viewScale}
        conflicts={slotConflicts}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Dərs cədvəli yüklənir...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-medium text-destructive mb-2">Xəta baş verdi</h3>
          <p className="text-muted-foreground mb-4">Dərs cədvəli yüklənərkən problem yarandı</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenidən cəhd et
          </Button>
        </div>
      </Card>
    );
  }

  const weekStartForDisplay = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEndForDisplay = endOfWeek(currentWeek, { weekStartsOn: 1 });

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        <ScheduleHeader
          classId={classId}
          teacherId={teacherId}
          roomId={roomId}
          weekStart={weekStartForDisplay}
          weekEnd={weekEndForDisplay}
          slotsCount={slots.length}
          gridView={gridView}
          viewScale={viewScale}
          filterType={filterType}
          showConflicts={showConflicts}
          onGridViewChange={setGridView}
          onViewScaleChange={setViewScale}
          onFilterTypeChange={setFilterType}
        />

        <ScheduleNavigation
          showConflicts={showConflicts}
          onPreviousWeek={goToPreviousWeek}
          onCurrentWeek={goToCurrentWeek}
          onNextWeek={goToNextWeek}
        />

        {gridView === 'grid' ? (
          <ScheduleGridView
            weekStart={weekStartForDisplay}
            daysOfWeek={daysOfWeek}
            timeSlots={timeSlots}
            getSlotForCell={getSlotForCell}
            hasConflict={hasConflict}
            selectedSlot={selectedSlot}
            viewScale={viewScale}
            readOnly={readOnly}
            onSlotClick={handleSlotClick}
            onEmptySlotClick={handleEmptySlotClick}
            getSlotContent={getSlotContent}
          />
        ) : (
          <ScheduleListView
            weekStart={weekStartForDisplay}
            daysOfWeek={daysOfWeek}
            filteredSlots={filteredSlots}
            selectedSlot={selectedSlot}
            hasConflict={hasConflict}
            getSlotConflicts={getSlotConflicts}
            readOnly={readOnly}
            onSlotClick={handleSlotClick}
            onSlotEdit={onSlotEdit}
          />
        )}

        {filteredSlots.length === 0 && (
          <ScheduleEmptyState
            filterType={filterType}
            readOnly={readOnly}
          />
        )}
      </div>
    </TooltipProvider>
  );
};