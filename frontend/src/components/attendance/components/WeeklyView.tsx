import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, PieChart } from 'lucide-react';

interface WeeklyViewProps {
  attendanceStats: any;
  statsLoading: boolean;
}

export const WeeklyView: React.FC<WeeklyViewProps> = ({ 
  attendanceStats, 
  statsLoading 
}) => {
  if (statsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-pulse">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Həftəlik məlumatlar yüklənir...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!attendanceStats?.weekly_data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Həftəlik məlumat hələ ki mövcud deyil
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Davamiyyət</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceStats.weekly_average?.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Bu həftə üçün</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ən Yaxşı Gün</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceStats.best_day?.day}
            </div>
            <p className="text-xs text-muted-foreground">
              {attendanceStats.best_day?.rate}% davamiyyət
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cəmi İştirakçı</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceStats.total_participants}
            </div>
            <p className="text-xs text-muted-foreground">Bu həftə</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Günlük Davamiyyət</CardTitle>
          <CardDescription>
            Bu həftə üçün günlük davamiyyət statistikası
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {attendanceStats.weekly_data.map((day: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-16 text-sm font-medium">
                    {day.day}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {day.date}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${day.rate}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12">{day.rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};