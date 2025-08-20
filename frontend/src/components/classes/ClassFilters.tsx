import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import type { ClassFilters } from './hooks/useSchoolClassManager';

interface ClassFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: ClassFilters;
  setFilters: React.Dispatch<React.SetStateAction<ClassFilters>>;
  getCurrentAcademicYear: () => string;
}

export const ClassFilters: React.FC<ClassFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  getCurrentAcademicYear
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sinif adı, otaq və ya müəllim adı ilə axtarın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Filter Controls */}
          <div className="flex gap-2">
            {/* Grade Level Filter */}
            <Select 
              value={filters.grade_level?.toString() || 'all'} 
              onValueChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  grade_level: value === 'all' ? undefined : parseInt(value) 
                }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Səviyyə seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün səviyyələr</SelectItem>
                <SelectItem value="0">Anasinifi</SelectItem>
                {[...Array(11)].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {`${i + 1}. sinif`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Academic Year Filter */}
            <Select 
              value={filters.academic_year || 'current'} 
              onValueChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  academic_year: value === 'current' ? getCurrentAcademicYear() : value 
                }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Akademik il" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Cari il</SelectItem>
                <SelectItem value={getCurrentAcademicYear()}>{getCurrentAcademicYear()}</SelectItem>
                <SelectItem value={`${new Date().getFullYear() - 1}-${new Date().getFullYear()}`}>
                  {`${new Date().getFullYear() - 1}-${new Date().getFullYear()}`}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select 
              value={filters.is_active?.toString() || 'all'} 
              onValueChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  is_active: value === 'all' ? undefined : value === 'true' 
                }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün statuslar</SelectItem>
                <SelectItem value="true">Aktiv</SelectItem>
                <SelectItem value="false">Passiv</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};