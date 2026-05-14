import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, MapPin, Eye, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScheduleSlot, ScheduleConflict } from '@/services/schedule';
import { format, addDays, isToday } from 'date-fns';
import { az } from 'date-fns/locale';

interface ScheduleListViewProps {
  weekStart: Date;
  daysOfWeek: Array<{
    id: number;
    name: string;
    short: string;
    veryShort: string;
  }>;
  filteredSlots: ScheduleSlot[];
  selectedSlot: ScheduleSlot | null;
  hasConflict: (slot: ScheduleSlot) => boolean;
  getSlotConflicts: (slot: ScheduleSlot) => ScheduleConflict[];
  readOnly: boolean;
  onSlotClick: (slot: ScheduleSlot) => void;
  onSlotEdit?: (slot: ScheduleSlot) => void;
}

export const ScheduleListView: React.FC<ScheduleListViewProps> = ({
  weekStart,
  daysOfWeek,
  filteredSlots,
  selectedSlot,
  hasConflict,
  getSlotConflicts,
  readOnly,
  onSlotClick,
  onSlotEdit
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {daysOfWeek.map(day => {
            const daySlots = filteredSlots.filter(slot => slot.day_of_week === day.id);
            const dayDate = addDays(weekStart, day.id === 0 ? 6 : day.id - 1);
            const isCurrentDay = isToday(dayDate);
            
            return (
              <div key={day.id} className="space-y-2">
                <div className={cn(
                  "flex items-center gap-2 p-2 rounded font-medium",
                  isCurrentDay ? "bg-yellow-100 text-yellow-800" : "bg-muted"
                )}>
                  <Calendar className="h-4 w-4" />
                  <span>{day.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {format(dayDate, 'dd.MM.yyyy', { locale: az })}
                  </span>
                  {isCurrentDay && (
                    <Badge variant="outline" className="ml-auto">Bu gün</Badge>
                  )}
                  <Badge variant="secondary" className="ml-auto">
                    {daySlots.length} dərs
                  </Badge>
                </div>
                
                {daySlots.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Bu gün dərs yoxdur
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {daySlots
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map(slot => {
                        const hasConflictFlag = hasConflict(slot);
                        const conflicts = getSlotConflicts(slot);
                        
                        return (
                          <Card 
                            key={slot.id}
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-md",
                              hasConflictFlag && "border-red-200 bg-red-50",
                              selectedSlot?.id === slot.id && "ring-2 ring-primary"
                            )}
                            onClick={() => onSlotClick(slot)}
                          >
                            <CardContent className="p-3">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-medium">{slot.subject?.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {slot.class?.name}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium">
                                      {slot.start_time} - {slot.end_time}
                                    </div>
                                    {hasConflictFlag && (
                                      <Badge variant="destructive" className="text-xs">
                                        {conflicts.length} konflikt
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {slot.teacher?.first_name} {slot.teacher?.last_name}
                                  </div>
                                  {slot.room && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {slot.room.name}
                                    </div>
                                  )}
                                </div>

                                {!readOnly && (
                                  <div className="flex items-center gap-2 pt-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSlotClick(slot);
                                      }}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      Bax
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onSlotEdit) {
                                          onSlotEdit(slot);
                                        }
                                      }}
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      Düzəliş
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
