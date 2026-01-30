import React from 'react';
import { SchoolAdminRatingTab } from '@/components/rating/SchoolAdminRatingTab';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

export const SchoolAdminRating: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Direktor Reytingləri
          </CardTitle>
          <CardDescription>
            Məktəb rəhbərlərinin performans qiymətləndirməsi və reytinq analizi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchoolAdminRatingTab />
        </CardContent>
      </Card>
    </div>
  );
};
