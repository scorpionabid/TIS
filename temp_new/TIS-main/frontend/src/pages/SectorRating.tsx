import React from 'react';
import { SectorRatingTab } from '@/components/rating/SectorRatingTab';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

const SectorRating: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="w-7 h-7" />
          Sektor Reytingləri
        </h1>
        <p className="text-gray-600 mt-2">
          Sektor administratorlarının performans qiymətləndirməsi və reytinq analizi
        </p>
      </div>
      <SectorRatingTab />
    </div>
  );
};
export default SectorRating;
