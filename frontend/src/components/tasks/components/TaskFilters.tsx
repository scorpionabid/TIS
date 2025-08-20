import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { SchoolTaskFilters } from '@/services/schoolAdmin';

interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: SchoolTaskFilters;
  onFiltersChange: (filters: SchoolTaskFilters) => void;
  viewMode: 'board' | 'list';
  onViewModeChange: (mode: 'board' | 'list') => void;
  className?: string;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  className
}) => {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tapşırıq adı və ya açıqlama ilə axtarın..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select 
              value={filters.status || 'all'} 
              onValueChange={(value) => 
                onFiltersChange({ 
                  ...filters, 
                  status: value === 'all' ? undefined : value as any 
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün statuslar</SelectItem>
                <SelectItem value="pending">Gözləyən</SelectItem>
                <SelectItem value="in_progress">Davam edir</SelectItem>
                <SelectItem value="completed">Tamamlandı</SelectItem>
                <SelectItem value="on_hold">Gözləyir</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={filters.priority || 'all'} 
              onValueChange={(value) => 
                onFiltersChange({ 
                  ...filters, 
                  priority: value === 'all' ? undefined : value as any 
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Prioritet seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün prioritetlər</SelectItem>
                <SelectItem value="high">Yüksək</SelectItem>
                <SelectItem value="medium">Orta</SelectItem>
                <SelectItem value="low">Aşağı</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex rounded-md" role="group">
              <Button
                variant={viewMode === 'board' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewModeChange('board')}
                className="rounded-r-none"
              >
                Board
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className="rounded-l-none"
              >
                List
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};