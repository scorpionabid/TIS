import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Calendar,
  Filter,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  List
} from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

interface ScheduleHeaderProps {
  classId?: number;
  teacherId?: number;
  roomId?: number;
  weekStart: Date;
  weekEnd: Date;
  slotsCount: number;
  gridView: 'grid' | 'list';
  viewScale: 'compact' | 'normal' | 'detailed';
  filterType: string;
  showConflicts: boolean;
  onGridViewChange: (view: 'grid' | 'list') => void;
  onViewScaleChange: (scale: 'compact' | 'normal' | 'detailed') => void;
  onFilterTypeChange: (type: string) => void;
}

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  classId,
  teacherId,
  roomId,
  weekStart,
  weekEnd,
  slotsCount,
  gridView,
  viewScale,
  filterType,
  showConflicts,
  onGridViewChange,
  onViewScaleChange,
  onFilterTypeChange
}) => {
  const handleZoomOut = () => {
    onViewScaleChange(
      viewScale === 'compact' ? 'compact' :
      viewScale === 'normal' ? 'compact' : 'normal'
    );
  };

  const handleZoomIn = () => {
    onViewScaleChange(
      viewScale === 'detailed' ? 'detailed' :
      viewScale === 'normal' ? 'detailed' : 'normal'
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Dərs Cədvəli
              {(classId || teacherId || roomId) && (
                <Badge variant="outline">Filtrlənmiş</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {format(weekStart, 'dd MMM', { locale: az })} -{' '}
              {format(weekEnd, 'dd MMM yyyy', { locale: az })}
              {slotsCount > 0 && ` • ${slotsCount} dərs`}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Controls */}
            <div className="flex items-center gap-1 border rounded">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={gridView === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onGridViewChange('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cədvəl görünüşü</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={gridView === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onGridViewChange('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Siyahı görünüşü</TooltipContent>
              </Tooltip>
            </div>

            {/* Scale Controls */}
            <div className="flex items-center gap-1 border rounded">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Kiçilt</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Böyüt</TooltipContent>
              </Tooltip>
            </div>

            {/* Filter */}
            <Select value={filterType} onValueChange={onFilterTypeChange}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün dərslər</SelectItem>
                <SelectItem value="core">Əsas fənlər</SelectItem>
                <SelectItem value="elective">Seçmə fənlər</SelectItem>
                {showConflicts && (
                  <SelectItem value="conflicts">Konfliktlər</SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Actions */}
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              İxrac
            </Button>
            
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Çap
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
