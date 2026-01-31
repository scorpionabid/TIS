import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeacherRatingTableTab } from '@/components/rating/TeacherRatingTableTab';
import { TeacherSummaryCards, TeacherDetailedStats } from '@/components/rating/TeacherSummaryCards';
import { PerformanceCharts, AdvancedAnalytics } from '@/components/rating/PerformanceCharts';
import { ratingService, RatingItem } from '@/services/ratingService';
import { Users, BarChart3 } from 'lucide-react';

export const TeacherRating: React.FC = () => {
  const [activeTab, setActiveTab] = useState('table');
  const [data, setData] = useState<RatingItem[]>([]);
  const [filteredData, setFilteredData] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  // Load data for charts tab
  useEffect(() => {
    if (activeTab === 'charts') {
      loadChartData();
    }
  }, [activeTab, period]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const response = await ratingService.fetchTeacherRatings(period);
      setData(response.data);
      setFilteredData(response.data);
    } catch (error) {
      console.error('❌ Failed to load chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Müəllim Reytingləri
          </CardTitle>
          <CardDescription>
            Müəllimlərin performans qiymətləndirməsi və reytinq analizi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Cədvəl və Əməliyyatlar
              </TabsTrigger>
              <TabsTrigger value="charts" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Qrafiklər və Analitik
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="table" className="mt-6">
              <TeacherRatingTableTab />
            </TabsContent>
            
            <TabsContent value="charts" className="mt-6">
              <div className="space-y-6">
                <TeacherSummaryCards data={filteredData} period={period} loading={loading} />
                <TeacherDetailedStats data={filteredData} period={period} loading={loading} />
                
                <PerformanceCharts 
                  data={filteredData} 
                  period={period} 
                  loading={loading} 
                />
                
                <AdvancedAnalytics 
                  data={filteredData} 
                  period={period} 
                  loading={loading} 
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
