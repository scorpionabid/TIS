import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Clock, Users, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoomBooking } from './hooks/useRoomBooking';

interface BookingTimeSlotProps {
  timeSlot: string;
  booking?: RoomBooking;
  isBooked: boolean;
  onSlotClick: (timeSlot: string) => void;
  onBookingView?: (booking: RoomBooking) => void;
  readOnly?: boolean;
  className?: string;
}

export const BookingTimeSlot: React.FC<BookingTimeSlotProps> = ({
  timeSlot,
  booking,
  isBooked,
  onSlotClick,
  onBookingView,
  readOnly = false,
  className
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'destructive';
      case 'completed': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'confirmed': 'Təsdiqləndi',
      'pending': 'Gözləyir',
      'cancelled': 'Ləğv edildi',
      'completed': 'Tamamlandı'
    };
    return labels[status] || status;
  };

  const getPurposeLabel = (purpose: string): string => {
    const labels: Record<string, string> = {
      'class': 'Dərs',
      'exam': 'İmtahan',
      'meeting': 'Görüş',
      'event': 'Tədbir',
      'maintenance': 'Baxım',
      'other': 'Digər'
    };
    return labels[purpose] || purpose;
  };

  const getPurposeIcon = (purpose: string) => {
    switch (purpose) {
      case 'confirmed': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return Clock;
    }
  };

  const handleSlotClick = () => {
    if (!readOnly) {
      onSlotClick(timeSlot);
    }
  };

  const handleBookingView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (booking && onBookingView) {
      onBookingView(booking);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg border transition-colors",
        isBooked 
          ? "bg-blue-50 border-blue-200 hover:bg-blue-100" 
          : "bg-gray-50 border-gray-200 hover:bg-gray-100",
        !readOnly && "cursor-pointer",
        readOnly && "cursor-default",
        className
      )}
      onClick={handleSlotClick}
    >
      {/* Time Slot */}
      <div className="w-20 flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{timeSlot}</span>
      </div>
      
      {/* Booking Information */}
      {isBooked && booking ? (
        <div className="flex-1 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">{booking.title}</h4>
              <Badge variant={getStatusColor(booking.status)} className="text-xs">
                {getStatusLabel(booking.status)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {booking.created_by.name}
              </span>
              
              <span>{getPurposeLabel(booking.purpose)}</span>
              
              {booking.attendees_count && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {booking.attendees_count} nəfər
                </span>
              )}
              
              <span className="text-xs">
                {booking.start_time} - {booking.end_time}
              </span>
            </div>

            {/* Description */}
            {booking.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {booking.description}
              </p>
            )}

            {/* Equipment */}
            {booking.equipment_needed.length > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">Avadanlıq:</span>
                <span className="text-foreground">
                  {booking.equipment_needed.slice(0, 2).join(', ')}
                  {booking.equipment_needed.length > 2 && ` +${booking.equipment_needed.length - 2}`}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {booking.status === 'pending' && (
              <Badge variant="warning" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Təsdiq gözlənir
              </Badge>
            )}
            
            {booking.status === 'confirmed' && (
              <Badge variant="success" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Təsdiqləndi
              </Badge>
            )}

            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={handleBookingView}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* Available Slot */
        <div className="flex-1 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span>Müsait</span>
          </div>
          
          {!readOnly && (
            <div className="text-xs text-blue-600 hover:text-blue-800 transition-colors">
              Rezervasiya etmək üçün klikləyin
            </div>
          )}
        </div>
      )}
    </div>
  );
};