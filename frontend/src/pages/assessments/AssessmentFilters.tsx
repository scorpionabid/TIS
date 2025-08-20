import React from 'react';
import { Filter, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssessmentFilters as IAssessmentFilters } from '@/services/assessments';

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Filtrlər</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="assessment-type">Qiymətləndirmə Növü</Label>
            <Select 
              value={filters.assessment_type} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, assessment_type: value as any }))}
            >
              <SelectTrigger>
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
            <Label htmlFor="status">Status</Label>
            <Select 
              value={filters.status || 'all'} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value as any }))}
            >
              <SelectTrigger>
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
            <Label htmlFor="date-from">Başlanğıc tarixi</Label>
            <Input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-to">Son tarix</Label>
            <Input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Qiymətləndirmə axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};