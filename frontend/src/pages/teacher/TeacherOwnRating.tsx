/**
 * TeacherOwnRating Page
 *
 * Teacher's own rating profile page (view-only)
 * Features: Personal rating display, progress tracking, component breakdown
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  TeacherRatingHeader,
  RatingBreakdownChart,
  ComponentScoreCard,
  RatingProgressChart,
} from '../../components/teacher-rating';
import { Calendar, Info, TrendingUp, Award, RefreshCcw } from 'lucide-react';
import { teacherRatingService, ratingCalculationService } from '../../services/teacherRating';
import { useAuthStore } from '../../store/authStore';

export default function TeacherOwnRating() {
  const { user } = useAuthStore();
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);

  // Queries
  const { data: teacherData, isLoading: teacherLoading } = useQuery({
    queryKey: ['teacher-rating-own-profile'],
    queryFn: () =>
      fetch('/api/teacher-rating/teachers/me').then((res) => res.json()),
    enabled: !!user,
  });

  const { data: academicYearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => fetch('/api/academic-years').then((res) => res.json()),
  });

  const { data: ratingResultData, isLoading: ratingLoading } = useQuery({
    queryKey: ['teacher-rating-own-result', selectedYearId],
    queryFn: () =>
      fetch(
        `/api/teacher-rating/teachers/me/result?academic_year_id=${
          selectedYearId || academicYearsData?.data?.[0]?.id
        }`
      ).then((res) => res.json()),
    enabled: !!selectedYearId || !!academicYearsData?.data?.[0]?.id,
  });

  const { data: comparisonData } = useQuery({
    queryKey: ['teacher-rating-own-comparison'],
    queryFn: () =>
      fetch('/api/teacher-rating/teachers/me/comparison').then((res) => res.json()),
  });

  const teacher = teacherData?.data || null;
  const ratingResult = ratingResultData?.data || null;
  const comparison = comparisonData?.data?.comparison || [];
  const academicYears = academicYearsData?.data || [];

  // Set initial year
  React.useEffect(() => {
    if (!selectedYearId && academicYears.length > 0) {
      setSelectedYearId(academicYears[0].id);
    }
  }, [academicYears, selectedYearId]);

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
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Sizin müəllim profiliniz tapılmadı. Zəhmət olmasa, sistem administratoru ilə əlaqə saxlayın.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Mənim Reytinqim</h1>
        <p className="text-muted-foreground mt-1">
          Şəxsi reytinq məlumatlarınız və tərəqqi göstəriciləriniz
        </p>
      </div>

      {/* Teacher Header */}
      <TeacherRatingHeader teacher={teacher} latestRating={ratingResult} canEdit={false} canExport={false} />

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Bu səhifədə yalnız öz reytinq məlumatlarınızı görə bilərsiniz. Reytinqinizi artırmaq üçün
          akademik nəticələrinizi, dərs müşahidə qiymətlərinizi və professional inkişaf fəaliyyətlərinizi
          yaxşılaşdırmağa çalışın.
        </AlertDescription>
      </Alert>

      {/* Academic Year Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Tədris İli</CardTitle>
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

      {ratingLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
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
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Məktəb Sırası
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {ratingResult.rank_school === 1 && <span className="text-2xl">🥇</span>}
                  {ratingResult.rank_school === 2 && <span className="text-2xl">🥈</span>}
                  {ratingResult.rank_school === 3 && <span className="text-2xl">🥉</span>}
                  <div className="text-2xl font-bold">#{ratingResult.rank_school || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Rayon Sırası
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {ratingResult.rank_district === 1 && <span className="text-2xl">🥇</span>}
                  {ratingResult.rank_district === 2 && <span className="text-2xl">🥈</span>}
                  {ratingResult.rank_district === 3 && <span className="text-2xl">🥉</span>}
                  <div className="text-2xl font-bold">#{ratingResult.rank_district || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Region Sırası
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {ratingResult.rank_region === 1 && <span className="text-2xl">🥇</span>}
                  {ratingResult.rank_region === 2 && <span className="text-2xl">🥈</span>}
                  {ratingResult.rank_region === 3 && <span className="text-2xl">🥉</span>}
                  <div className="text-2xl font-bold">#{ratingResult.rank_region || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Fənn Sırası
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {ratingResult.rank_subject === 1 && <span className="text-2xl">🥇</span>}
                  {ratingResult.rank_subject === 2 && <span className="text-2xl">🥈</span>}
                  {ratingResult.rank_subject === 3 && <span className="text-2xl">🥉</span>}
                  <div className="text-2xl font-bold">#{ratingResult.rank_subject || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Component Details */}
          <Card>
            <CardHeader>
              <CardTitle>Komponent Detalları</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Progress Chart */}
          {comparison.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <CardTitle>İllik Tərəqqi</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <RatingProgressChart data={comparison} height={400} showComponents />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Seçilmiş tədris ili üçün reytinq məlumatı tapılmadı
          </CardContent>
        </Card>
      )}

      {/* Improvement Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Reytinqinizi Yüksəltmək Üçün Tövsiyələr</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">📚 Akademik Nəticələr (30%)</h4>
              <p className="text-blue-700">
                Tələbələrinizin orta qiymətini və uğur faizini artırmağa çalışın.
                Əlavə dərs saatları keçin və fərdi yanaşma tətbiq edin.
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">👁️ Dərs Müşahidəsi (20%)</h4>
              <p className="text-green-700">
                Dərs keyfiyyətinizi artırın, müasir tədris metodları istifadə edin.
                Açıq dərslərə qatılın və həmkarlarınızdan öyrənin.
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-medium text-amber-900 mb-2">🏆 Olimpiada (15%)</h4>
              <p className="text-amber-700">
                Tələbələrinizi olimpiada və müsabiqələrə hazırlayın.
                İstedadlı şagirdlərlə fərdi işlər aparın.
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-900 mb-2">✅ Qiymətləndirmə (15%)</h4>
              <p className="text-purple-700">
                Peşəkarlığınızı artırın, həmkarlarla əməkdaşlıq edin.
                Müdiriyyət qiymətləndirmələrində yüksək nəticələr əldə edin.
              </p>
            </div>

            <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
              <h4 className="font-medium text-pink-900 mb-2">🎓 Sertifikat (10%)</h4>
              <p className="text-pink-700">
                Professional inkişaf kurslarına qatılın, yeni bacarıqlar öyrənin.
                Sertifikatlarınızı sistemdə qeyd etdirin.
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-900 mb-2">🏅 Mükafat (10%)</h4>
              <p className="text-red-700">
                Fəal iştirak edin, təşəbbüskar olun, nümunəvi işlərinizi paylaşın.
                Dövlət və təşkilat mükafatları üçün namizədliyinizi irəli sürün.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
