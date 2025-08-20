import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import type { StudentFilters } from './hooks/useSchoolStudentManager';
import { SchoolClass } from '@/services/schoolAdmin';

interface StudentFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: StudentFilters;
  setFilters: React.Dispatch<React.SetStateAction<StudentFilters>>;
  classes?: SchoolClass[];
}

export const StudentFilters: React.FC<StudentFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  classes
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
                placeholder="Şagird adı, ID və ya email ilə axtarın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Filter Controls */}
          <div className="flex gap-2">
            {/* Class Filter */}
            <Select 
              value={filters.class_id?.toString() || 'all'} 
              onValueChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  class_id: value === 'all' ? undefined : parseInt(value) 
                }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sinif seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün siniflər</SelectItem>
                {classes?.map(cls => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
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

            {/* Enrollment Status Filter */}
            <Select 
              value={filters.enrollment_status || 'all'} 
              onValueChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  enrollment_status: value === 'all' ? undefined : value as any
                }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün statuslar</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Passiv</SelectItem>
                <SelectItem value="transferred">Köçürülmüş</SelectItem>
                <SelectItem value="graduated">Məzun</SelectItem>
              </SelectContent>
            </Select>

            {/* Gender Filter */}
            <Select 
              value={filters.gender || 'all'} 
              onValueChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  gender: value === 'all' ? undefined : value as any
                }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Cins seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                <SelectItem value="male">Kişi</SelectItem>
                <SelectItem value="female">Qadın</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};