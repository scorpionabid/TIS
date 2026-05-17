import React from 'react';
import { SchoolAdminRatingTab } from '@/components/rating/SchoolAdminRatingTab';
import { GraduationCap } from 'lucide-react';

export const SchoolAdminRating: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GraduationCap className="w-7 h-7" />
          Direktor Reytingləri
        </h1>
        <p className="text-gray-600 mt-2">
          Məktəb rəhbərlərinin performans qiymətləndirməsi və reytinq analizi
        </p>
      </div>
      <SchoolAdminRatingTab />
    </div>
  );
};

export default SchoolAdminRating;
