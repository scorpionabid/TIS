import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, Building2, TrendingUp, Award } from 'lucide-react';
import { ratingService, RatingItem } from '@/services/ratingService';

interface SectorRatingTabProps {
  institutionId?: number;
  academicYearId?: number;
}

export const SectorRatingTab: React.FC<SectorRatingTabProps> = ({
  institutionId,
  academicYearId
}) => {
  const [data, setData] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    loadData();
  }, [period, institutionId, academicYearId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await ratingService.getAll({
        period,
        institution_id: institutionId,
        academic_year_id: academicYearId,
        user_role: 'sektoradmin'
      });
      setData(response.data.data || []);
    } catch (error) {
      console.error('Error loading sector ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRating = async (userId: number) => {
    try {
      await ratingService.calculate(userId, {
        academic_year_id: academicYearId,
        period
      });
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error calculating rating:', error);
    }
  };

  const getRatingColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-blue-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getRatingBadge = (score: number) => {
    if (score >= 90) return { text: 'Əla', variant: 'default' as const };
    if (score >= 80) return { text: 'Yaxşı', variant: 'secondary' as const };
    if (score >= 70) return { text: 'Orta', variant: 'outline' as const };
    if (score >= 60) return { text: 'Zəif', variant: 'destructive' as const };
    return { text: 'Çox Zəif', variant: 'destructive' as const };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ümumi Sektor</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
            <p className="text-xs text-muted-foreground">Sektor administratoru</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Reytinq</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.length > 0 
                ? (data.reduce((sum, item) => sum + (item.overall_score || 0), 0) / data.length).toFixed(1)
                : '0'
              }
            </div>
            <p className="text-xs text-muted-foreground">Ümumi bal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ən Yüksək</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.length > 0 
                ? Math.max(...data.map(item => item.overall_score || 0)).toFixed(1)
                : '0'
              }
            </div>
            <p className="text-xs text-muted-foreground">Maksimum bal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hesablanmış</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.filter(item => item.status === 'published').length}
            </div>
            <p className="text-xs text-muted-foreground">Aktiv reytinq</p>
          </CardContent>
        </Card>
      </div>

      {/* Rating List */}
      <div className="space-y-4">
        {data.map((item) => {
          const badge = getRatingBadge(item.overall_score || 0);
          
          return (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.user?.full_name || 'Bilinməyən'}</h3>
                      <p className="text-sm text-muted-foreground">{item.user?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold">{item.overall_score?.toFixed(1) || '0'}</div>
                      <Badge variant={badge.variant}>{badge.text}</Badge>
                    </div>
                    
                    <div className="w-32">
                      <Progress 
                        value={item.overall_score || 0} 
                        className="h-2"
                      />
                    </div>
                    
                    <Button
                      onClick={() => calculateRating(item.user_id)}
                      variant="outline"
                      size="sm"
                    >
                      Hesabla
                    </Button>
                  </div>
                </div>
                
                {/* Score Breakdown */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Task</div>
                    <div className="font-semibold">{item.task_score?.toFixed(1) || '0'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Survey</div>
                    <div className="font-semibold">{item.survey_score?.toFixed(1) || '0'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Manual</div>
                    <div className="font-semibold">{item.manual_score?.toFixed(1) || '0'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {data.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sektor administratoru tapılmadı</h3>
              <p className="text-muted-foreground">Bu dövr üçün heç bir sektor administratoru reytinqi mövcud deyil.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
