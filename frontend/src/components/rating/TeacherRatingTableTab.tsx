import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, GraduationCap, TrendingUp, Award, Search, Filter } from 'lucide-react';
import { ratingService, RatingItem } from '@/services/ratingService';

interface TeacherRatingTableTabProps {
  institutionId?: number;
  academicYearId?: number;
}

export const TeacherRatingTableTab: React.FC<TeacherRatingTableTabProps> = ({
  institutionId,
  academicYearId
}) => {
  const [data, setData] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

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
        user_role: 'müəllim'
      });
      setData(response.data.data || []);
    } catch (error) {
      console.error('Error loading teacher ratings:', error);
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

  const calculateAllRatings = async () => {
    try {
      await ratingService.calculateAll({
        academic_year_id: academicYearId,
        period
      });
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error calculating all ratings:', error);
    }
  };

  const getRatingBadge = (score: number) => {
    if (score >= 90) return { text: 'Əla', variant: 'default' as const };
    if (score >= 80) return { text: 'Yaxşı', variant: 'secondary' as const };
    if (score >= 70) return { text: 'Orta', variant: 'outline' as const };
    if (score >= 60) return { text: 'Zəif', variant: 'destructive' as const };
    return { text: 'Çox Zəif', variant: 'destructive' as const };
  };

  const filteredData = data.filter(item => {
    const matchesSearch = item.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || item.user?.roles?.includes(filterRole);
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Müəllim axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Bütün Rollar</option>
            <option value="müəllim">Müəllim</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={calculateAllRatings}
            variant="default"
            size="sm"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Bütününü Hesabla
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ümumi Müəllim</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.length}</div>
            <p className="text-xs text-muted-foreground">Müəllim</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Reytinq</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredData.length > 0 
                ? (filteredData.reduce((sum, item) => sum + (item.overall_score || 0), 0) / filteredData.length).toFixed(1)
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
              {filteredData.length > 0 
                ? Math.max(...filteredData.map(item => item.overall_score || 0)).toFixed(1)
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
              {filteredData.filter(item => item.status === 'published').length}
            </div>
            <p className="text-xs text-muted-foreground">Aktiv reytinq</p>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Rating Table */}
      <Card>
        <CardHeader>
          <CardTitle>Müəllim Reytinq Cədvəli</CardTitle>
          <CardDescription>
            Müəllimlərin performans qiymətləndirməsi və reytinq nəticələri
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Müəllim</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Müəssisə</th>
                  <th className="text-center p-3 font-medium">Task</th>
                  <th className="text-center p-3 font-medium">Survey</th>
                  <th className="text-center p-3 font-medium">Manual</th>
                  <th className="text-center p-3 font-medium">Ümumi</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => {
                  const badge = getRatingBadge(item.overall_score || 0);
                  
                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{item.user?.full_name || 'Bilinməyən'}</div>
                            <div className="text-sm text-gray-500">
                              {item.user?.roles?.join(', ') || 'Rol yoxdur'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {item.user?.email || '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {item.institution?.name || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-medium">{item.task_score?.toFixed(1) || '0'}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-medium">{item.survey_score?.toFixed(1) || '0'}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-medium">{item.manual_score?.toFixed(1) || '0'}</span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="font-bold text-lg">
                            {item.overall_score?.toFixed(1) || '0'}
                          </span>
                          <Badge variant={badge.variant} className="text-xs">
                            {badge.text}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge 
                          variant={item.status === 'published' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {item.status === 'published' ? 'Aktiv' : 'Qaralama'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            onClick={() => calculateRating(item.user_id)}
                            variant="outline"
                            size="sm"
                          >
                            Hesabla
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredData.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Müəllim tapılmadı</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterRole !== 'all' 
                    ? 'Axtarış şərtlərinə uyğun müəllim tapılmadı.'
                    : 'Bu dövr üçün heç bir müəllim reytinqi mövcud deyil.'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
