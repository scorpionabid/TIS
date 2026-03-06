import React, { useEffect } from 'react';
import { Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface GenderCountInputProps {
  maleCount: number;
  femaleCount: number;
  onMaleChange: (count: number) => void;
  onFemaleChange: (count: number) => void;
  onTotalChange: (total: number) => void;
  disabled?: boolean;
  errors?: {
    male?: string;
    female?: string;
    total?: string;
  };
}

export const GenderCountInput: React.FC<GenderCountInputProps> = ({
  maleCount,
  femaleCount,
  onMaleChange,
  onFemaleChange,
  onTotalChange,
  disabled = false,
  errors = {},
}) => {
  // Auto-calculate total when male or female count changes
  useEffect(() => {
    const total = maleCount + femaleCount;
    onTotalChange(total);
  }, [maleCount, femaleCount, onTotalChange]);

  const handleMaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    onMaleChange(Math.max(0, value));
  };

  const handleFemaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    onFemaleChange(Math.max(0, value));
  };

  const total = maleCount + femaleCount;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        Şagird sayı (cinsiyyətə görə)
      </Label>

      <div className="grid grid-cols-2 gap-4">
        {/* Male Count */}
        <div className="space-y-2">
          <Label htmlFor="male-count" className="text-sm text-muted-foreground">
            Oğlan 👦
          </Label>
          <Input
            id="male-count"
            type="number"
            min="0"
            max="500"
            value={maleCount}
            onChange={handleMaleChange}
            disabled={disabled}
            className={errors.male ? 'border-red-500' : ''}
            placeholder="0"
          />
          {errors.male && (
            <p className="text-xs text-red-500">{errors.male}</p>
          )}
        </div>

        {/* Female Count */}
        <div className="space-y-2">
          <Label htmlFor="female-count" className="text-sm text-muted-foreground">
            Qız 👧
          </Label>
          <Input
            id="female-count"
            type="number"
            min="0"
            max="500"
            value={femaleCount}
            onChange={handleFemaleChange}
            disabled={disabled}
            className={errors.female ? 'border-red-500' : ''}
            placeholder="0"
          />
          {errors.female && (
            <p className="text-xs text-red-500">{errors.female}</p>
          )}
        </div>
      </div>

      {/* Total Display */}
      <div className="rounded-lg bg-muted/50 p-3 border border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Cəmi şagird sayı:
          </span>
          <span className="text-lg font-bold">
            {total}
          </span>
        </div>
        {total > 0 && (
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Oğlan: {maleCount} ({maleCount > 0 ? Math.round((maleCount / total) * 100) : 0}%)
            </span>
            <span>
              Qız: {femaleCount} ({femaleCount > 0 ? Math.round((femaleCount / total) * 100) : 0}%)
            </span>
          </div>
        )}
      </div>

      {errors.total && (
        <p className="text-xs text-red-500">{errors.total}</p>
      )}
    </div>
  );
};
