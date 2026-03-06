import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssessmentFilters as IAssessmentFilters } from '@/services/assessments';
import { FilterBar } from '@/components/common/FilterBar';

interface AssessmentFiltersProps {
  filters: IAssessmentFilters;
  setFilters: React.Dispatch<React.SetStateAction<IAssessmentFilters>>;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

export const AssessmentFilters: React.FC<AssessmentFiltersProps> = ({
  filters,
  setFilters,
  searchTerm,
  setSearchTerm
}) => {
  return (
    <div className="space-y-3">
      <FilterBar>
        <FilterBar.Group>
          <FilterBar.Field>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Qiymətləndirmə axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </FilterBar.Field>
        </FilterBar.Group>
      </FilterBar>

      <div className="filter-panel">
        <div className="filter-panel__grid">
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Qiymətləndirmə növü</span>
            <Select 
              value={filters.assessment_type} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, assessment_type: value as any }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Növ seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                <SelectItem value="ksq">KSQ (Keyfiyyət Standartları)</SelectItem>
                <SelectItem value="bsq">BSQ (Beynəlxalq Standartlar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Status</span>
            <Select 
              value={filters.status || 'all'} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value as any }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Status seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                <SelectItem value="draft">Layihə</SelectItem>
                <SelectItem value="approved">Təsdiqlənib</SelectItem>
                <SelectItem value="rejected">Rədd edilib</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Başlanğıc tarixi</span>
            <Input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Son tarix</span>
            <Input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              className="h-11"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
