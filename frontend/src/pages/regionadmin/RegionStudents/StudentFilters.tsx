import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';

interface FilterOption {
  id: number;
  name: string;
  parent_id?: number;
}

interface StudentFiltersProps {
  search: string;
  sectorId: number | undefined;
  schoolId: number | undefined;
  gradeLevel: string;
  isActive: string;
  sectors: FilterOption[];
  schools: FilterOption[];
  hasActiveFilters: boolean;
  onSearchChange:  (v: string) => void;
  onSectorChange:  (id: number | undefined) => void;
  onSchoolChange:  (id: number | undefined) => void;
  onGradeChange:   (v: string) => void;
  onStatusChange:  (v: string) => void;
  onClearFilters:  () => void;
}

const GRADE_LEVELS = Array.from({ length: 12 }, (_, i) => String(i + 1));

export function StudentFilters({
  search,
  sectorId,
  schoolId,
  gradeLevel,
  isActive,
  sectors,
  schools,
  hasActiveFilters,
  onSearchChange,
  onSectorChange,
  onSchoolChange,
  onGradeChange,
  onStatusChange,
  onClearFilters,
}: StudentFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[220px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Ad, soyad, UTIS kodu..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Sector */}
      <Select
        value={sectorId ? String(sectorId) : 'all'}
        onValueChange={(v) => onSectorChange(v === 'all' ? undefined : Number(v))}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Sektor seçin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Bütün sektorlar</SelectItem>
          {sectors.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* School */}
      <Select
        value={schoolId ? String(schoolId) : 'all'}
        onValueChange={(v) => onSchoolChange(v === 'all' ? undefined : Number(v))}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Məktəb seçin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Bütün məktəblər</SelectItem>
          {schools.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Grade level */}
      <Select
        value={gradeLevel || 'all'}
        onValueChange={(v) => onGradeChange(v === 'all' ? '' : v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sinif səviyyəsi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Bütün siniflər</SelectItem>
          {GRADE_LEVELS.map((g) => (
            <SelectItem key={g} value={g}>
              {g}-ci sinif
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={isActive || 'all'}
        onValueChange={(v) => onStatusChange(v === 'all' ? '' : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Hamısı</SelectItem>
          <SelectItem value="true">Aktiv</SelectItem>
          <SelectItem value="false">Qeyri-aktiv</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1.5">
          <X className="h-4 w-4" />
          Filtri sıfırla
        </Button>
      )}
    </div>
  );
}
