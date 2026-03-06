import React from 'react';
import { TeacherRatingTableTab } from '@/components/rating/TeacherRatingTableTab';
import { PerformanceCharts, AdvancedAnalytics } from '@/components/rating/PerformanceCharts';
import { GraduationCap, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const TeacherRating: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-indigo-600" />
          Müəllim Reytinqləri
        </h1>
        <p className="text-muted-foreground">
          Müəllimlərin performans qiymətləndirməsi və çoxşaxəli reytinq analizi
        </p>
      </div>

      <TeacherRatingTableTab />

      <Card className="border-none shadow-sm bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Vizual Analitika
          </CardTitle>
          <CardDescription>
            Reytinq paylanması və performans trendləri
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <PerformanceCharts />
          <AdvancedAnalytics />
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherRating;
