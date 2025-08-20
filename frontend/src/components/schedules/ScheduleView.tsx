import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Grid3X3,
  List,
  Clock
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BookingTimeSlot } from './BookingTimeSlot';
import type { Room, RoomBooking } from './hooks/useRoomBooking';

interface ScheduleViewProps {
  viewMode: 'day' | 'week' | 'grid';
  selectedRoom?: Room;
  currentDate: Date;
  bookings?: RoomBooking[];
  timeSlots: string[];
  onViewModeChange: (mode: 'day' | 'week' | 'grid') => void;
  onDateChange: (date: Date) => void;
  onTimeSlotClick: (timeSlot: string) => void;
  onBookingView?: (booking: RoomBooking) => void;
  isTimeSlotBooked: (timeSlot: string) => RoomBooking | undefined;
  readOnly?: boolean;
  className?: string;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  viewMode,
  selectedRoom,
  currentDate,
  bookings,
  timeSlots,
  onViewModeChange,
  onDateChange,
  onTimeSlotClick,
  onBookingView,
  isTimeSlotBooked,
  readOnly = false,
  className
}) => {
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subDays(currentDate, 1)
      : addDays(currentDate, 1);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(addDays(currentDate, i - currentDate.getDay()));
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal min-w-40">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(currentDate, 'dd MMMM yyyy', { locale: az })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && onDateChange(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
          >
            Bugün
          </Button>
        </div>

        {/* View Mode Toggle */}
        <Tabs value={viewMode} onValueChange={(value: any) => onViewModeChange(value)}>
          <TabsList>
            <TabsTrigger value="day" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Günlük
            </TabsTrigger>
            <TabsTrigger value="week" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Həftəlik
            </TabsTrigger>
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Şəbəkə
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <Tabs value={viewMode} onValueChange={(value: any) => onViewModeChange(value)}>
        {/* Day View */}
        <TabsContent value="day" className="space-y-4">
          {selectedRoom ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      {selectedRoom.name} - Günlük Cədvəl
                    </CardTitle>
                    <CardDescription>
                      {format(currentDate, 'dd MMMM yyyy, EEEE', { locale: az })} tarixi üçün rezervasiyalar
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {timeSlots.map((timeSlot) => {
                    const booking = isTimeSlotBooked(timeSlot);
                    const isBooked = !!booking;

                    return (
                      <BookingTimeSlot
                        key={timeSlot}
                        timeSlot={timeSlot}
                        booking={booking}
                        isBooked={isBooked}
                        onSlotClick={onTimeSlotClick}
                        onBookingView={onBookingView}
                        readOnly={readOnly}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Otaq seçin</h3>
                  <p className="text-muted-foreground">
                    Cədvələ baxmaq üçün əvvəlcə otaq seçin
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Week View */}
        <TabsContent value="week" className="space-y-4">
          {selectedRoom ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5" />
                  {selectedRoom.name} - Həftəlik Cədvəl
                </CardTitle>
                <CardDescription>
                  {format(weekDays[0], 'dd MMM', { locale: az })} - {format(weekDays[6], 'dd MMM yyyy', { locale: az })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    {/* Week Header */}
                    <div className="grid grid-cols-8 gap-2 mb-4">
                      <div className="text-sm font-medium text-muted-foreground">Vaxt</div>
                      {weekDays.map((day, index) => (
                        <div key={index} className="text-center">
                          <div className="text-sm font-medium">
                            {format(day, 'EEE', { locale: az })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(day, 'dd MMM', { locale: az })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Week Grid */}
                    {timeSlots.slice(0, 10).map((timeSlot) => (
                      <div key={timeSlot} className="grid grid-cols-8 gap-2 mb-2">
                        <div className="text-sm font-medium py-2">
                          {timeSlot}
                        </div>
                        {weekDays.map((day, dayIndex) => (
                          <div 
                            key={dayIndex}
                            className="min-h-12 p-1 border rounded cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              onDateChange(day);
                              onTimeSlotClick(timeSlot);
                            }}
                          >
                            {/* Placeholder for week bookings */}
                            <div className="text-xs text-muted-foreground">
                              Müsait
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Həftəlik görünüş</h3>
                  <p className="text-muted-foreground">
                    Həftəlik cədvələ baxmaq üçün əvvəlcə otaq seçin
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Grid View */}
        <TabsContent value="grid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5" />
                Otaq Şəbəkəsi
              </CardTitle>
              <CardDescription>
                Bütün otaqların {format(currentDate, 'dd MMMM yyyy', { locale: az })} tarixindəki vəziyyəti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Şəbəkə görünüşü tezliklə əlavə olunacaq</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      {selectedRoom && !readOnly && (
        <div className="flex justify-end">
          <Button onClick={() => onTimeSlotClick('')}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Rezervasiya
          </Button>
        </div>
      )}
    </div>
  );
};