import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export interface Room {
  id: number;
  name: string;
  type: 'classroom' | 'laboratory' | 'gymnasium' | 'library' | 'auditorium' | 'computer_lab' | 'art_room' | 'music_room';
  capacity: number;
  floor: number;
  building?: string;
  equipment: string[];
  is_available: boolean;
  booking_rules?: {
    min_duration?: number;
    max_duration?: number;
    advance_booking_hours?: number;
    requires_approval?: boolean;
    restricted_times?: string[];
  };
  features: {
    has_projector: boolean;
    has_whiteboard: boolean;
    has_computers: boolean;
    has_internet: boolean;
    has_air_conditioning: boolean;
    has_sound_system: boolean;
    is_accessible: boolean;
  };
  current_bookings?: RoomBooking[];
  maintenance_schedule?: MaintenanceSchedule[];
}

export interface RoomBooking {
  id: number;
  room_id: number;
  user_id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  date: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  purpose: 'class' | 'exam' | 'meeting' | 'event' | 'maintenance' | 'other';
  attendees_count?: number;
  equipment_needed: string[];
  special_requirements?: string;
  created_by: {
    id: number;
    name: string;
    role: string;
  };
  approved_by?: {
    id: number;
    name: string;
  };
  approved_at?: string;
}

export interface MaintenanceSchedule {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  date: string;
  type: 'cleaning' | 'repair' | 'inspection' | 'upgrade';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface BookingFormData {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  purpose: RoomBooking['purpose'];
  attendees_count: string;
  equipment_needed: string[];
  special_requirements: string;
}

export const useRoomBooking = (initialRoomId?: number, initialDate?: Date) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [selectedRoom, setSelectedRoom] = useState<number | undefined>(initialRoomId);
  const [currentDate, setCurrentDate] = useState<Date>(initialDate || new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'grid'>('day');
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Booking form state
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    purpose: 'class',
    attendees_count: '',
    equipment_needed: [],
    special_requirements: ''
  });

  // Fetch rooms
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      // Mock API call - replace with actual service
      return [
        {
          id: 1,
          name: "301 Sinif",
          type: "classroom" as const,
          capacity: 30,
          floor: 3,
          building: "A Blok",
          equipment: ["Projektor", "Lövhə", "Kondisioner"],
          is_available: true,
          features: {
            has_projector: true,
            has_whiteboard: true,
            has_computers: false,
            has_internet: true,
            has_air_conditioning: true,
            has_sound_system: false,
            is_accessible: true
          },
          booking_rules: {
            min_duration: 45,
            max_duration: 240,
            advance_booking_hours: 2,
            requires_approval: false
          }
        },
        {
          id: 2,
          name: "Kompyuter Laboratoriyası",
          type: "computer_lab" as const,
          capacity: 24,
          floor: 2,
          building: "B Blok",
          equipment: ["24 Kompyuter", "Projektor", "Server", "Şəbəkə"],
          is_available: true,
          features: {
            has_projector: true,
            has_whiteboard: true,
            has_computers: true,
            has_internet: true,
            has_air_conditioning: true,
            has_sound_system: true,
            is_accessible: true
          },
          booking_rules: {
            min_duration: 45,
            max_duration: 180,
            advance_booking_hours: 4,
            requires_approval: true
          }
        }
      ] as Room[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch bookings for selected room and date
  const { data: bookings, isLoading: bookingsLoading, refetch } = useQuery({
    queryKey: ['room-bookings', selectedRoom, format(currentDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!selectedRoom) return [];
      
      // Mock API call - replace with actual service
      return [
        {
          id: 1,
          room_id: selectedRoom,
          user_id: 1,
          title: "Riyaziyyat Dərsi",
          description: "8-A sinif riyaziyyat dərsi",
          start_time: "09:00",
          end_time: "09:45",
          date: format(currentDate, 'yyyy-MM-dd'),
          status: "confirmed" as const,
          purpose: "class" as const,
          attendees_count: 28,
          equipment_needed: ["Projektor"],
          created_by: {
            id: 1,
            name: "Leyla Məmmədova",
            role: "Müəllim"
          }
        }
      ] as RoomBooking[];
    },
    enabled: !!selectedRoom,
    staleTime: 1000 * 60 * 2,
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      // Mock API call - replace with actual service
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: Date.now(), ...data };
    },
    onSuccess: (newBooking) => {
      queryClient.invalidateQueries({ queryKey: ['room-bookings'] });
      setShowBookingDialog(false);
      resetBookingForm();
      toast({
        title: "Rezervasiya Yaradıldı",
        description: "Otaq rezervasiyası uğurla yaradıldı",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Rezervasiya yaradılarkən xəta baş verdi",
        variant: "destructive",
      });
    }
  });

  // Utility functions
  const resetBookingForm = () => {
    setBookingForm({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      purpose: 'class',
      attendees_count: '',
      equipment_needed: [],
      special_requirements: ''
    });
  };

  const handleCreateBooking = () => {
    if (!selectedRoom || !bookingForm.title || !bookingForm.start_time || !bookingForm.end_time) {
      toast({
        title: "Məlumat Eksikliyi",
        description: "Zəruri sahələri doldurun",
        variant: "destructive",
      });
      return;
    }

    createBookingMutation.mutate({
      room_id: selectedRoom,
      date: format(currentDate, 'yyyy-MM-dd'),
      ...bookingForm,
      attendees_count: parseInt(bookingForm.attendees_count) || undefined
    });
  };

  const getRoomTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'classroom': 'Sinif',
      'laboratory': 'Laboratoriya',
      'gymnasium': 'İdman Zalı',
      'library': 'Kitabxana',
      'auditorium': 'Akt Zalı',
      'computer_lab': 'Kompyuter Lab',
      'art_room': 'İncəsənət Otağı',
      'music_room': 'Musiqi Otağı'
    };
    return labels[type] || type;
  };

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

  const generateTimeSlots = () => {
    const slots = [];
    for (let i = 8; i <= 18; i++) {
      for (let j = 0; j < 60; j += 45) {
        const hour = i.toString().padStart(2, '0');
        const minute = j.toString().padStart(2, '0');
        slots.push(`${hour}:${minute}`);
      }
    }
    return slots;
  };

  const isTimeSlotBooked = (timeSlot: string) => {
    return bookings?.find(booking => 
      booking.start_time <= timeSlot && booking.end_time > timeSlot
    );
  };

  const filteredRooms = rooms?.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.building?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || room.type === filterType;
    return matchesSearch && matchesType;
  });

  return {
    // State
    selectedRoom,
    currentDate,
    viewMode,
    showBookingDialog,
    filterType,
    searchTerm,
    bookingForm,
    
    // Data
    rooms: filteredRooms,
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
  };
};