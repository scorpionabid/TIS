import React from 'react';
import { SectorRatingTab } from '@/components/rating/SectorRatingTab';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export const SectorRating: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Sektor Reytingləri
          </CardTitle>
          <CardDescription>
            Sektor administratorlarının performans qiymətləndirməsi və reytinq analizi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SectorRatingTab />
        </CardContent>
      </Card>
    </div>
  );
};
