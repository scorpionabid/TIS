import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Minus, Users, BarChart3, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface GradeHistory {
  student_id: number;
  current_scores: Array<{
    column_label: string;
    semester: string;
    score: number;
    percentage: number;
    grade_mark: number;
  }>;
  calculated_scores: {
    i_semester: number;
    ii_semester: number;
    annual: number;
  };
  score_history: Array<{
    date: string;
    column: string;
    old_score: number;
    new_score: number;
    changed_by: string;
  }>;
  progression: {
    first_score: number;
    latest_score: number;
    improvement: number;
    average_score: number;
  };
  statistics: {
    total_updates: number;
    highest_score: number;
    lowest_score: number;
  };
}

interface ClassComparison {
  student: {
    i_semester: number;
    ii_semester: number;
    annual: number;
  };
  class_average: {
    i_semester: number;
    ii_semester: number;
    annual: number;
  };
  class_max: {
    i_semester: number;
    ii_semester: number;
    annual: number;
  };
  class_min: {
    i_semester: number;
    ii_semester: number;
    annual: number;
  };
  percentile: number;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  student_number: string;
}

export function GradeHistoryChart() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [history, setHistory] = useState<GradeHistory | null>(null);
  const [comparison, setComparison] = useState<ClassComparison | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Load students list
  useEffect(() => {
    loadStudents();
  }, [id]);

  // Load student data when selected
  useEffect(() => {
    if (selectedStudent) {
      loadStudentData(parseInt(selectedStudent));
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    try {
      const response = await apiClient.get(`/grade-books/${id}/students`);
      setStudents(response.data.data);
    } catch (error) {
      console.error('Failed to load students', error);
    }
  };

  const loadStudentData = async (studentId: number) => {
    try {
      setLoading(true);
      
      // Load grade history
      const historyResponse = await apiClient.get(
        `/grade-books/${id}/students/${studentId}/history`
      );
      setHistory(historyResponse.data.data);

      // Load class comparison
      const comparisonResponse = await apiClient.get(
        `/grade-books/${id}/students/${studentId}/comparison`
      );
      setComparison(comparisonResponse.data.data);

      // Load trend data
      const trendResponse = await apiClient.get(
        `/grade-books/${id}/students/${studentId}/trend`
      );
      setTrendData(trendResponse.data.data.data);
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Məlumatlar yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatRadarData = () => {
    if (!history || !comparison) return [];
    
    return [
      {
        subject: 'I Yarımil',
        student: history.calculated_scores.i_semester,
        class: comparison.class_average.i_semester,
        max: 100,
      },
      {
        subject: 'II Yarımil',
        student: history.calculated_scores.ii_semester,
        class: comparison.class_average.ii_semester,
        max: 100,
      },
      {
        subject: 'İllik',
        student: history.calculated_scores.annual,
        class: comparison.class_average.annual,
        max: 100,
      },
    ];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Bal tarixçəsi və analitika</h2>
        </div>
        
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Şagird seçin" />
          </SelectTrigger>
          <SelectContent>
            {students.map((student) => (
              <SelectItem key={student.id} value={student.id.toString()}>
                {student.last_name} {student.first_name} ({student.student_number})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedStudent ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Analitika görmək üçün şagird seçin</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Activity className="h-8 w-8 mx-auto mb-4 animate-pulse" />
            <p>Məlumatlar yüklənir...</p>
          </CardContent>
        </Card>
      ) : history && comparison ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Ümumi</TabsTrigger>
            <TabsTrigger value="trend">Trend</TabsTrigger>
            <TabsTrigger value="comparison">Müqayisə</TabsTrigger>
            <TabsTrigger value="history">Tarixçə</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">I Yarımil</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getScoreColor(history.calculated_scores.i_semester)}`}>
                    {history.calculated_scores.i_semester.toFixed(1)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">II Yarımil</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getScoreColor(history.calculated_scores.ii_semester)}`}>
                    {history.calculated_scores.ii_semester.toFixed(1)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">İllik Bal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getScoreColor(history.calculated_scores.annual)}`}>
                    {history.calculated_scores.annual.toFixed(1)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Sinifdə yeri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {comparison.percentile.toFixed(0)}%
                  </div>
                  <p className="text-xs text-gray-500">percentil</p>
                </CardContent>
              </Card>
            </div>

            {/* Progression Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  {getTrendIcon(history.progression.improvement > 0 ? 'improving' : history.progression.improvement < 0 ? 'declining' : 'stable')}
                  İnkişaf dinamikası
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">İlk bal</p>
                    <p className="text-lg font-semibold">{history.progression.first_score?.toFixed(1) ?? '-'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Son bal</p>
                    <p className="text-lg font-semibold">{history.progression.latest_score?.toFixed(1) ?? '-'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Dəyişiklik</p>
                    <p className={`text-lg font-semibold ${history.progression.improvement > 0 ? 'text-green-600' : history.progression.improvement < 0 ? 'text-red-600' : ''}`}>
                      {history.progression.improvement > 0 ? '+' : ''}{history.progression.improvement.toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sinif müqayisəsi (Radar)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={formatRadarData()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name="Şagird"
                      dataKey="student"
                      stroke="#2563eb"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <Radar
                      name="Sinif ortalaması"
                      dataKey="class"
                      stroke="#16a34a"
                      fill="#22c55e"
                      fillOpacity={0.6}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trend Tab */}
          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Bal dəyişiklik trendi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('az-AZ')}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString('az-AZ')}
                      formatter={(value: number) => [value.toFixed(1), 'Bal']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Bal"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ fill: '#2563eb' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="running_average"
                      name="Ortalama"
                      stroke="#16a34a"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sinif müqayisəsi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={[
                      {
                        name: 'I Yarımil',
                        student: history.calculated_scores.i_semester,
                        average: comparison.class_average.i_semester,
                        max: comparison.class_max.i_semester,
                      },
                      {
                        name: 'II Yarımil',
                        student: history.calculated_scores.ii_semester,
                        average: comparison.class_average.ii_semester,
                        max: comparison.class_max.ii_semester,
                      },
                      {
                        name: 'İllik',
                        student: history.calculated_scores.annual,
                        average: comparison.class_average.annual,
                        max: comparison.class_max.annual,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="student" name="Şagird" fill="#3b82f6" />
                    <Bar dataKey="average" name="Sinif ortalaması" fill="#22c55e" />
                    <Bar dataKey="max" name="Sinif maksimum" fill="#94a3b8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ətraflı tarixçə</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {history.score_history.map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{entry.column}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(entry.date).toLocaleString('az-AZ')} • {entry.changed_by}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{entry.old_score?.toFixed(1) ?? '-'}</span>
                          <span>→</span>
                          <span className={`font-semibold ${getScoreColor(entry.new_score)}`}>
                            {entry.new_score?.toFixed(1)}
                          </span>
                          {entry.new_score > entry.old_score && (
                            <Badge variant="outline" className="text-green-600">
                              +{(entry.new_score - entry.old_score).toFixed(1)}
                            </Badge>
                          )}
                          {entry.new_score < entry.old_score && (
                            <Badge variant="outline" className="text-red-600">
                              {(entry.new_score - entry.old_score).toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
