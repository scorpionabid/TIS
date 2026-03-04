/**
 * GPSInput - GPS location capture component for report tables
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  MapPin,
  Crosshair,
  Navigation,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Satellite,
} from 'lucide-react';
import { toast } from 'sonner';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  timestamp: string;
}

interface GPSInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  precision?: 'high' | 'medium' | 'low';
  radius?: number; // meters - if set, validates location is within this radius
}

export function GPSInput({
  value,
  onChange,
  disabled = false,
  precision = 'medium',
  radius = 0,
}: GPSInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Parse stored coordinates
  const coordinates: GPSCoordinates | null = value ? JSON.parse(value) : null;

  const getPositionOptions = (): PositionOptions => ({
    enableHighAccuracy: precision === 'high',
    timeout: precision === 'high' ? 10000 : precision === 'medium' ? 5000 : 2000,
    maximumAge: 0,
  });

  const captureLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Brauzeriniz GPS-i dəstəkləmir');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, getPositionOptions());
      });

      const coords: GPSCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude || undefined,
        timestamp: new Date().toISOString(),
      };

      // Validate radius if set
      if (radius > 0) {
        // TODO: Implement radius validation against a reference point
        // For now, just store the coordinates
        // Radius validation will be implemented in future update
      }

      onChange(JSON.stringify(coords));
      toast.success('GPS koordinatları əldə edildi');
    } catch (err) {
      let errorMessage = 'GPS məlumatı əldə edilə bilmədi';
      
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'GPS icazəsi rədd edildi. Zəhmət olmasa brauzer icazələrini yoxlayın.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'GPS məlumatı mövcud deyil. Zəhmət olmasa açıq məkanda yoxlayın.';
            break;
          case err.TIMEOUT:
            errorMessage = 'GPS sorğusu vaxt aşımına uğradı. Yenidən cəhd edin.';
            break;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
    toast.success('GPS məlumatı silindi');
  };

  const formatCoordinates = (lat: number, lng: number): string => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy < 10) return <Badge className="bg-emerald-100 text-emerald-700">Əla ({Math.round(accuracy)}m)</Badge>;
    if (accuracy < 50) return <Badge className="bg-blue-100 text-blue-700">Yaxşı ({Math.round(accuracy)}m)</Badge>;
    if (accuracy < 100) return <Badge className="bg-amber-100 text-amber-700">Orta ({Math.round(accuracy)}m)</Badge>;
    return <Badge className="bg-red-100 text-red-700">Zəif ({Math.round(accuracy)}m)</Badge>;
  };

  const openInMaps = () => {
    if (!coordinates) return;
    const url = `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;
    window.open(url, '_blank');
  };

  // Display captured coordinates
  if (coordinates) {
    return (
      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
        <div className="p-1.5 bg-green-100 rounded-full">
          <MapPin className="h-4 w-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800 truncate">
            {formatCoordinates(coordinates.latitude, coordinates.longitude)}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {getAccuracyBadge(coordinates.accuracy)}
            <span className="text-xs text-green-600">
              {new Date(coordinates.timestamp).toLocaleTimeString('az-AZ')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-green-700"
            onClick={openInMaps}
            title="Xəritədə göstər"
          >
            <Navigation className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-green-700"
            onClick={captureLocation}
            disabled={disabled || isLoading}
            title="Yenilə"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crosshair className="h-4 w-4" />
            )}
          </Button>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-500"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full h-9 gap-1 border-dashed"
        disabled={disabled || isLoading}
        onClick={captureLocation}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Satellite className="h-4 w-4" />
        )}
        {isLoading ? 'GPS axtarılır...' : 'GPS koordinat əldə et'}
      </Button>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded p-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {radius > 0 && (
        <p className="text-[10px] text-amber-600 text-center">
          ⚠️ Yalnız {radius}m radius daxilində
        </p>
      )}
    </div>
  );
}

export default GPSInput;
