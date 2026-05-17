import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

interface ScheduleEmptyStateProps {
  filterType: string;
  readOnly: boolean;
}

export const ScheduleEmptyState: React.FC<ScheduleEmptyStateProps> = ({
  filterType,
  readOnly
}) => {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Dərs tapılmadı</h3>
        <p className="text-muted-foreground mb-4">
          {filterType === 'all' 
            ? 'Bu həftə üçün dərs cədvəli mövcud deyil'
            : 'Seçilmiş filtrə uyğun dərs tapılmadı'
          }
        </p>
        {!readOnly && (
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Dərs əlavə et
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
