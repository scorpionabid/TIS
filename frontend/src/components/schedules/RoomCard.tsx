import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin,
  Users,
  Wifi,
  Monitor,
  Volume2,
  CheckCircle,
  Settings,
  Book,
  Zap,
  Edit,
  Calendar,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Room } from './hooks/useRoomBooking';

interface RoomCardProps {
  room: Room;
  isSelected?: boolean;
  onSelect: (roomId: number) => void;
  onBookingClick?: (roomId: number) => void;
  showActions?: boolean;
  className?: string;
}

export const RoomCard: React.FC<RoomCardProps> = ({ 
  room, 
  isSelected = false,
  onSelect,
  onBookingClick,
  showActions = true,
  className 
}) => {
  const getRoomTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      'classroom': Book,
      'laboratory': Zap,
      'gymnasium': Users,
      'library': Book,
      'auditorium': Volume2,
      'computer_lab': Monitor,
      'art_room': Edit,
      'music_room': Volume2
    };
    return icons[type] || MapPin;
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

  const getFeatureIcons = () => {
    const featureIcons = [];
    
    if (room.features.has_projector) {
      featureIcons.push({ icon: Monitor, label: 'Projektor', key: 'projector' });
    }
    if (room.features.has_internet) {
      featureIcons.push({ icon: Wifi, label: 'İnternet', key: 'internet' });
    }
    if (room.features.has_sound_system) {
      featureIcons.push({ icon: Volume2, label: 'Səs sistemi', key: 'sound' });
    }
    if (room.features.is_accessible) {
      featureIcons.push({ icon: Shield, label: 'Əlçatan', key: 'accessible' });
    }
    
    return featureIcons;
  };

  const featureIcons = getFeatureIcons();
  const RoomTypeIcon = getRoomTypeIcon(room.type);

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary shadow-md",
        !room.is_available && "opacity-60",
        className
      )}
      onClick={() => onSelect(room.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              "bg-gradient-to-br from-blue-100 to-indigo-100"
            )}>
              <RoomTypeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{room.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{getRoomTypeLabel(room.type)}</Badge>
                <Badge variant={room.is_available ? "default" : "secondary"}>
                  {room.is_available ? "Müsait" : "Məşğul"}
                </Badge>
              </div>
            </div>
          </div>
          
          {room.is_available && (
            <CheckCircle className="h-5 w-5 text-green-600" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Room Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Tutum</div>
            <div className="font-medium flex items-center gap-1">
              <Users className="h-4 w-4" />
              {room.capacity} nəfər
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Mərtəbə</div>
            <div className="font-medium flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {room.floor}. mərtəbə
            </div>
          </div>
        </div>

        {/* Building */}
        {room.building && (
          <div className="text-sm">
            <div className="text-muted-foreground">Bina</div>
            <div className="font-medium">{room.building}</div>
          </div>
        )}

        {/* Features */}
        {featureIcons.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Xüsusiyyətlər</div>
            <div className="flex items-center gap-2 flex-wrap">
              {featureIcons.map(({ icon: Icon, label, key }) => (
                <div 
                  key={key}
                  className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs"
                  title={label}
                >
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Equipment */}
        {room.equipment.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Avadanlıq</div>
            <div className="text-sm">
              {room.equipment.slice(0, 3).join(', ')}
              {room.equipment.length > 3 && ` və ${room.equipment.length - 3} digər`}
            </div>
          </div>
        )}

        {/* Booking Rules */}
        {room.booking_rules && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Rezervasiya qaydaları</div>
            <div className="text-xs space-y-1">
              {room.booking_rules.min_duration && (
                <div>Min müddət: {room.booking_rules.min_duration} dəqiqə</div>
              )}
              {room.booking_rules.max_duration && (
                <div>Maks müddət: {room.booking_rules.max_duration} dəqiqə</div>
              )}
              {room.booking_rules.advance_booking_hours && (
                <div>Əvvəlcədən rezervasiya: {room.booking_rules.advance_booking_hours} saat</div>
              )}
              {room.booking_rules.requires_approval && (
                <div className="flex items-center gap-1 text-orange-600">
                  <Settings className="h-3 w-3" />
                  Təsdiq tələb olunur
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(room.id);
              }}
            >
              <Calendar className="h-3 w-3 mr-1" />
              Cədvələ bax
            </Button>
            
            {room.is_available && onBookingClick && (
              <Button 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookingClick(room.id);
                }}
              >
                <Calendar className="h-3 w-3 mr-1" />
                Rezervasiya et
              </Button>
            )}
          </div>
        )}

        {/* Current Status */}
        {room.current_bookings && room.current_bookings.length > 0 && (
          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
            Hal-hazırda {room.current_bookings.length} rezervasiya mövcuddur
          </div>
        )}
      </CardContent>
    </Card>
  );
};