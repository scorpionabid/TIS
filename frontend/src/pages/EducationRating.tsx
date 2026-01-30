import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectorRatingTab } from '@/components/rating/SectorRatingTab';
import { SchoolAdminRatingTab } from '@/components/rating/SchoolAdminRatingTab';
import { TeacherRatingTableTab } from '@/components/rating/TeacherRatingTableTab';

export const EducationRating: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Təhsil Reytingi</h1>
        <p className="text-gray-600 mt-2">Sektor, məktəb rəhbəri və müəllimlərin performans qiymətləndirməsi</p>
      </div>
      
      <Tabs defaultValue="sectors" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sectors">Sektor</TabsTrigger>
          <TabsTrigger value="school-admins">Məktəb Rəhbəri</TabsTrigger>
          <TabsTrigger value="teachers">Müəllim</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sectors">
          <SectorRatingTab />
        </TabsContent>
        <TabsContent value="school-admins">
          <SchoolAdminRatingTab />
        </TabsContent>
        <TabsContent value="teachers">
          <TeacherRatingTableTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EducationRating;
