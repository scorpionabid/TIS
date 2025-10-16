import React, { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { gradeTagService } from '@/services/gradeTagService';
import type { EducationProgram, EducationProgramType } from '@/types/gradeTag';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface EducationProgramSelectorProps {
  value: EducationProgramType;
  onChange: (value: EducationProgramType) => void;
  disabled?: boolean;
  error?: string;
}

export const EducationProgramSelector: React.FC<EducationProgramSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const [programs, setPrograms] = useState<EducationProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const data = await gradeTagService.getEducationPrograms();
      setPrograms(data);
    } catch (error) {
      console.error('Təhsil proqramları yükləmə xətası:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedProgram = programs && programs.length > 0 ? programs.find(p => p.value === value) : null;

  return (
    <div className="space-y-2">
      <Label htmlFor="education-program" className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4" />
        Təhsil proqramı
      </Label>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as EducationProgramType)}
        disabled={disabled || loading}
      >
        <SelectTrigger
          id="education-program"
          className={error ? 'border-red-500' : ''}
        >
          <SelectValue placeholder={loading ? "Yüklənir..." : "Təhsil proqramı seçin"} />
        </SelectTrigger>
        <SelectContent>
          {programs && programs.length > 0 ? programs.map((program) => (
            <SelectItem key={program.value} value={program.value}>
              <div className="flex flex-col items-start">
                <span className="font-medium">{program.label}</span>
                <span className="text-xs text-muted-foreground">
                  {program.description}
                </span>
              </div>
            </SelectItem>
          )) : (
            <div className="p-2 text-xs text-muted-foreground text-center">
              Proqramlar yüklənmədi
            </div>
          )}
        </SelectContent>
      </Select>

      {selectedProgram && !error && (
        <p className="text-xs text-muted-foreground">
          {selectedProgram.description}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};
