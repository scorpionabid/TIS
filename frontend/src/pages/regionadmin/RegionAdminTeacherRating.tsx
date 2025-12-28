/**
 * RegionAdminTeacherRating Page
 *
 * Main teacher rating list page for RegionAdmin
 * Features: Table view, filters, bulk operations, export
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  TeacherRatingTable,
  TeacherRatingFilters,
  TeacherRatingCard,
} from '../../components/teacher-rating';
import {
  Plus,
  Upload,
  Download,
  Calculator,
  MoreVertical,
  Grid,
  List,
  RefreshCcw,
} from 'lucide-react';
import { teacherRatingService, ratingCalculationService } from '../../services/teacherRating';
import type { TeacherRatingFilters as FilterType, RatingResult } from '../../types/teacherRating';
import { useToast } from '../../hooks/use-toast';

export default function RegionAdminTeacherRating() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [filters, setFilters] = useState<FilterType>({
    search: '',
    schoolId: null,
    subjectId: null,
    academicYearId: null,
    ageBand: null,
    isActive: null,
    minScore: null,
    maxScore: null,
  });
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);
  const [calculateMode, setCalculateMode] = useState<'single' | 'all'>('all');
  const [currentTeacherId, setCurrentTeacherId] = useState<number | null>(null);

  // Queries
  const { data: teachersData, isLoading: teachersLoading } = useQuery({
    queryKey: ['teacher-ratings', filters],
    queryFn: () => teacherRatingService.getAll(filters),
  });

  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: () => fetch('/api/institutions?type=school').then(res => res.json()),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => fetch('/api/subjects').then(res => res.json()),
  });

  const { data: academicYearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => fetch('/api/academic-years').then(res => res.json()),
  });

  // Mutations
  const calculateSingleMutation = useMutation({
    mutationFn: (teacherId: number) =>
      ratingCalculationService.calculateTeacherRating(teacherId, {
        academic_year_id: filters.academicYearId || undefined,
      }),
    onSuccess: () => {
      toast({
        title: 'Uğurlu',
        description: 'Reytinq hesablandı',
      });
      queryClient.invalidateQueries({ queryKey: ['teacher-ratings'] });
      setCalculateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Hesablama zamanı xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  const calculateAllMutation = useMutation({
    mutationFn: () =>
      ratingCalculationService.calculateAllRatings({
        academic_year_id: filters.academicYearId || undefined,
      }),
    onSuccess: () => {
      toast({
        title: 'Uğurlu',
        description: 'Bütün reytinqlər hesablandı',
      });
      queryClient.invalidateQueries({ queryKey: ['teacher-ratings'] });
      setCalculateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Hesablama zamanı xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleViewProfile = (teacherId: number) => {
    navigate(`/regionadmin/teacher-rating/profile/${teacherId}`);
  };

  const handleCalculateSingle = (teacherId: number) => {
    setCurrentTeacherId(teacherId);
    setCalculateMode('single');
    setCalculateDialogOpen(true);
  };

  const handleCalculateAll = () => {
    setCalculateMode('all');
    setCalculateDialogOpen(true);
  };

  const handleConfirmCalculate = () => {
    if (calculateMode === 'single' && currentTeacherId) {
      calculateSingleMutation.mutate(currentTeacherId);
    } else if (calculateMode === 'all') {
      calculateAllMutation.mutate();
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/teacher-rating/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `teacher-ratings-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Uğurlu',
        description: 'Məlumatlar ixrac edildi',
      });
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'İxrac zamanı xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      schoolId: null,
      subjectId: null,
      academicYearId: null,
      ageBand: null,
      isActive: null,
      minScore: null,
      maxScore: null,
    });
  };

  const teachers = teachersData?.data || [];
  const total = teachersData?.total || 0;
  const activeCount = teachers.filter((t: any) => t.teacher.is_active).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Müəllim Reytinq Sistemi</h1>
          <p className="text-muted-foreground mt-1">
            Müəllimlərin reytinq idarəetməsi və hesablanması
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/regionadmin/teacher-rating/import')}>
            <Upload className="h-4 w-4 mr-2" />
            İdxal
          </Button>

          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            İxrac
          </Button>

          <Button onClick={handleCalculateAll}>
            <Calculator className="h-4 w-4 mr-2" />
            Hamısını Hesabla
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/regionadmin/teacher-rating/leaderboard')}>
                Liderlər Siyahısı
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/regionadmin/teacher-rating/comparison')}>
                Müqayisə
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/regionadmin/teacher-rating/configuration')}>
                Konfiqurasiya
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ümumi Müəllim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktiv Müəllim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Qeyri-aktiv
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{total - activeCount}</div>
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
              {teachers.length > 0
                ? (teachers.reduce((sum: number, t: any) => sum + (t.total_score || 0), 0) / teachers.length).toFixed(1)
                : '0.0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <TeacherRatingFilters
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        schools={schoolsData?.data || []}
        subjects={subjectsData?.data || []}
        academicYears={academicYearsData?.data || []}
      />

      {/* View Mode Toggle & Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Müəllimlər</CardTitle>
              <CardDescription>
                {total} müəllim tapıldı
              </CardDescription>
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4 mr-1" />
                Cədvəl
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4 mr-1" />
                Kart
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {teachersLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === 'table' ? (
            <TeacherRatingTable
              data={teachers}
              onViewProfile={handleViewProfile}
              onCalculate={handleCalculateSingle}
              showActions
              canCalculate
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers.map((teacher: RatingResult) => (
                <TeacherRatingCard
                  key={teacher.id}
                  data={teacher}
                  onViewProfile={handleViewProfile}
                  onCalculate={handleCalculateSingle}
                  showActions
                  canCalculate
                />
              ))}
            </div>
          )}

          {!teachersLoading && teachers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Heç bir müəllim tapılmadı
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculate Confirmation Dialog */}
      <AlertDialog open={calculateDialogOpen} onOpenChange={setCalculateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {calculateMode === 'all' ? 'Bütün Reytinqləri Hesabla' : 'Reytinqi Hesabla'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {calculateMode === 'all'
                ? 'Bütün aktiv müəllimlərin reytinqləri hesablanacaq. Bu əməliyyat bir neçə dəqiqə çəkə bilər. Davam etmək istəyirsiniz?'
                : 'Seçilmiş müəllimin reytinqi hesablanacaq. Davam etmək istəyirsiniz?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İmtina</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCalculate}
              disabled={calculateSingleMutation.isPending || calculateAllMutation.isPending}
            >
              {calculateSingleMutation.isPending || calculateAllMutation.isPending
                ? 'Hesablanır...'
                : 'Hesabla'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
