/**
 * TeacherRatingProfile Page
 *
 * Detailed teacher rating profile page
 * Features: Header, component breakdown, progress chart, year comparison
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  TeacherRatingHeader,
  RatingBreakdownChart,
  ComponentScoreCard,
  RatingProgressChart,
} from '../../components/teacher-rating';
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Award,
  Download,
  RefreshCcw,
} from 'lucide-react';
import {
  teacherRatingService,
  ratingCalculationService,
} from '../../services/teacherRating';
import type { TeacherRatingProfile, RatingResult } from '../../types/teacherRating';

export default function TeacherRatingProfile() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);

  // Queries
  const { data: teacherData, isLoading: teacherLoading } = useQuery({
    queryKey: ['teacher-rating-profile', teacherId],
    queryFn: () => teacherRatingService.getById(Number(teacherId)),
    enabled: !!teacherId,
  });

  const { data: academicYearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => fetch('/api/academic-years').then((res) => res.json()),
  });

  const { data: ratingResultData, isLoading: ratingLoading } = useQuery({
    queryKey: ['teacher-rating-result', teacherId, selectedYearId],
    queryFn: () =>
      ratingCalculationService.getRatingResult(
        Number(teacherId),
        selectedYearId || academicYearsData?.data?.[0]?.id
      ),
    enabled: !!teacherId && (!!selectedYearId || !!academicYearsData?.data?.[0]?.id),
  });

  const { data: comparisonData } = useQuery({
    queryKey: ['teacher-rating-comparison', teacherId],
    queryFn: () => ratingCalculationService.compareYears(Number(teacherId)),
    enabled: !!teacherId,
  });

  const teacher: TeacherRatingProfile | null = teacherData?.data || null;
  const ratingResult: RatingResult | null = ratingResultData?.data || null;
  const comparison = comparisonData?.data?.comparison || [];
  const academicYears = academicYearsData?.data || [];

  // Set initial year
  React.useEffect(() => {
    if (!selectedYearId && academicYears.length > 0) {
      setSelectedYearId(academicYears[0].id);
    }
  }, [academicYears, selectedYearId]);

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/teacher-rating/teachers/${teacherId}/export`, {
        method: 'GET',
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `teacher-rating-${teacher?.utis_code}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  if (teacherLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Müəllim tapılmadı</p>
          <Button className="mt-4" onClick={() => navigate('/regionadmin/teacher-rating')}>
            Geri qayıt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/regionadmin/teacher-rating')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri
      </Button>

      {/* Teacher Header */}
      <TeacherRatingHeader
        teacher={teacher}
        latestRating={ratingResult}
        onEdit={() => navigate(`/regionadmin/teacher-rating/edit/${teacherId}`)}
        onExport={handleExport}
        canEdit
        canExport
      />

      {/* Academic Year Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Tədris İli Seçimi</CardTitle>
            <Select
              value={selectedYearId?.toString() || ''}
              onValueChange={(value) => setSelectedYearId(Number(value))}
            >
              <SelectTrigger className="w-[250px]">
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
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Ümumi Baxış</TabsTrigger>
          <TabsTrigger value="components">Komponentlər</TabsTrigger>
          <TabsTrigger value="progress">Tərəqqi</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {ratingLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : ratingResult ? (
            <>
              {/* Breakdown Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Reytinq Komponentləri</CardTitle>
                </CardHeader>
                <CardContent>
                  <RatingBreakdownChart breakdown={ratingResult.breakdown} height={350} />
                </CardContent>
              </Card>

              {/* Rankings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Məktəb Sırası
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {ratingResult.rank_school === 1 && <span className="text-2xl">🥇</span>}
                      {ratingResult.rank_school === 2 && <span className="text-2xl">🥈</span>}
                      {ratingResult.rank_school === 3 && <span className="text-2xl">🥉</span>}
                      <div className="text-2xl font-bold">
                        #{ratingResult.rank_school || 'N/A'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Rayon Sırası
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {ratingResult.rank_district === 1 && <span className="text-2xl">🥇</span>}
                      {ratingResult.rank_district === 2 && <span className="text-2xl">🥈</span>}
                      {ratingResult.rank_district === 3 && <span className="text-2xl">🥉</span>}
                      <div className="text-2xl font-bold">
                        #{ratingResult.rank_district || 'N/A'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Region Sırası
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {ratingResult.rank_region === 1 && <span className="text-2xl">🥇</span>}
                      {ratingResult.rank_region === 2 && <span className="text-2xl">🥈</span>}
                      {ratingResult.rank_region === 3 && <span className="text-2xl">🥉</span>}
                      <div className="text-2xl font-bold">
                        #{ratingResult.rank_region || 'N/A'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Fənn Sırası
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {ratingResult.rank_subject === 1 && <span className="text-2xl">🥇</span>}
                      {ratingResult.rank_subject === 2 && <span className="text-2xl">🥈</span>}
                      {ratingResult.rank_subject === 3 && <span className="text-2xl">🥉</span>}
                      <div className="text-2xl font-bold">
                        #{ratingResult.rank_subject || 'N/A'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Seçilmiş tədris ili üçün reytinq məlumatı tapılmadı
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Components Tab */}
        <TabsContent value="components" className="space-y-6">
          {ratingResult ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ComponentScoreCard
                component="academic"
                score={ratingResult.breakdown.academic}
                maxWeight={30}
              />
              <ComponentScoreCard
                component="lesson_observation"
                score={ratingResult.breakdown.lesson_observation}
                maxWeight={20}
              />
              <ComponentScoreCard
                component="olympiad"
                score={ratingResult.breakdown.olympiad}
                maxWeight={15}
              />
              <ComponentScoreCard
                component="assessment"
                score={ratingResult.breakdown.assessment}
                maxWeight={15}
              />
              <ComponentScoreCard
                component="certificate"
                score={ratingResult.breakdown.certificate}
                maxWeight={10}
              />
              <ComponentScoreCard
                component="award"
                score={ratingResult.breakdown.award}
                maxWeight={10}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Komponent məlumatı yoxdur
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          {comparison.length > 0 ? (
            <RatingProgressChart data={comparison} height={400} showComponents />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Müqayisə üçün kifayət qədər məlumat yoxdur
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
