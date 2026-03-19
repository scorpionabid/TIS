import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AnalysisFilters } from '../filters/AnalysisFilters';
import { gradeBookService } from '@/services/gradeBook';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  Target,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  AlertCircle,
  BookOpen,
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
  attendance: number;
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

export function DeepDiveTab({ filters, loading, setLoading }: DeepDiveTabProps) {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'risk' | 'success' | 'subjects'>('risk');
  const [riskStudents, setRiskStudents] = useState<RiskStudent[]>([]);
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [subjectAnalysis, setSubjectAnalysis] = useState<SubjectAnalysis[]>([]);

  useEffect(() => {
    loadDeepDiveData();
  }, [filters, activeView]);

  const loadDeepDiveData = async () => {
    try {
      setLoading(true);

      // Build params from filters
      const params: any = {};
      if (filters.institution_id) params.institution_id = filters.institution_id;
      if (filters.academic_year_id) params.academic_year_id = filters.academic_year_id;
      if (filters.grade_id) params.grade_id = filters.grade_id;
      if (filters.subject_id) params.subject_id = filters.subject_id;

      // Get deep dive data from API
      const response = await gradeBookService.getDeepDiveData(params);

      if (response.success && response.data) {
        setRiskStudents(response.data.riskStudents || []);
        setTopStudents(response.data.topStudents || []);
        setSubjectAnalysis(response.data.subjectAnalysis || []);
      } else {
        throw new Error('Failed to load deep dive data');
      }
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: 'Dərin təhlil məlumatları yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
      setRiskStudents([]);
      setTopStudents([]);
      setSubjectAnalysis([]);
    } finally {
      setLoading(false);
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

  if (loading) {
    return <DeepDiveSkeleton />;
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
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Davamiyyət</p>
                        <p className="font-medium text-slate-700">{student.attendance}%</p>
                      </div>
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
