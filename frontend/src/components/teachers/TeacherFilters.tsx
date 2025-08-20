import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import type { TeacherFilters } from './hooks/useSchoolTeacherManager';

interface TeacherFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: TeacherFilters;
  setFilters: React.Dispatch<React.SetStateAction<TeacherFilters>>;
}

export const TeacherFilters: React.FC<TeacherFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filters,
  setFilters
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
                placeholder="Müəllim adı, email və ya telefon ilə axtarın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Filter Controls */}
          <div className="flex gap-2">
            {/* Department Filter */}
            <Select 
              value={filters.department || 'all'} 
              onValueChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  department: value === 'all' ? undefined : value 
                }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Şöbə seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün şöbələr</SelectItem>
                <SelectItem value="academic">Akademik</SelectItem>
                <SelectItem value="administrative">İnzibati</SelectItem>
                <SelectItem value="support">Dəstək</SelectItem>
                <SelectItem value="science">Elm</SelectItem>
                <SelectItem value="humanities">Humanitar</SelectItem>
                <SelectItem value="arts">İncəsənət</SelectItem>
                <SelectItem value="sports">İdman</SelectItem>
                <SelectItem value="language">Dil</SelectItem>
                <SelectItem value="mathematics">Riyaziyyat</SelectItem>
                <SelectItem value="other">Digər</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Position Filter */}
            <Select 
              value={filters.position || 'all'} 
              onValueChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  position: value === 'all' ? undefined : value 
                }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Vəzifə seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün vəzifələr</SelectItem>
                <SelectItem value="teacher">Müəllim</SelectItem>
                <SelectItem value="senior_teacher">Böyük müəllim</SelectItem>
                <SelectItem value="head_teacher">Sinif rəhbəri</SelectItem>
                <SelectItem value="department_head">Şöbə müdiri</SelectItem>
                <SelectItem value="deputy_principal">Direktor müavini</SelectItem>
                <SelectItem value="principal">Direktor</SelectItem>
                <SelectItem value="substitute">Əvəzedici müəllim</SelectItem>
                <SelectItem value="intern">Stajçı</SelectItem>
                <SelectItem value="coordinator">Koordinator</SelectItem>
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