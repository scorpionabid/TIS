import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  GraduationCap, 
  Search, 
  Plus,
  FileText,
  Edit,
  Eye,
  MoreHorizontal,
  Download,
  Upload,
  Filter,
  RefreshCw,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Star,
  Save,
  Send,
  Calendar,
  BarChart3,
  TrendingUp,
  Award,
  Target,
  Calculator
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { schoolAdminService, schoolAdminKeys, Assessment, AssessmentGrade } from '@/services/schoolAdmin';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AssessmentGradebookProps {
  className?: string;
}

export const AssessmentGradebook: React.FC<AssessmentGradebookProps> = ({ className }) => {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'assessments' | 'grades' | 'create'>('assessments');
  const [gradeData, setGradeData] = useState<Record<number, { points: string; comments: string }>>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    title: '',
    subject: '',
    assessment_type: '',
    total_points: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  // Fetch classes
  const { 
    data: classes 
  } = useQuery({
    queryKey: schoolAdminKeys.classes(),
    queryFn: () => schoolAdminService.getClasses(),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch assessments for selected class
  const { 
    data: assessments,
    isLoading: assessmentsLoading,
    refetch: refetchAssessments 
  } = useQuery({
    queryKey: schoolAdminKeys.assessments(selectedClassId),
    queryFn: () => selectedClassId ? schoolAdminService.getAssessments(selectedClassId) : Promise.resolve([]),
    enabled: !!selectedClassId,
    refetchOnWindowFocus: false,
  });

  // Fetch students for selected class
  const { 
    data: students 
  } = useQuery({
    queryKey: schoolAdminKeys.students(),
    queryFn: () => selectedClassId ? schoolAdminService.getStudentsByClass(selectedClassId) : Promise.resolve([]),
    enabled: !!selectedClassId,
    refetchOnWindowFocus: false,
  });

  // Fetch grades for selected assessment
  const { 
    data: grades,
    isLoading: gradesLoading,
    refetch: refetchGrades 
  } = useQuery({
    queryKey: schoolAdminKeys.assessment(selectedAssessmentId),
    queryFn: () => selectedAssessmentId ? schoolAdminService.getAssessmentGrades(selectedAssessmentId) : Promise.resolve([]),
    enabled: !!selectedAssessmentId,
    refetchOnWindowFocus: false,
  });

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: (data: Partial<Assessment>) => schoolAdminService.createAssessment(data),
    onSuccess: () => {
      toast.success('Qiymətləndirmə yaradıldı');
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.assessments() });
      setCreateModalOpen(false);
      refetchAssessments();
      setNewAssessment({
        title: '',
        subject: '',
        assessment_type: '',
        total_points: '',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
    },
    onError: () => {
      toast.error('Qiymətləndirmə yaradıla bilmədi');
    },
  });

  // Record grades mutation
  const recordGradesMutation = useMutation({
    mutationFn: ({ assessmentId, grades }: { assessmentId: number; grades: Partial<AssessmentGrade>[] }) =>
      schoolAdminService.recordGrades(assessmentId, grades),
    onSuccess: () => {
      toast.success('Qiymətlər saxlanıldı');
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.assessment(selectedAssessmentId) });
      refetchGrades();
    },
    onError: () => {
      toast.error('Qiymətlər saxlanıla bilmədi');
    },
  });

  // Publish assessment mutation
  const publishAssessmentMutation = useMutation({
    mutationFn: (assessmentId: number) => schoolAdminService.publishAssessment(assessmentId),
    onSuccess: () => {
      toast.success('Qiymətləndirmə dərc edildi');
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.assessments() });
      refetchAssessments();
    },
    onError: () => {
      toast.error('Dərc edilə bilmədi');
    },
  });

  const getAssessmentTypeText = (type: string) => {
    const types: Record<string, string> = {
      'exam': 'İmtahan',
      'quiz': 'Test',
      'assignment': 'Tapşırıq',
      'project': 'Layihə',
      'presentation': 'Təqdimat',
      'homework': 'Ev tapşırığı',
      'lab': 'Laboratoriya',
      'oral': 'Şifahi',
      'written': 'Yazılı',
      'practical': 'Praktiki'
    };
    return types[type] || type;
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getLetterGrade = (percentage: number) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    if (percentage >= 50) return 'E';
    return 'F';
  };

  const handleCreateAssessment = () => {
    if (!selectedClassId) return;

    const data = {
      title: newAssessment.title,
      subject: newAssessment.subject,
      class_id: selectedClassId,
      assessment_type: newAssessment.assessment_type,
      total_points: parseInt(newAssessment.total_points),
      date: newAssessment.date,
      is_published: false,
    };

    createAssessmentMutation.mutate(data);
  };

  const handleGradeChange = (studentId: number, field: 'points' | 'comments', value: string) => {
    setGradeData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSaveGrades = () => {
    if (!selectedAssessmentId || !students) return;

    const grades = students.map(student => {
      const studentGrade = gradeData[student.id];
      const points = parseFloat(studentGrade?.points || '0');
      const assessment = assessments?.find(a => a.id === selectedAssessmentId);
      const totalPoints = assessment?.total_points || 100;
      const percentage = Math.round((points / totalPoints) * 100);

      return {
        student_id: student.id,
        points_earned: points,
        percentage,
        letter_grade: getLetterGrade(percentage),
        comments: studentGrade?.comments || '',
      };
    });

    recordGradesMutation.mutate({
      assessmentId: selectedAssessmentId,
      grades
    });
  };

  const calculateClassStats = () => {
    if (!grades || grades.length === 0) return null;

    const percentages = grades.map(g => g.percentage);
    const average = Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length);
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    
    return {
      average,
      highest,
      lowest,
      gradeDistribution: {
        A: grades.filter(g => g.percentage >= 90).length,
        B: grades.filter(g => g.percentage >= 80 && g.percentage < 90).length,
        C: grades.filter(g => g.percentage >= 70 && g.percentage < 80).length,
        D: grades.filter(g => g.percentage >= 60 && g.percentage < 70).length,
        E: grades.filter(g => g.percentage >= 50 && g.percentage < 60).length,
        F: grades.filter(g => g.percentage < 50).length,
      }
    };
  };

  const classStats = calculateClassStats();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Qiymətləndirmə və Qiymət Dəftəri</h2>
          <p className="text-muted-foreground">
            Şagirdlərin qiymətlərini qeydə alın və qiymətləndirmələri idarə edin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetchAssessments()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenilə
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            İxrac et
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2">
              <Label>Sinif seçin</Label>
              <Select 
                value={selectedClassId?.toString() || ''} 
                onValueChange={(value) => {
                  setSelectedClassId(value ? parseInt(value) : null);
                  setSelectedAssessmentId(null);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sinif seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {classes?.filter(c => c.is_active).map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant={viewMode === 'assessments' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('assessments')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Qiymətləndirmələr
              </Button>
              <Button
                variant={viewMode === 'grades' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grades')}
                disabled={!selectedAssessmentId}
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Qiymətlər
              </Button>
              <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedClassId}>
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Qiymətləndirmə
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Yeni qiymətləndirmə yarat</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Başlıq *</Label>
                      <Input
                        id="title"
                        value={newAssessment.title}
                        onChange={(e) => setNewAssessment(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="məs. Riyaziyyat testi"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Fənn *</Label>
                      <Input
                        id="subject"
                        value={newAssessment.subject}
                        onChange={(e) => setNewAssessment(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="məs. Riyaziyyat"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assessment_type">Növ *</Label>
                      <Select 
                        value={newAssessment.assessment_type} 
                        onValueChange={(value) => setNewAssessment(prev => ({ ...prev, assessment_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Növ seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exam">İmtahan</SelectItem>
                          <SelectItem value="quiz">Test</SelectItem>
                          <SelectItem value="assignment">Tapşırıq</SelectItem>
                          <SelectItem value="project">Layihə</SelectItem>
                          <SelectItem value="homework">Ev tapşırığı</SelectItem>
                          <SelectItem value="oral">Şifahi</SelectItem>
                          <SelectItem value="written">Yazılı</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="total_points">Maksimum bal *</Label>
                        <Input
                          id="total_points"
                          type="number"
                          min="1"
                          max="1000"
                          value={newAssessment.total_points}
                          onChange={(e) => setNewAssessment(prev => ({ ...prev, total_points: e.target.value }))}
                          placeholder="100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="date">Tarix *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newAssessment.date}
                          onChange={(e) => setNewAssessment(prev => ({ ...prev, date: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                        Ləğv et
                      </Button>
                      <Button 
                        onClick={handleCreateAssessment}
                        disabled={!newAssessment.title || !newAssessment.subject || !newAssessment.assessment_type || !newAssessment.total_points || createAssessmentMutation.isPending}
                      >
                        {createAssessmentMutation.isPending ? 'Yaradılır...' : 'Yarat'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClassId && (
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
          {/* Assessments List */}
          <TabsContent value="assessments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Qiymətləndirmələr</CardTitle>
                <CardDescription>
                  {classes?.find(c => c.id === selectedClassId)?.name} sinifi üçün qiymətləndirmələr
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assessmentsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-lg border animate-pulse">
                        <div className="w-12 h-12 bg-muted rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="w-3/4 h-4 bg-muted rounded" />
                          <div className="w-1/2 h-3 bg-muted rounded" />
                        </div>
                        <div className="w-24 h-8 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : assessments && assessments.length > 0 ? (
                  <div className="space-y-3">
                    {assessments.map(assessment => (
                      <div 
                        key={assessment.id} 
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer hover:shadow-sm",
                          selectedAssessmentId === assessment.id && "border-primary bg-primary/5"
                        )}
                        onClick={() => {
                          setSelectedAssessmentId(assessment.id);
                          setViewMode('grades');
                        }}
                      >
                        {/* Assessment Icon */}
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-purple-600" />
                        </div>

                        {/* Assessment Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="font-semibold text-foreground">{assessment.title}</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant={assessment.is_published ? 'success' : 'secondary'}>
                                {assessment.is_published ? 'Dərc edilib' : 'Qaralama'}
                              </Badge>
                              <Badge variant="outline">
                                {getAssessmentTypeText(assessment.assessment_type)}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              <span>{assessment.subject}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(assessment.date), 'dd MMM yyyy', { locale: az })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              <span>{assessment.total_points} bal</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedAssessmentId(assessment.id);
                              setViewMode('grades');
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Qiymətlər
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Ətraflı bax
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!assessment.is_published && (
                              <DropdownMenuItem onClick={() => publishAssessmentMutation.mutate(assessment.id)}>
                                <Send className="h-4 w-4 mr-2" />
                                Dərc et
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Hesabat al
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Qiymətləndirmə yoxdur</h3>
                    <p className="text-muted-foreground mb-4">
                      Bu sinif üçün hələ ki qiymətləndirmə yaradılmayıb
                    </p>
                    <Button onClick={() => setCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      İlk qiymətləndirməni yarat
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grades Entry */}
          <TabsContent value="grades" className="space-y-6">
            {selectedAssessmentId && (
              <>
                {/* Assessment Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>
                          {assessments?.find(a => a.id === selectedAssessmentId)?.title}
                        </CardTitle>
                        <CardDescription>
                          {assessments?.find(a => a.id === selectedAssessmentId)?.subject} - {' '}
                          {format(new Date(assessments?.find(a => a.id === selectedAssessmentId)?.date || ''), 'dd MMMM yyyy', { locale: az })}
                        </CardDescription>
                      </div>
                      <Button 
                        onClick={handleSaveGrades}
                        disabled={recordGradesMutation.isPending || !students || students.length === 0}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {recordGradesMutation.isPending ? 'Saxlanır...' : 'Qiymətləri saxla'}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {/* Class Statistics */}
                {classStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Orta qiymət</p>
                            <p className={cn("text-2xl font-bold", getGradeColor(classStats.average))}>
                              {classStats.average}%
                            </p>
                          </div>
                          <BarChart3 className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Ən yüksək</p>
                            <p className="text-2xl font-bold text-green-600">{classStats.highest}%</p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Ən aşağı</p>
                            <p className="text-2xl font-bold text-red-600">{classStats.lowest}%</p>
                          </div>
                          <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Uğur faizi</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {Math.round(((classStats.gradeDistribution.A + classStats.gradeDistribution.B + classStats.gradeDistribution.C) / (grades?.length || 1)) * 100)}%
                            </p>
                          </div>
                          <Award className="h-8 w-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Grades Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Qiymətlər</CardTitle>
                    <CardDescription>
                      Maksimum bal: {assessments?.find(a => a.id === selectedAssessmentId)?.total_points}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {gradesLoading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border animate-pulse">
                            <div className="w-10 h-10 bg-muted rounded-full" />
                            <div className="flex-1 space-y-2">
                              <div className="w-48 h-4 bg-muted rounded" />
                              <div className="w-32 h-3 bg-muted rounded" />
                            </div>
                            <div className="w-20 h-8 bg-muted rounded" />
                            <div className="w-32 h-8 bg-muted rounded" />
                          </div>
                        ))}
                      </div>
                    ) : students && students.length > 0 ? (
                      <div className="space-y-2">
                        {students.map(student => {
                          const existingGrade = grades?.find(g => g.student_id === student.id);
                          const currentPoints = gradeData[student.id]?.points || existingGrade?.points_earned?.toString() || '';
                          const currentComments = gradeData[student.id]?.comments || existingGrade?.comments || '';
                          const maxPoints = assessments?.find(a => a.id === selectedAssessmentId)?.total_points || 100;
                          const percentage = currentPoints ? Math.round((parseFloat(currentPoints) / maxPoints) * 100) : 0;
                          
                          return (
                            <div 
                              key={student.id} 
                              className="flex items-center gap-4 p-4 rounded-lg border"
                            >
                              {/* Student Info */}
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                                <GraduationCap className="h-5 w-5 text-blue-600" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground">
                                  {student.first_name} {student.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  ID: {student.student_id}
                                </p>
                              </div>

                              {/* Grade Input */}
                              <div className="w-32">
                                <div className="space-y-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={maxPoints}
                                    step="0.5"
                                    value={currentPoints}
                                    onChange={(e) => handleGradeChange(student.id, 'points', e.target.value)}
                                    placeholder={`/${maxPoints}`}
                                    className="text-center"
                                  />
                                  {currentPoints && (
                                    <div className="text-center">
                                      <Badge variant={getGradeColor(percentage).includes('green') ? 'success' : 
                                                   getGradeColor(percentage).includes('blue') ? 'primary' :
                                                   getGradeColor(percentage).includes('orange') ? 'warning' : 'destructive'}>
                                        {percentage}% ({getLetterGrade(percentage)})
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Comments */}
                              <div className="w-64">
                                <Textarea
                                  placeholder="Şərh əlavə edin..."
                                  value={currentComments}
                                  onChange={(e) => handleGradeChange(student.id, 'comments', e.target.value)}
                                  className="min-h-[60px] text-sm"
                                />
                              </div>

                              {/* Grade Display */}
                              {existingGrade && (
                                <div className="text-center">
                                  <div className={cn("text-lg font-semibold", getGradeColor(existingGrade.percentage))}>
                                    {existingGrade.letter_grade}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {existingGrade.points_earned}/{maxPoints}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Bu sinifdə şagird yoxdur</h3>
                        <p className="text-muted-foreground">
                          Qiymət vermək üçün əvvəlcə şagirdləri sinifə yazın
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!selectedClassId && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Sinif seçin</h3>
              <p className="text-muted-foreground">
                Qiymətləndirmə etmək üçün əvvəlcə sinif seçin
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};