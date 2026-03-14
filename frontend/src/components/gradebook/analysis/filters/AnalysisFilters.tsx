import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Calendar, Filter, Building2 } from 'lucide-react';

export interface AnalysisFilters {
  institution_id?: number;
  academic_year_id?: number;
  grade_id?: number;
  subject_id?: number;
  status: string;
}

interface AnalysisFiltersComponentProps {
  filters: AnalysisFilters;
  onFiltersChange: (filters: AnalysisFilters) => void;
}

export function AnalysisFiltersComponent({ filters, onFiltersChange }: AnalysisFiltersComponentProps) {
  const handleChange = (key: keyof AnalysisFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Institution Filter */}
          <div className="relative flex-1 min-w-[200px]">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Select
              value={filters.institution_id?.toString() || 'all'}
              onValueChange={(value) => handleChange('institution_id', value === 'all' ? undefined : parseInt(value))}
            >
              <SelectTrigger className="pl-10 h-9 border-slate-200">
                <SelectValue placeholder="Məktəb" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün məktəblər</SelectItem>
                {/* TODO: Populate from API */}
              </SelectContent>
            </Select>
          </div>

          {/* Academic Year Filter */}
          <div className="relative flex-1 min-w-[200px]">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Select
              value={filters.academic_year_id?.toString() || 'all'}
              onValueChange={(value) => handleChange('academic_year_id', value === 'all' ? undefined : parseInt(value))}
            >
              <SelectTrigger className="pl-10 h-9 border-slate-200">
                <SelectValue placeholder="Tədris ili" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün illər</SelectItem>
                <SelectItem value="2025-2026">2025-2026</SelectItem>
                <SelectItem value="2024-2025">2024-2025</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grade Filter */}
          <div className="relative flex-1 min-w-[200px]">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Select
              value={filters.grade_id?.toString() || 'all'}
              onValueChange={(value) => handleChange('grade_id', value === 'all' ? undefined : parseInt(value))}
            >
              <SelectTrigger className="pl-10 h-9 border-slate-200">
                <SelectValue placeholder="Sinif" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün siniflər</SelectItem>
                {/* TODO: Populate from API */}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="relative flex-1 min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Select
              value={filters.status}
              onValueChange={(value) => handleChange('status', value)}
            >
              <SelectTrigger className="pl-10 h-9 border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="archived">Arxiv</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
