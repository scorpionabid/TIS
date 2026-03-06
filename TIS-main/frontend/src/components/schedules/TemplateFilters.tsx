import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TemplateFiltersProps {
  filterType: string;
  setFilterType: (type: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedGradeLevel?: number;
}

export const TemplateFilters: React.FC<TemplateFiltersProps> = ({
  filterType,
  setFilterType,
  searchTerm,
  setSearchTerm,
  selectedGradeLevel
}) => {
  return (
    <div className="flex items-center gap-4">
      {/* Template Type Filter */}
      <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Şablon tipini seçin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Bütün Şablonlar</SelectItem>
          <SelectItem value="weekly">Həftəlik</SelectItem>
          <SelectItem value="daily">Günlük</SelectItem>
          <SelectItem value="exam">İmtahan</SelectItem>
          <SelectItem value="custom">Xüsusi</SelectItem>
        </SelectContent>
      </Select>

      {/* Search Input */}
      <Input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Şablon axtarın..."
        className="w-64"
      />

      {/* Grade Level Badge */}
      {selectedGradeLevel && (
        <Badge variant="outline">
          {selectedGradeLevel}-ci sinif üçün filtrlənir
        </Badge>
      )}
    </div>
  );
};