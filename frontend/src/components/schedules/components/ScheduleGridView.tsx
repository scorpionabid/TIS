import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScheduleSlot } from '@/services/schedule';
import { format, addDays, isToday } from 'date-fns';
import { ScheduleSlotContent } from './ScheduleSlotContent';

interface ScheduleGridViewProps {
  weekStart: Date;
  daysOfWeek: Array<{
    id: number;
    name: string;
    short: string;
    veryShort: string;
  }>;
  timeSlots: Array<{
    id: string;
    start_time: string;
    end_time: string;
    name: string;
  }>;
  getSlotForCell: (dayOfWeek: number, timeSlotId: string) => ScheduleSlot | null;
  hasConflict: (slot: ScheduleSlot) => boolean;
  selectedSlot: ScheduleSlot | null;
  viewScale: 'compact' | 'normal' | 'detailed';
  readOnly: boolean;
  onSlotClick: (slot: ScheduleSlot) => void;
  onEmptySlotClick: (dayOfWeek: number, timeSlotId: string) => void;
  getSlotContent: (slot: ScheduleSlot, hasConflict: boolean) => React.ReactNode;
}

export const ScheduleGridView: React.FC<ScheduleGridViewProps> = ({
  weekStart,
  daysOfWeek,
  timeSlots,
  getSlotForCell,
  hasConflict,
  selectedSlot,
  viewScale,
  readOnly,
  onSlotClick,
  onEmptySlotClick,
  getSlotContent
}) => {
  const getCellHeight = () => {
    switch (viewScale) {
      case 'compact': return 'min-h-[60px]';
      case 'detailed': return 'min-h-[120px]';
      default: return 'min-h-[80px]';
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <ScrollArea className="w-full">
          <div className="grid grid-cols-6 gap-1 min-w-[800px]">
            {/* Header */}
            <div className="font-medium text-center py-3 bg-muted rounded">
              Saat
            </div>
            {daysOfWeek.map(day => {
              const dayDate = addDays(weekStart, day.id === 0 ? 6 : day.id - 1);
              const isCurrentDay = isToday(dayDate);
              
              return (
                <div 
                  key={day.id} 
                  className={cn(
                    "font-medium text-center py-3 rounded",
                    isCurrentDay ? "bg-yellow-100 border border-yellow-300" : "bg-muted"
                  )}
                >
                  <div>{viewScale === 'compact' ? day.veryShort : day.short}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(dayDate, 'dd.MM')}
                  </div>
                  {isCurrentDay && (
                    <div className="text-xs text-yellow-700 font-medium">Bu gün</div>
                  )}
                </div>
              );
            })}

            {/* Time slots grid */}
            {timeSlots.map(timeSlot => (
              <React.Fragment key={timeSlot.id}>
                <div className="text-sm text-center py-4 border-r border-border">
                  <div className="font-medium">{timeSlot.start_time}</div>
                  <div className="text-xs text-muted-foreground">{timeSlot.end_time}</div>
                  {viewScale === 'detailed' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {timeSlot.name}
                    </div>
                  )}
                </div>
                
                {daysOfWeek.map(day => {
                  const existingSlot = getSlotForCell(day.id, timeSlot.id);
                  const hasConflictFlag = existingSlot ? hasConflict(existingSlot) : false;
                  const dayDate = addDays(weekStart, day.id === 0 ? 6 : day.id - 1);
                  const isCurrentDay = isToday(dayDate);

                  return (
                    <Tooltip key={`${day.id}-${timeSlot.id}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "border rounded p-2 cursor-pointer transition-all duration-200",
                            getCellHeight(),
                            existingSlot 
                              ? hasConflictFlag 
                                ? "bg-red-50 border-red-200 hover:bg-red-100 hover:shadow-md" 
                                : "bg-primary/10 border-primary/20 hover:bg-primary/20 hover:shadow-md"
                              : readOnly
                                ? "bg-muted/30"
                                : "bg-muted/30 hover:bg-muted/50 border-dashed hover:border-solid",
                            isCurrentDay && "ring-1 ring-yellow-400",
                            selectedSlot?.id === existingSlot?.id && "ring-2 ring-primary"
                          )}
                          onClick={() => {
                            if (existingSlot) {
                              onSlotClick(existingSlot);
                            } else {
                              onEmptySlotClick(day.id, timeSlot.id);
                            }
                          }}
                        >
                          {existingSlot ? (
                            getSlotContent(existingSlot, hasConflictFlag)
                          ) : (
                            !readOnly && (
                              <div className="h-full flex items-center justify-center text-muted-foreground opacity-0 hover:opacity-100 transition-opacity">
                                <Users className="h-4 w-4" />
                              </div>
                            )
                          )}
                        </div>
                      </TooltipTrigger>
                      {existingSlot && (
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {existingSlot.subject?.name} - {existingSlot.class?.name}
                            </div>
                            <div className="text-sm">
                              Müəllim: {existingSlot.teacher?.first_name} {existingSlot.teacher?.last_name}
                            </div>
                            {existingSlot.room && (
                              <div className="text-sm">
                                Otaq: {existingSlot.room.name}
                              </div>
                            )}
                            <div className="text-sm">
                              Vaxt: {existingSlot.start_time} - {existingSlot.end_time}
                            </div>
                            {hasConflictFlag && (
                              <div className="text-sm text-red-600">
                                ⚠️ Konflikt mövcuddur
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
