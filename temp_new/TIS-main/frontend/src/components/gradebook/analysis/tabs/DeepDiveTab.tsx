import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AnalysisFilters } from '../filters/AnalysisFilters';
import { gradeBookService } from '@/services/gradeBook';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Target,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  AlertCircle,
  BookOpen,
  ShieldAlert,
} from 'lucide-react';

interface DeepDiveTabProps {
  filters: AnalysisFilters;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

interface RiskStudent {
  id: number;
  name: string;
  class: string;
  average: number;
  failedSubjects: number;
  attendance: number | null;
  trend: 'up' | 'down' | 'stable';
}

interface TopStudent {
  id: number;
  name: string;
  class: string;
  average: number;
  bestSubject: string;
  improvement: number;
}

interface SubjectAnalysis {
  subject: string;
  average: number;
  passRate: number;
  riskCount: number;
  trend: 'improving' | 'declining' | 'stable';
}

export function DeepDiveTab({ filters }: Pick<DeepDiveTabProps, 'filters'>) {
  const { toast } = useToast();
  const [localLoading, setLocalLoading] = useState(false);
  const [activeView, setActiveView] = useState<'risk' | 'success' | 'subjects' | 'below30'>('below30');

  // Below-30 data from class level analysis
  const below30Params = {
    ...(filters.institution_id          ? { institution_id: filters.institution_id }            : {}),
    ...(filters.academic_year_ids?.length ? { academic_year_ids: filters.academic_year_ids }    : {}),
    ...(filters.subject_ids?.length     ? { subject_ids: filters.subject_ids }                  : {}),
    ...(filters.sector_ids?.length      ? { sector_ids: filters.sector_ids }                    : {}),
    ...(filters.school_ids?.length      ? { school_ids: filters.school_ids }                    : {}),
    ...(filters.class_levels?.length    ? { class_levels: filters.class_levels }                : {}),
  };
  const { data: classData } = useQuery({
    queryKey: ['classLevelBelow30', below30Params],
    queryFn: () => gradeBookService.getClassLevelSubjectAnalysis(below30Params),
    staleTime: 5 * 60 * 1000,
    enabled: activeView === 'below30',
  });
  const below30Rows = (classData?.data?.rows ?? [])
    .filter((r) => r.below_30_count > 0)
    .sort((a, b) => b.below_30_count - a.below_30_count);
  const [riskStudents, setRiskStudents] = useState<RiskStudent[]>([]);
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [subjectAnalysis, setSubjectAnalysis] = useState<SubjectAnalysis[]>([]);

  useEffect(() => {
    loadDeepDiveData();
  }, [filters]);

  const loadDeepDiveData = async () => {
    try {
      setLocalLoading(true);

      const params: Record<string, number | string | number[] | string[]> = {};
      if (filters.institution_id)             params.institution_id     = filters.institution_id;
      if (filters.academic_year_ids?.length)  params.academic_year_ids  = filters.academic_year_ids!;
      if (filters.subject_ids?.length)        params.subject_ids        = filters.subject_ids!;
      if (filters.grade_ids?.length)          params.grade_ids          = filters.grade_ids!;
      if (filters.sector_ids?.length)         params.sector_ids         = filters.sector_ids!;
      if (filters.school_ids?.length)         params.school_ids         = filters.school_ids!;
      if (filters.class_levels?.length)       params.class_levels       = filters.class_levels!;
      if (filters.teaching_languages?.length) params.teaching_languages = filters.teaching_languages!;
      if (filters.gender)                     params.gender             = filters.gender;

      const response = await gradeBookService.getDeepDiveData(params as Parameters<typeof gradeBookService.getDeepDiveData>[0]);

      if (response.success && response.data) {
        setRiskStudents(response.data.riskStudents || []);
        setTopStudents(response.data.topStudents || []);
        setSubjectAnalysis(response.data.subjectAnalysis || []);
      } else {
        throw new Error('Failed to load deep dive data');
      }
    } catch {
      toast({
        title: 'Xəta',
        description: 'Dərin təhlil məlumatları yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
      setRiskStudents([]);
      setTopStudents([]);
      setSubjectAnalysis([]);
    } finally {
      setLocalLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'down':
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-rose-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-slate-300" />;
    }
  };

  if (localLoading) {
    return <DeepDiveSkeleton />;
  }

  const isEmpty = riskStudents.length === 0 && topStudents.length === 0 && subjectAnalysis.length === 0;
  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Seçilmiş filtrlər üzrə dərin təhlil məlumatı tapılmadı.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveView('risk')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            activeView === 'risk'
              ? 'bg-rose-100 text-rose-700 border border-rose-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Risk Analizi
          <Badge variant="secondary" className="ml-1 bg-rose-50 text-rose-700">
            {riskStudents.length}
          </Badge>
        </button>
        <button
          onClick={() => setActiveView('success')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            activeView === 'success'
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          Uğur Analizi
          <Badge variant="secondary" className="ml-1 bg-emerald-50 text-emerald-700">
            {topStudents.length}
          </Badge>
        </button>
        <button
          onClick={() => setActiveView('subjects')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            activeView === 'subjects'
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Fənn Analizi
        </button>
        <button
          onClick={() => setActiveView('below30')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            activeView === 'below30'
              ? 'bg-orange-100 text-orange-700 border border-orange-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          30-dan Az
          {below30Rows.length > 0 && (
            <Badge variant="secondary" className="ml-1 bg-orange-50 text-orange-700">
              {below30Rows.reduce((s, r) => s + r.below_30_count, 0)}
            </Badge>
          )}
        </button>
      </div>

      {/* Content */}
      {activeView === 'risk' && (
        <div className="space-y-4">
          <Card className="border-rose-200 bg-rose-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Risk Qrupundakı Şagirdlər (Ortalama &lt; 50)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {riskStudents.map((student, index) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-rose-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-medium w-6">{index + 1}</span>
                      <div>
                        <p className="font-medium text-slate-900">{student.name}</p>
                        <p className="text-sm text-slate-500">{student.class}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Ortalama</p>
                        <p className="font-bold text-rose-600">{student.average.toFixed(1)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Zəif fənn</p>
                        <p className="font-medium text-rose-600">{student.failedSubjects}</p>
                      </div>
                      {student.attendance !== null && (
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Davamiyyət</p>
                          <p className="font-medium text-slate-700">{student.attendance}%</p>
                        </div>
                      )}
                      <div className="w-8">{getTrendIcon(student.trend)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === 'success' && (
        <div className="space-y-4">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-emerald-900 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Ən Yüksək Nəticə Göstərənlər
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topStudents.map((student, index) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-medium text-sm">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{student.name}</p>
                        <p className="text-sm text-slate-500">{student.class}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Ortalama</p>
                        <p className="font-bold text-emerald-600">{student.average.toFixed(1)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Ən güclü fənn</p>
                        <p className="font-medium text-emerald-700">{student.bestSubject}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">İnkişaf</p>
                        <p className="font-medium text-emerald-600">+{student.improvement.toFixed(1)}%</p>
                      </div>
                      <div className="w-8">{getTrendIcon('up')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === 'below30' && (
        <div className="space-y-4">
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-orange-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                30 Baldan Az Toplayan Hallər — Sinif Səv. × Fənn
              </CardTitle>
            </CardHeader>
            <CardContent>
              {below30Rows.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">30-dan az toplayan hal tapılmadı</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-orange-200">
                        <th className="text-left py-2 px-3 font-medium text-slate-600">Sinif</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">Fənn</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-600">Şagird</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-600">30-dan az</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-600">Faiz</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-600">Ort. bal</th>
                        <th className="py-2 px-3 font-medium text-slate-600">Keçid faizi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {below30Rows.map((row, idx) => (
                        <tr
                          key={`${row.class_level}-${row.subject_id}`}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}
                        >
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="text-xs">{row.class_level}-ci</Badge>
                          </td>
                          <td className="py-2 px-3 font-medium">{row.subject_name}</td>
                          <td className="py-2 px-3 text-right text-slate-500">{row.student_count}</td>
                          <td className="py-2 px-3 text-right font-bold text-orange-600">
                            {row.below_30_count}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`text-xs font-medium ${row.below_30_pct > 20 ? 'text-rose-600' : 'text-orange-600'}`}>
                              {row.below_30_pct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">{row.avg_score.toFixed(1)}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <Progress value={row.pass_rate} className="h-1.5 flex-1" />
                              <span className="text-xs text-slate-500 w-10 text-right">
                                {row.pass_rate.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-orange-200 bg-orange-50">
                        <td colSpan={3} className="py-2 px-3 font-semibold text-slate-700">Cəmi</td>
                        <td className="py-2 px-3 text-right font-bold text-orange-700">
                          {below30Rows.reduce((s, r) => s + r.below_30_count, 0)}
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === 'subjects' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjectAnalysis.map((subject) => (
              <Card key={subject.subject} className="border-slate-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">{subject.subject}</CardTitle>
                    {getTrendIcon(subject.trend)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Keçmə faizi</span>
                      <span className="font-medium">{subject.passRate}%</span>
                    </div>
                    <Progress value={subject.passRate} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Ortalama</p>
                      <p className="text-lg font-bold text-slate-900">{subject.average.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Riskdə</p>
                      <p className={`text-lg font-bold ${subject.riskCount > 10 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {subject.riskCount} şagird
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeepDiveSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-32" />
        ))}
      </div>
      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
