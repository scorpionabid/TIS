/**
 * TeacherRatingComparison Page
 *
 * District/Regional comparison page
 * Features: Multi-district comparison, charts, statistics
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { ArrowLeft, Download, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

export default function TeacherRatingComparison() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [comparisonType, setComparisonType] = useState<'district' | 'school'>('district');

  // Queries
  const { data: academicYearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => fetch('/api/academic-years').then((res) => res.json()),
  });

  const { data: comparisonData } = useQuery({
    queryKey: ['rating-comparison', academicYearId, comparisonType],
    queryFn: () =>
      fetch(
        `/api/teacher-rating/comparison?academic_year_id=${academicYearId}&type=${comparisonType}`
      ).then((res) => res.json()),
    enabled: !!academicYearId,
  });

  const academicYears = academicYearsData?.data || [];
  const comparison = comparisonData?.data || [];

  // Set initial year
  React.useEffect(() => {
    if (!academicYearId && academicYears.length > 0) {
      setAcademicYearId(academicYears[0].id);
    }
  }, [academicYears, academicYearId]);

  const handleExport = async () => {
    try {
      const response = await fetch('/api/teacher-rating/comparison/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academic_year_id: academicYearId,
          type: comparisonType,
        }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparison-${comparisonType}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Uğurlu',
        description: 'Müqayisə məlumatları ixrac edildi',
      });
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'İxrac zamanı xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  // Prepare chart data
  const chartData = comparison.map((item: any) => ({
    name: item.name,
    average: item.average_score,
    teachers: item.teacher_count,
    top_score: item.top_score,
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/regionadmin/teacher-rating')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reytinq Müqayisəsi</h1>
          <p className="text-muted-foreground mt-1">
            Rayon və məktəblərin reytinq müqayisəsi
          </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Comparison Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Müqayisə Növü</label>
              <Select value={comparisonType} onValueChange={(value: any) => setComparisonType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="district">Rayon üzrə</SelectItem>
                  <SelectItem value="school">Məktəb üzrə</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average Score Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Orta Reytinq Müqayisəsi</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} fontSize={12} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="average" fill="#3b82f6" name="Orta Reytinq" />
              <Bar dataKey="top_score" fill="#10b981" name="Ən Yüksək" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Teacher Count Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Müəllim Sayı</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} fontSize={12} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="teachers" stroke="#8b5cf6" name="Müəllim Sayı" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detallı Müqayisə</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sıra</TableHead>
                <TableHead>{comparisonType === 'district' ? 'Rayon' : 'Məktəb'}</TableHead>
                <TableHead className="text-center">Müəllim Sayı</TableHead>
                <TableHead className="text-center">Orta Reytinq</TableHead>
                <TableHead className="text-center">Ən Yüksək</TableHead>
                <TableHead className="text-center">Ən Aşağı</TableHead>
                <TableHead className="text-center">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Müqayisə məlumatı tapılmadı
                  </TableCell>
                </TableRow>
              ) : (
                comparison
                  .sort((a: any, b: any) => b.average_score - a.average_score)
                  .map((item: any, index: number) => {
                    const trend = item.trend || 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {index === 0 && <span className="text-xl">🥇</span>}
                            {index === 1 && <span className="text-xl">🥈</span>}
                            {index === 2 && <span className="text-xl">🥉</span>}
                            <span className="font-medium">#{index + 1}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-center">{item.teacher_count}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-lg font-bold text-blue-600">
                            {item.average_score.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-green-600 font-medium">
                            {item.top_score.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-red-600 font-medium">
                            {item.lowest_score.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {trend > 0 ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              +{trend.toFixed(1)}%
                            </Badge>
                          ) : trend < 0 ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              {trend.toFixed(1)}%
                            </Badge>
                          ) : (
                            <Badge variant="outline">—</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
