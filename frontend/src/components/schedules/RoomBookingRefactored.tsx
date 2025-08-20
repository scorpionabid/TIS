import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Import modular components
import { useRoomBooking } from './hooks/useRoomBooking';
import { RoomCard } from './RoomCard';
import { RoomFilters } from './RoomFilters';
import { ScheduleView } from './ScheduleView';
import { BookingCreateModal } from './BookingCreateModal';

interface RoomBookingRefactoredProps {
  selectedRoomId?: number;
  selectedDate?: Date;
  onBookingCreate?: (booking: any) => void;
  readOnly?: boolean;
  className?: string;
}

export const RoomBookingRefactored: React.FC<RoomBookingRefactoredProps> = ({
  selectedRoomId,
  selectedDate = new Date(),
  onBookingCreate,
  readOnly = false,
  className
}) => {
  const {
    // State
    selectedRoom,
    currentDate,
    viewMode,
    showBookingDialog,
    filterType,
    searchTerm,
    bookingForm,
    
    // Data
    rooms,
    bookings,
    roomsLoading,
    bookingsLoading,
    
    // Mutations
    createBookingMutation,
    
    // Actions
    setSelectedRoom,
    setCurrentDate,
    setViewMode,
    setShowBookingDialog,
    setFilterType,
    setSearchTerm,
    setBookingForm,
    refetch,
    
    // Event handlers
    resetBookingForm,
    handleCreateBooking,
    
    // Utilities
    getRoomTypeLabel,
    getStatusColor,
    getStatusLabel,
    getPurposeLabel,
    generateTimeSlots,
    isTimeSlotBooked
  } = useRoomBooking(selectedRoomId, selectedDate);

  const timeSlots = generateTimeSlots();
  const currentSelectedRoom = rooms?.find(r => r.id === selectedRoom);

  const handleRoomSelect = (roomId: number) => {
    setSelectedRoom(roomId);
  };

  const handleBookingClick = (roomId: number) => {
    setSelectedRoom(roomId);
    setShowBookingDialog(true);
  };

  const handleTimeSlotClick = (timeSlot: string) => {
    if (readOnly) return;
    
    setBookingForm({
      ...bookingForm,
      start_time: timeSlot,
      end_time: timeSlots[timeSlots.indexOf(timeSlot) + 1] || timeSlot
    });
    setShowBookingDialog(true);
  };

  const handleBookingView = (booking: any) => {
    // Handle booking view/edit
    console.log('View booking:', booking);
  };

  const handleFilterClear = () => {
    setSearchTerm('');
    setFilterType('all');
  };

  const handleBookingCreateSuccess = (booking: any) => {
    onBookingCreate?.(booking);
    refetch();
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Otaq Rezervasiyası</h2>
          <p className="text-muted-foreground">
            Məktəb otaqlarını rezervasiya edin və cədvələri idarə edin
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Filters */}
          <RoomFilters
            searchTerm={searchTerm}
            filterType={filterType}
            onSearchChange={setSearchTerm}
            onFilterTypeChange={setFilterType}
            onRefresh={refetch}
            onClear={handleFilterClear}
          />

          {/* Room List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Otaqlar</h3>
              {rooms && (
                <span className="text-sm text-muted-foreground">
                  {rooms.length} otaq
                </span>
              )}
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-3">
                {roomsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-32 bg-muted rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : rooms && rooms.length > 0 ? (
                  rooms.map(room => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      isSelected={selectedRoom === room.id}
                      onSelect={handleRoomSelect}
                      onBookingClick={readOnly ? undefined : handleBookingClick}
                      showActions={!readOnly}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Otaq tapılmadı</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <ScheduleView
            viewMode={viewMode}
            selectedRoom={currentSelectedRoom}
            currentDate={currentDate}
            bookings={bookings}
            timeSlots={timeSlots}
            onViewModeChange={setViewMode}
            onDateChange={setCurrentDate}
            onTimeSlotClick={handleTimeSlotClick}
            onBookingView={handleBookingView}
            isTimeSlotBooked={isTimeSlotBooked}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* Booking Creation Modal */}
      <BookingCreateModal
        isOpen={showBookingDialog}
        onClose={() => setShowBookingDialog(false)}
        selectedRoom={currentSelectedRoom}
        selectedDate={currentDate}
        bookingForm={bookingForm}
        setBookingForm={setBookingForm}
        onCreateBooking={handleCreateBooking}
        isCreating={createBookingMutation.isPending}
      />
    </div>
  );
};