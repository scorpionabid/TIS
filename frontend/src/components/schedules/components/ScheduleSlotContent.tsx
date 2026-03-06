import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, Clock } from 'lucide-react';
import { ScheduleSlot, ScheduleConflict } from '@/services/schedule';

interface ScheduleSlotContentProps {
  slot: ScheduleSlot;
  hasConflict: boolean;
  viewScale: 'compact' | 'normal' | 'detailed';
  conflicts: ScheduleConflict[];
}

export const ScheduleSlotContent: React.FC<ScheduleSlotContentProps> = ({
  slot,
  hasConflict,
  viewScale,
  conflicts
}) => {
  switch (viewScale) {
    case 'compact':
      return (
        <div className="text-xs space-y-1">
          <div className="font-medium truncate">{slot.subject?.name}</div>
          <div className="text-muted-foreground truncate">{slot.class?.name}</div>
          {hasConflict && (
            <AlertTriangle className="h-3 w-3 text-red-500" />
          )}
        </div>
      );
    
    case 'detailed':
      return (
        <div className="text-xs space-y-1">
          <div className="font-medium">{slot.subject?.name}</div>
          <div className="text-muted-foreground">{slot.class?.name}</div>
          <div className="text-muted-foreground">
            {slot.teacher?.first_name} {slot.teacher?.last_name}
          </div>
          {slot.room && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {slot.room.name}
            </div>
          )}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {slot.start_time} - {slot.end_time}
          </div>
          {hasConflict && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span className="text-red-600 text-xs">{conflicts.length} konflikt</span>
            </div>
          )}
        </div>
      );
    
    default:
      return (
        <div className="text-xs space-y-1">
          <div className="font-medium truncate">{slot.subject?.name}</div>
          <div className="text-muted-foreground truncate">{slot.class?.name}</div>
          <div className="text-muted-foreground truncate">
            {slot.teacher?.first_name} {slot.teacher?.last_name}
          </div>
          {slot.room && (
            <div className="text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {slot.room.name}
            </div>
          )}
          {hasConflict && (
            <Badge variant="destructive" className="text-xs">
              Konflikt
            </Badge>
          )}
        </div>
      );
  }
};
