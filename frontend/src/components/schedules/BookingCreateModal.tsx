import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Clock, Users, Settings, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import type { Room, BookingFormData } from './hooks/useRoomBooking';

interface BookingCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRoom?: Room;
  selectedDate: Date;
  bookingForm: BookingFormData;
  setBookingForm: (form: BookingFormData) => void;
  onCreateBooking: () => void;
  isCreating: boolean;
}

export const BookingCreateModal: React.FC<BookingCreateModalProps> = ({
  isOpen,
  onClose,
  selectedRoom,
  selectedDate,
  bookingForm,
  setBookingForm,
  onCreateBooking,
  isCreating
}) => {
  const handleInputChange = (field: keyof BookingFormData, value: string | string[]) => {
    setBookingForm({
      ...bookingForm,
      [field]: value
    });
  };

  const handleEquipmentToggle = (equipment: string) => {
    const current = bookingForm.equipment_needed;
    const updated = current.includes(equipment)
      ? current.filter(e => e !== equipment)
      : [...current, equipment];
    
    handleInputChange('equipment_needed', updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateBooking();
  };

  const isFormValid = () => {
    return !!(
      selectedRoom &&
      bookingForm.title &&
      bookingForm.start_time &&
      bookingForm.end_time &&
      bookingForm.purpose
    );
  };

  const purposeOptions = [
    { value: 'class', label: 'Dərs' },
    { value: 'exam', label: 'İmtahan' },
    { value: 'meeting', label: 'Görüş' },
    { value: 'event', label: 'Tədbir' },
    { value: 'maintenance', label: 'Baxım' },
    { value: 'other', label: 'Digər' }
  ];

  const availableEquipment = selectedRoom?.equipment || [];

  const timeSlots = [];
  for (let i = 8; i <= 18; i++) {
    for (let j = 0; j < 60; j += 45) {
      const hour = i.toString().padStart(2, '0');
      const minute = j.toString().padStart(2, '0');
      timeSlots.push(`${hour}:${minute}`);
    }
  }

  const validateTimeSelection = () => {
    if (!bookingForm.start_time || !bookingForm.end_time) return null;
    
    const startTime = new Date(`2000-01-01T${bookingForm.start_time}:00`);
    const endTime = new Date(`2000-01-01T${bookingForm.end_time}:00`);
    
    if (endTime <= startTime) {
      return "Bitiş vaxtı başlama vaxtından sonra olmalıdır";
    }
    
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    
    if (selectedRoom?.booking_rules?.min_duration && duration < selectedRoom.booking_rules.min_duration) {
      return `Minimum rezervasiya müddəti ${selectedRoom.booking_rules.min_duration} dəqiqədir`;
    }
    
    if (selectedRoom?.booking_rules?.max_duration && duration > selectedRoom.booking_rules.max_duration) {
      return `Maksimum rezervasiya müddəti ${selectedRoom.booking_rules.max_duration} dəqiqədir`;
    }
    
    return null;
  };

  const timeValidationError = validateTimeSelection();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Yeni Rezervasiya
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room and Date Info */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Rezervasiya məlumatları</h3>
              {selectedRoom?.booking_rules?.requires_approval && (
                <Badge variant="warning" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Təsdiq tələb olunur
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Otaq:</span>
                <span className="font-medium ml-2">{selectedRoom?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tarix:</span>
                <span className="font-medium ml-2">
                  {format(selectedDate, 'dd MMMM yyyy', { locale: az })}
                </span>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Başlıq <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={bookingForm.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="məs. 8-A sinif riyaziyyat dərsi"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Təsvir
              </Label>
              <Textarea
                id="description"
                value={bookingForm.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Rezervasiya haqqında əlavə məlumat..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purpose" className="text-sm font-medium">
                  Məqsəd <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={bookingForm.purpose} 
                  onValueChange={(value: any) => handleInputChange('purpose', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Məqsəd seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {purposeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendees_count" className="text-sm font-medium">
                  İştirakçı sayı
                </Label>
                <Input
                  id="attendees_count"
                  type="number"
                  min="1"
                  max={selectedRoom?.capacity || 100}
                  value={bookingForm.attendees_count}
                  onChange={(e) => handleInputChange('attendees_count', e.target.value)}
                  placeholder="İştirakçı sayını daxil edin"
                />
                {selectedRoom?.capacity && (
                  <p className="text-xs text-muted-foreground">
                    Maksimum tutum: {selectedRoom.capacity} nəfər
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Vaxt seçimi
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time" className="text-sm font-medium">
                  Başlama vaxtı <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={bookingForm.start_time} 
                  onValueChange={(value) => handleInputChange('start_time', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Başlama vaxtı" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(slot => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time" className="text-sm font-medium">
                  Bitiş vaxtı <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={bookingForm.end_time} 
                  onValueChange={(value) => handleInputChange('end_time', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bitiş vaxtı" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(slot => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {timeValidationError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                {timeValidationError}
              </div>
            )}

            {/* Booking Rules Info */}
            {selectedRoom?.booking_rules && (
              <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
                <strong>Rezervasiya qaydaları:</strong>
                <ul className="mt-1 space-y-1">
                  {selectedRoom.booking_rules.min_duration && (
                    <li>• Minimum müddət: {selectedRoom.booking_rules.min_duration} dəqiqə</li>
                  )}
                  {selectedRoom.booking_rules.max_duration && (
                    <li>• Maksimum müddət: {selectedRoom.booking_rules.max_duration} dəqiqə</li>
                  )}
                  {selectedRoom.booking_rules.advance_booking_hours && (
                    <li>• Əvvəlcədən rezervasiya: {selectedRoom.booking_rules.advance_booking_hours} saat</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Equipment Selection */}
          {availableEquipment.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium">Lazımi avadanlıq</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableEquipment.map(equipment => (
                  <div
                    key={equipment}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      bookingForm.equipment_needed.includes(equipment)
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleEquipmentToggle(equipment)}
                  >
                    <div className="text-sm font-medium">{equipment}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Requirements */}
          <div className="space-y-2">
            <Label htmlFor="special_requirements" className="text-sm font-medium">
              Xüsusi tələblər
            </Label>
            <Textarea
              id="special_requirements"
              value={bookingForm.special_requirements}
              onChange={(e) => handleInputChange('special_requirements', e.target.value)}
              placeholder="Xüsusi tələb və ya qeydlər..."
              rows={2}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <span className="text-red-500">*</span> Tələb olunan sahələr
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                type="button"
                variant="outline" 
                onClick={onClose}
                disabled={isCreating}
              >
                Ləğv et
              </Button>
              <Button 
                type="submit"
                disabled={!isFormValid() || !!timeValidationError || isCreating}
                className="min-w-24"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Yaradılır...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Rezervasiya et
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Additional Info */}
        <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg">
          <strong>Qeyd:</strong> Rezervasiya yaradıldıqdan sonra 
          {selectedRoom?.booking_rules?.requires_approval 
            ? ' təsdiq üçün müəllim və ya idarəçiyə göndəriləcək.' 
            : ' dərhal təsdiqlənəcək.'
          }
        </div>
      </DialogContent>
    </Dialog>
  );
};