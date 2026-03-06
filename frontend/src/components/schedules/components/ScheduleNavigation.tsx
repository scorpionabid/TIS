import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScheduleNavigationProps {
  showConflicts: boolean;
  onPreviousWeek: () => void;
  onCurrentWeek: () => void;
  onNextWeek: () => void;
}

export const ScheduleNavigation: React.FC<ScheduleNavigationProps> = ({
  showConflicts,
  onPreviousWeek,
  onCurrentWeek,
  onNextWeek
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
              Əvvəlki həftə
            </Button>
            
            <Button variant="outline" size="sm" onClick={onCurrentWeek}>
              Bu həftə
            </Button>
            
            <Button variant="outline" size="sm" onClick={onNextWeek}>
              Növbəti həftə
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary/20 border border-primary/30 rounded"></div>
              <span>Dərs</span>
            </div>
            {showConflicts && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                <span>Konflikt</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>Bu gün</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
