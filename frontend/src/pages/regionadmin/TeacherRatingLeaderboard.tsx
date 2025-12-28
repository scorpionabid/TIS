/**
 * TeacherRatingLeaderboard Page
 *
 * Top 20 teachers leaderboard page
 * Features: Scope selection (school/district/region/subject), medal highlights
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { LeaderboardTable } from '../../components/teacher-rating';
import { ArrowLeft, Trophy, Download, RefreshCcw, Calendar } from 'lucide-react';
import { leaderboardService } from '../../services/teacherRating';
import { useToast } from '../../hooks/use-toast';

export default function TeacherRatingLeaderboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [scope, setScope] = useState<'school' | 'district' | 'region' | 'subject'>('region');
  const [scopeId, setScopeId] = useState<number | null>(null);

  // Queries
  const { data: academicYearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => fetch('/api/academic-years').then((res) => res.json()),
  });

  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ['leaderboard', academicYearId, scope, scopeId],
    queryFn: () =>
      leaderboardService.getLeaderboard({
        academic_year_id: academicYearId || academicYearsData?.data?.[0]?.id,
        scope,
        scope_id: scopeId || undefined,
      }),
    enabled: !!academicYearId || !!academicYearsData?.data?.[0]?.id,
  });

  const { data: statisticsData } = useQuery({
    queryKey: ['leaderboard-statistics', academicYearId, scope, scopeId],
    queryFn: () =>
      leaderboardService.getStatistics({
        academic_year_id: academicYearId || academicYearsData?.data?.[0]?.id,
        scope,
        scope_id: scopeId || undefined,
      }),
    enabled: !!academicYearId || !!academicYearsData?.data?.[0]?.id,
  });

  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: () => fetch('/api/institutions?type=school').then((res) => res.json()),
  });

  const { data: districtsData } = useQuery({
    queryKey: ['districts'],
    queryFn: () => fetch('/api/institutions?type=sector').then((res) => res.json()),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => fetch('/api/subjects').then((res) => res.json()),
  });

  const academicYears = academicYearsData?.data || [];
  const leaderboard = leaderboardData?.data?.leaderboard || [];
  const statistics = statisticsData?.data || null;

  // Set initial year
  React.useEffect(() => {
    if (!academicYearId && academicYears.length > 0) {
      setAcademicYearId(academicYears[0].id);
    }
  }, [academicYears, academicYearId]);

  const handleViewProfile = (teacherId: number) => {
    navigate(`/regionadmin/teacher-rating/profile/${teacherId}`);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/teacher-rating/leaderboard/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academic_year_id: academicYearId,
          scope,
          scope_id: scopeId,
        }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leaderboard-${scope}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Uğurlu',
        description: 'Liderlər siyahısı ixrac edildi',
      });
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'İxrac zamanı xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  const getScopeOptions = () => {
    switch (scope) {
      case 'school':
        return schoolsData?.data || [];
      case 'district':
        return districtsData?.data || [];
      case 'subject':
        return subjectsData?.data || [];
      default:
        return [];
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/regionadmin/teacher-rating')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold">Liderlər Siyahısı</h1>
            <p className="text-muted-foreground mt-1">Top 20 ən yüksək reytinqli müəllimlər</p>
          </div>
        </div>

        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          İxrac
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtr Parametrləri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Academic Year */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tədris İli</label>
              <Select
                value={academicYearId?.toString() || ''}
                onValueChange={(value) => setAcademicYearId(Number(value))}
              >
                <SelectTrigger>
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tədris ilini seçin" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year: any) => (
                    <SelectItem key={year.id} value={year.id.toString()}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scope */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Səviyyə</label>
              <Select value={scope} onValueChange={(value: any) => {
                setScope(value);
                setScopeId(null);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="region">Region</SelectItem>
                  <SelectItem value="district">Rayon</SelectItem>
                  <SelectItem value="school">Məktəb</SelectItem>
                  <SelectItem value="subject">Fənn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scope ID (for school/district/subject) */}
            {scope !== 'region' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {scope === 'school' && 'Məktəb'}
                  {scope === 'district' && 'Rayon'}
                  {scope === 'subject' && 'Fənn'}
                </label>
                <Select
                  value={scopeId?.toString() || ''}
                  onValueChange={(value) => setScopeId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {getScopeOptions().map((option: any) => (
                      <SelectItem key={option.id} value={option.id.toString()}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ümumi Müəllim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_teachers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Orta Reytinq
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statistics.average_score?.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ən Yüksək Bal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statistics.highest_score?.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ən Aşağı Bal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statistics.lowest_score?.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard Table */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <LeaderboardTable
          data={leaderboard}
          scope={scope}
          onViewProfile={handleViewProfile}
          showTrend
        />
      )}
    </div>
  );
}
