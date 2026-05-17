import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, Clock, Star, XCircle } from 'lucide-react';
import { ScheduleSlot, ScheduleConflict } from '@/services/schedule';

interface ScheduleSlotContentProps {
  slot: ScheduleSlot;
  hasConflict: boolean;
  viewScale: 'compact' | 'normal' | 'detailed';
  conflicts: ScheduleConflict[];
  availabilityType?: 'available' | 'preferred' | 'unavailable' | 'none' | null;
}

export const ScheduleSlotContent: React.FC<ScheduleSlotContentProps> = ({
  slot,
  hasConflict,
  viewScale,
  conflicts,
  availabilityType,
}) => {
  switch (viewScale) {
    case 'compact':
      return (
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-1">
            {availabilityType === 'preferred' && <Star className="h-3 w-3 text-amber-500" />}
            {availabilityType === 'unavailable' && <XCircle className="h-3 w-3 text-red-500" />}
            <div className="font-medium truncate">{slot.subject?.name}</div>
          </div>
          <div className="text-muted-foreground truncate">{slot.class?.name}</div>
          {hasConflict && (
            <AlertTriangle className="h-3 w-3 text-red-500" />
          )}
        </div>
      );
    
    case 'detailed':
      return (
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-1">
            {availabilityType === 'preferred' && <Star className="h-3 w-3 text-amber-500" />}
            {availabilityType === 'unavailable' && <XCircle className="h-3 w-3 text-red-500" />}
            <div className="font-medium">{slot.subject?.name}</div>
          </div>
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
          {availabilityType && availabilityType !== 'available' && availabilityType !== 'none' && (
            <div className={`flex items-center gap-1 ${
              availabilityType === 'preferred' ? 'text-amber-600' : 'text-red-600'
            }`}>
              {availabilityType === 'preferred' ? <Star className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              <span className="text-xs">
                {availabilityType === 'preferred' ? 'Üstünlük verilən vaxt' : 'Müəllim bu vaxtda mövcud deyil'}
              </span>
            </div>
          )}
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
          <div className="flex items-center gap-1">
            {availabilityType === 'preferred' && <Star className="h-3 w-3 text-amber-500" />}
            {availabilityType === 'unavailable' && <XCircle className="h-3 w-3 text-red-500" />}
            <div className="font-medium truncate">{slot.subject?.name}</div>
          </div>
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
          {availabilityType && availabilityType !== 'available' && availabilityType !== 'none' && (
            <div className={`text-xs ${availabilityType === 'preferred' ? 'text-amber-600' : 'text-red-600'}`}>
              {availabilityType === 'preferred' ? '⭐ Üstünlük' : '❌ Olmaz'}
            </div>
          )}
          {hasConflict && (
            <Badge className="text-xs bg-red-100 text-red-700 hover:bg-red-100">
              Konflikt
            </Badge>
          )}
        </div>
      );
  }
};
