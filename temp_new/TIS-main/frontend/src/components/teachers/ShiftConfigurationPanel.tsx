import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, RotateCcw, Save, Settings2, X } from 'lucide-react';
import { useShiftConfig, ShiftConfiguration } from '@/hooks/useShiftConfig';

interface ShiftConfigurationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftConfigurationPanel: React.FC<ShiftConfigurationPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const { config, updateShiftConfig, resetToDefaults } = useShiftConfig();
  const [localConfig, setLocalConfig] = useState<ShiftConfiguration>(config);

  // Update local config when prop changes
  React.useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleShift1StartTimeChange = (value: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      shift1: { ...prev.shift1, startTime: value },
    }));
  };

  const handleShift1PeriodCountChange = (value: string) => {
    const count = parseInt(value);
    setLocalConfig((prev) => ({
      ...prev,
      shift1: { ...prev.shift1, periodCount: count },
    }));
  };

  const handleShift2StartTimeChange = (value: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      shift2: { ...prev.shift2, startTime: value },
    }));
  };

  const handleShift2PeriodCountChange = (value: string) => {
    const count = parseInt(value);
    setLocalConfig((prev) => ({
      ...prev,
      shift2: { ...prev.shift2, periodCount: count },
    }));
  };

  const handleSave = () => {
    updateShiftConfig('shift1', {
      startTime: localConfig.shift1.startTime,
      periodCount: localConfig.shift1.periodCount,
    });
    updateShiftConfig('shift2', {
      startTime: localConfig.shift2.startTime,
      periodCount: localConfig.shift2.periodCount,
    });
    onClose();
  };

  const handleReset = () => {
    resetToDefaults();
    setLocalConfig(config);
  };

  // Calculate end times for display
  const calculateEndTime = (startTime: string, periodCount: number): string => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const totalMinutes = startHour * 60 + startMin + periodCount * 45 + (periodCount - 1) * 5;
    const endHour = Math.floor(totalMinutes / 60);
    const endMin = totalMinutes % 60;
    return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  };

  const shift1EndTime = calculateEndTime(localConfig.shift1.startTime, localConfig.shift1.periodCount);
  const shift2EndTime = calculateEndTime(localConfig.shift2.startTime, localConfig.shift2.periodCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Növbə Saatları Konfiqurasiyası
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Shift 1 Configuration */}
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-blue-800">I NÖVBƏ</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shift1-start">Başlama Saatı</Label>
                <Input
                  id="shift1-start"
                  type="time"
                  value={localConfig.shift1.startTime}
                  onChange={(e) => handleShift1StartTimeChange(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift1-count">Dərs Saatı Sayı</Label>
                <Select
                  value={localConfig.shift1.periodCount.toString()}
                  onValueChange={handleShift1PeriodCountChange}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} dərs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-blue-700 bg-blue-100 rounded px-3 py-2">
              <span>Bitmə saatı (təxmini):</span>
              <span className="font-semibold">{shift1EndTime}</span>
            </div>

            <div className="text-xs text-blue-600">
              Hər dərs 45 dəqiqə, fasilə 5 dəqiqə hesablanır
            </div>
          </div>

          {/* Shift 2 Configuration */}
          <div className="space-y-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-orange-600" />
              <h3 className="font-semibold text-orange-800">II NÖVBƏ</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shift2-start">Başlama Saatı</Label>
                <Input
                  id="shift2-start"
                  type="time"
                  value={localConfig.shift2.startTime}
                  onChange={(e) => handleShift2StartTimeChange(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift2-count">Dərs Saatı Sayı</Label>
                <Select
                  value={localConfig.shift2.periodCount.toString()}
                  onValueChange={handleShift2PeriodCountChange}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} dərs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-orange-700 bg-orange-100 rounded px-3 py-2">
              <span>Bitmə saatı (təxmini):</span>
              <span className="font-semibold">{shift2EndTime}</span>
            </div>

            <div className="text-xs text-orange-600">
              Hər dərs 45 dəqiqə, fasilə 5 dəqiqə hesablanır
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleReset}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Sıfırla
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Ləğv Et
              </Button>
              <Button onClick={handleSave} className="bg-primary">
                <Save className="h-4 w-4 mr-2" />
                Yadda Saxla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftConfigurationPanel;
