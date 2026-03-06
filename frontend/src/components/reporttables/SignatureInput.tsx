/**
 * SignatureInput - Electronic signature capture component for report tables
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  PenLine,
  X,
  Check,
  RotateCcw,
  Eye,
  PenTool,
} from 'lucide-react';
import { toast } from 'sonner';

interface SignatureInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
}

export function SignatureInput({
  value,
  onChange,
  disabled = false,
  width = 400,
  height = 200,
}: SignatureInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasSignature, setHasSignature] = useState(false);

  // Load existing signature
  useEffect(() => {
    if (value && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            setHasSignature(true);
          }
        }
      };
      img.src = value;
    }
  }, [value, isOpen]);

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      const coords = getCoordinates(e);
      ctx.moveTo(coords.x, coords.y);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
    }
  }, [getCoordinates]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      const coords = getCoordinates(e);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  }, [isDrawing, getCoordinates]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setHasSignature(true);
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  }, []);

  const saveSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasSignature) {
      toast.error('İmza boşdur');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
    setIsOpen(false);
    toast.success('İmza yadda saxlanıldı');
  }, [hasSignature, onChange]);

  const handleRemove = () => {
    onChange(null);
    toast.success('İmza silindi');
  };

  // Signature thumbnail preview
  if (value && !isOpen) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
        <div className="w-16 h-10 bg-white border rounded overflow-hidden">
          <img 
            src={value} 
            alt="Signature" 
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">İmza atıldı</p>
          <p className="text-xs text-gray-500">Elektron imza</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsOpen(true)}
          >
            <Eye className="h-4 w-4" />
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
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full h-9 gap-1 border-dashed"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        <PenLine className="h-4 w-4" />
        İmza at
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Elektron imza
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-700">
              Siçan və ya barmaq ilə imza sahəsində imza atın
            </div>

            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white touch-none"
              style={{ width: Math.min(width, 400), height: Math.min(height, 200), margin: '0 auto' }}
            >
              <canvas
                ref={canvasRef}
                width={Math.min(width, 400)}
                height={Math.min(height, 200)}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="cursor-crosshair block"
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={clearSignature}
                className="gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Təmizlə
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  Ləğv et
                </Button>
                <Button
                  size="sm"
                  onClick={saveSignature}
                  disabled={!hasSignature}
                  className="gap-1"
                >
                  <Check className="h-4 w-4" />
                  Yadda saxla
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SignatureInput;
