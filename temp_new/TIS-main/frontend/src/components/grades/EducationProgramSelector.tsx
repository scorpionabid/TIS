import React from 'react';
import { GraduationCap } from 'lucide-react';
import type { EducationProgram, EducationProgramType } from '@/types/gradeTag';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Static education programs - these rarely change
const EDUCATION_PROGRAMS: EducationProgram[] = [
  {
    value: 'umumi',
    label: 'Ümumi təhsil',
    description: 'Standart ümumi təhsil proqramı',
  },
  {
    value: 'xususi',
    label: 'Xüsusi təhsil',
    description: 'Xüsusi ehtiyacları olan şagirdlər üçün təhsil',
  },
  {
    value: 'mektebde_ferdi',
    label: 'Məktəbdə fərdi təhsil',
    description: 'Məktəbdə fərdi təhsil proqramı',
  },
  {
    value: 'evde_ferdi',
    label: 'Evdə fərdi təhsil',
    description: 'Evdə fərdi təhsil proqramı',
  },
];

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
  const programs = EDUCATION_PROGRAMS;

  const selectedProgram = programs.find(p => p.value === value) || null;

  return (
    <div className="space-y-2">
      <Label htmlFor="education-program" className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4" />
        Təhsil proqramı
      </Label>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as EducationProgramType)}
        disabled={disabled}
      >
        <SelectTrigger
          id="education-program"
          className={error ? 'border-red-500' : ''}
        >
          <SelectValue placeholder="Təhsil proqramı seçin" />
        </SelectTrigger>
        <SelectContent>
          {programs.map((program) => (
            <SelectItem key={program.value} value={program.value}>
              {program.label}
            </SelectItem>
          ))}
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
