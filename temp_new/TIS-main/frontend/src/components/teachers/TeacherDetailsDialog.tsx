import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  FileText,
  Edit,
  BookOpen,
  Star,
  Clock,
  Award,
  Briefcase,
  Building,
  Plus,
  CheckCircle,
  XCircle,
  TrendingUp,
  ClipboardList,
} from 'lucide-react';
import { SchoolTeacher } from '@/services/schoolAdmin';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherService } from '@/services/teachers';
import { WorkplaceManagementModal } from '@/components/modals/WorkplaceManagementModal';
import { TeacherWorkplace, WORKPLACE_PRIORITY_LABELS } from '@/types/teacher';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface TeacherDetailsDialogProps {
  teacher: SchoolTeacher | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (teacher: SchoolTeacher) => void;
  getDepartmentText: (department?: string) => string;
  getPositionText: (position?: string) => string;
  getPerformanceColor: (rating?: number) => string;
  getWorkloadColor: (hours?: number) => string;
}

// Helper: render star rating visually
function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < Math.floor(value)
              ? 'text-yellow-500 fill-yellow-500'
              : i < value
              ? 'text-yellow-400 fill-yellow-200'
              : 'text-muted-foreground'
          }`}
        />
      ))}
    </div>
  );
}

export const TeacherDetailsDialog: React.FC<TeacherDetailsDialogProps> = ({
  teacher,
  isOpen,
  onClose,
  onEdit,
  getDepartmentText,
  getPositionText,
  getPerformanceColor,
  getWorkloadColor,
}) => {
  const [workplaceModalOpen, setWorkplaceModalOpen] = useState(false);
  const [selectedWorkplace, setSelectedWorkplace] = useState<TeacherWorkplace | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load teacher workplaces
  const { data: workplaces, refetch: refetchWorkplaces } = useQuery({
    queryKey: ['teacher', teacher?.id, 'workplaces'],
    queryFn: () => teacherService.getTeacherWorkplaces(teacher!.id),
    enabled: isOpen && !!teacher,
  });

  // Activate workplace mutation
  const activateMutation = useMutation({
    mutationFn: (workplaceId: number) => teacherService.activateWorkplace(workplaceId),
    onSuccess: () => {
      toast({
        title: 'Uğurlu',
        description: 'İş yeri aktivləşdirildi.',
      });
      void queryClient.invalidateQueries({ queryKey: ['teacher', teacher?.id, 'workplaces'] });
      void queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: () => {
      toast({
        title: 'Xəta',
        description: 'İş yeri aktivləşdirilə bilmədi.',
        variant: 'destructive',
      });
    },
  });

  // Deactivate workplace mutation
  const deactivateMutation = useMutation({
    mutationFn: (workplaceId: number) => teacherService.deactivateWorkplace(workplaceId),
    onSuccess: () => {
      toast({
        title: 'Uğurlu',
        description: 'İş yeri deaktivləşdirildi.',
      });
      void queryClient.invalidateQueries({ queryKey: ['teacher', teacher?.id, 'workplaces'] });
      void queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: () => {
      toast({
        title: 'Xəta',
        description: 'İş yeri deaktivləşdirilə bilmədi.',
        variant: 'destructive',
      });
    },
  });

  if (!teacher) return null;

  const handleAddWorkplace = () => {
    setSelectedWorkplace(null);
    setWorkplaceModalOpen(true);
  };

  const handleEditWorkplace = (workplace: TeacherWorkplace) => {
    setSelectedWorkplace(workplace);
    setWorkplaceModalOpen(true);
  };

  const isWorkplaceMutating = activateMutation.isPending || deactivateMutation.isPending;

  // Performance tab computed values
  const performanceRating = teacher.performance_rating ?? 0;
  const performancePercent = Math.min((performanceRating / 5) * 100, 100);
  const miqPercent = teacher.miq_score != null ? Math.min(teacher.miq_score, 100) : null;
  const certPercent =
    teacher.certification_score != null ? Math.min(teacher.certification_score, 100) : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {teacher.first_name} {teacher.last_name} - Ətraflı məlumat
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">
                <Users className="h-4 w-4 mr-2" />
                Ümumi məlumat
              </TabsTrigger>
              <TabsTrigger value="workplaces">
                <Building className="h-4 w-4 mr-2" />
                İş yerləri ({workplaces?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="performance">
                <TrendingUp className="h-4 w-4 mr-2" />
                Performans
              </TabsTrigger>
            </TabsList>

            {/* ==================== GENERAL TAB ==================== */}
            <TabsContent
              value="general"
              className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]"
            >
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ad və Soyad</label>
                  <p className="text-foreground">
                    {teacher.first_name} {teacher.last_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Vəzifə</label>
                  <p className="text-foreground">{getPositionText(teacher.position)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Şöbə</label>
                  <p className="text-foreground">{getDepartmentText(teacher.department)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div>
                    <Badge variant={teacher.is_active ? 'default' : 'secondary'}>
                      {teacher.is_active ? 'Aktiv' : 'Passiv'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-foreground">{teacher.email || 'Təyin edilməyib'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefon</label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-foreground">{teacher.phone || 'Təyin edilməyib'}</p>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Performans reytinqi
                  </label>
                  <div className="space-y-2">
                    {teacher.performance_rating ? (
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <span className="text-lg font-bold">
                          {teacher.performance_rating.toFixed(1)}
                        </span>
                        <Badge variant={getPerformanceColor(teacher.performance_rating)}>
                          {teacher.performance_rating >= 4.5
                            ? 'Əla'
                            : teacher.performance_rating >= 3.5
                            ? 'Yaxşı'
                            : teacher.performance_rating >= 2.5
                            ? 'Orta'
                            : 'Zəif'}
                        </Badge>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Qiymətləndirilməyib</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Həftəlik iş saatı
                  </label>
                  <div className="space-y-2">
                    {teacher.weekly_hours ? (
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-500" />
                        <span className="text-lg font-bold">{teacher.weekly_hours} saat</span>
                        <Badge variant={getWorkloadColor(teacher.weekly_hours)}>
                          {teacher.weekly_hours >= 35
                            ? 'Həddindən artıq'
                            : teacher.weekly_hours >= 25
                            ? 'Yüksək'
                            : teacher.weekly_hours >= 15
                            ? 'Normal'
                            : 'Az'}
                        </Badge>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Təyin edilməyib</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Teaching Information */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Dərslər</label>
                <div className="mt-2">
                  {teacher.subjects && teacher.subjects.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {(
                        teacher.subjects as Array<
                          { name: string; hours_per_week?: number } | string
                        >
                      ).map((subject, index) => (
                        <div key={index} className="p-2 bg-muted/30 rounded text-sm">
                          <div className="font-medium">
                            {typeof subject === 'string' ? subject : subject.name}
                          </div>
                          {typeof subject !== 'string' && subject.hours_per_week && (
                            <div className="text-xs text-muted-foreground">
                              {subject.hours_per_week} saat/həftə
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Təyin edilmiş dərs yoxdur</p>
                  )}
                </div>
              </div>

              {/* Classes Information */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Siniflər</label>
                <div className="mt-2">
                  {teacher.classes && teacher.classes.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {(
                        teacher.classes as Array<
                          | { name: string; student_count: number; is_class_teacher?: boolean }
                          | number
                        >
                      ).map((classInfo, index) => (
                        <div key={index} className="p-3 bg-muted/30 rounded">
                          {typeof classInfo === 'number' ? (
                            <div className="font-medium">Sinif #{classInfo}</div>
                          ) : (
                            <>
                              <div className="font-medium">{classInfo.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {classInfo.student_count} şagird
                              </div>
                              {classInfo.is_class_teacher && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  Sinif rəhbəri
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Təyin edilmiş sinif yoxdur</p>
                  )}
                </div>
              </div>

              {/* Experience & Qualifications */}
              {(teacher.experience_years || teacher.education || teacher.certifications) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {teacher.experience_years && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Təcrübə</label>
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <p className="text-foreground">{teacher.experience_years} il</p>
                      </div>
                    </div>
                  )}

                  {teacher.education && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Təhsil</label>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <p className="text-foreground">{teacher.education}</p>
                      </div>
                    </div>
                  )}

                  {teacher.certifications && teacher.certifications.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Sertifikatlar
                      </label>
                      <div className="space-y-1">
                        {teacher.certifications.map((cert, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Employment Information */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    İşə başlama tarixi
                  </label>
                  <p className="text-foreground">
                    {teacher.hire_date
                      ? format(new Date(teacher.hire_date), 'dd MMMM yyyy', { locale: az })
                      : 'Məlumat yoxdur'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Son yeniləmə</label>
                  <p className="text-foreground">
                    {teacher.updated_at
                      ? format(new Date(teacher.updated_at), 'dd MMMM yyyy', { locale: az })
                      : 'Məlumat yoxdur'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Bağla
                </Button>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Siniflər
                </Button>
                <Button variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Dərslər
                </Button>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Cədvəl
                </Button>
                <Button onClick={() => onEdit(teacher)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Redaktə et
                </Button>
              </div>
            </TabsContent>

            {/* ==================== WORKPLACES TAB ==================== */}
            <TabsContent
              value="workplaces"
              className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">İş yerləri</h3>
                <Button onClick={handleAddWorkplace} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni iş yeri
                </Button>
              </div>

              {workplaces && workplaces.length > 0 ? (
                <div className="space-y-3">
                  {workplaces.map((workplace) => {
                    const isActive = workplace.status === 'active';
                    const isMutatingThis =
                      isWorkplaceMutating &&
                      (activateMutation.variables === workplace.id ||
                        deactivateMutation.variables === workplace.id);

                    return (
                      <div
                        key={workplace.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              {workplace.institution?.name}
                            </h4>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">
                                {WORKPLACE_PRIORITY_LABELS[workplace.workplace_priority]}
                              </Badge>
                              <Badge
                                variant={isActive ? 'default' : 'secondary'}
                              >
                                {workplace.status_label}
                              </Badge>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isMutatingThis}
                                onClick={() => deactivateMutation.mutate(workplace.id)}
                                className="text-destructive border-destructive/50 hover:bg-destructive/10"
                              >
                                <XCircle className="h-4 w-4 mr-1.5" />
                                Deaktiv et
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isMutatingThis}
                                onClick={() => activateMutation.mutate(workplace.id)}
                                className="text-green-600 border-green-600/50 hover:bg-green-50 dark:hover:bg-green-950/30"
                              >
                                <CheckCircle className="h-4 w-4 mr-1.5" />
                                Aktivləşdir
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditWorkplace(workplace)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Vəzifə:</span>
                            <p className="font-medium">{workplace.position_type_label}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">İşçi növü:</span>
                            <p className="font-medium">{workplace.employment_type_label}</p>
                          </div>
                          {workplace.weekly_hours && (
                            <div>
                              <span className="text-muted-foreground">Həftəlik saat:</span>
                              <p className="font-medium">{workplace.weekly_hours} saat</p>
                            </div>
                          )}
                          {workplace.formatted_subjects && (
                            <div>
                              <span className="text-muted-foreground">Fənlər:</span>
                              <p className="font-medium">{workplace.formatted_subjects}</p>
                            </div>
                          )}
                          {workplace.start_date && (
                            <div>
                              <span className="text-muted-foreground">Başlama:</span>
                              <p className="font-medium">
                                {format(new Date(workplace.start_date), 'dd MMM yyyy', {
                                  locale: az,
                                })}
                              </p>
                            </div>
                          )}
                          {workplace.end_date && (
                            <div>
                              <span className="text-muted-foreground">Bitmə:</span>
                              <p className="font-medium">
                                {format(new Date(workplace.end_date), 'dd MMM yyyy', {
                                  locale: az,
                                })}
                              </p>
                            </div>
                          )}
                        </div>

                        {workplace.formatted_work_days && (
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">İş günləri:</span>
                            <p className="mt-1">{workplace.formatted_work_days}</p>
                          </div>
                        )}

                        {workplace.notes && (
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">Qeydlər:</span>
                            <p className="mt-1 text-muted-foreground italic">{workplace.notes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Hələ əlavə iş yeri yoxdur</p>
                  <Button onClick={handleAddWorkplace} variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    İlk iş yerini əlavə et
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ==================== PERFORMANCE TAB ==================== */}
            <TabsContent
              value="performance"
              className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Performans məlumatları
              </h3>

              {/* Overall performance rating */}
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Ümumi performans reytinqi
                  </h4>
                  {teacher.performance_rating ? (
                    <Badge variant={getPerformanceColor(teacher.performance_rating)}>
                      {teacher.performance_rating >= 4.5
                        ? 'Əla'
                        : teacher.performance_rating >= 3.5
                        ? 'Yaxşı'
                        : teacher.performance_rating >= 2.5
                        ? 'Orta'
                        : 'Zəif'}
                    </Badge>
                  ) : null}
                </div>

                {teacher.performance_rating ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <StarRating value={teacher.performance_rating} />
                      <span className="text-2xl font-bold tabular-nums">
                        {teacher.performance_rating.toFixed(1)}
                        <span className="text-sm font-normal text-muted-foreground"> / 5.0</span>
                      </span>
                    </div>
                    <Progress value={performancePercent} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">
                      {performancePercent.toFixed(0)}%
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Qiymətləndirilməyib</p>
                )}
              </div>

              <Separator />

              {/* Metrics grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Experience */}
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Pedaqoji təcrübə
                    </span>
                  </div>
                  {teacher.experience_years != null ? (
                    <div className="space-y-1.5">
                      <div className="flex items-end gap-1.5">
                        <span className="text-3xl font-bold tabular-nums">
                          {teacher.experience_years}
                        </span>
                        <span className="text-sm text-muted-foreground mb-1">il</span>
                      </div>
                      {/* Visual bar: cap at 40 years */}
                      <Progress
                        value={Math.min((teacher.experience_years / 40) * 100, 100)}
                        className="h-1.5"
                      />
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Məlumat yoxdur</p>
                  )}
                </div>

                {/* MIQ score */}
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">MİQ balı</span>
                  </div>
                  {miqPercent != null ? (
                    <div className="space-y-1.5">
                      <div className="flex items-end gap-1.5">
                        <span className="text-3xl font-bold tabular-nums">
                          {teacher.miq_score}
                        </span>
                        <span className="text-sm text-muted-foreground mb-1">/ 100</span>
                      </div>
                      <Progress value={miqPercent} className="h-1.5" />
                      <p className="text-xs text-muted-foreground text-right">
                        {miqPercent.toFixed(0)}%
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Məlumat yoxdur</p>
                  )}
                </div>

                {/* Certification score */}
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Sertifikasiya balı
                    </span>
                  </div>
                  {certPercent != null ? (
                    <div className="space-y-1.5">
                      <div className="flex items-end gap-1.5">
                        <span className="text-3xl font-bold tabular-nums">
                          {teacher.certification_score}
                        </span>
                        <span className="text-sm text-muted-foreground mb-1">/ 100</span>
                      </div>
                      <Progress value={certPercent} className="h-1.5" />
                      <p className="text-xs text-muted-foreground text-right">
                        {certPercent.toFixed(0)}%
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Məlumat yoxdur</p>
                  )}
                </div>

                {/* Last certification date */}
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Son sertifikasiya tarixi
                    </span>
                  </div>
                  {teacher.last_certification_date ? (
                    <p className="text-lg font-semibold">
                      {format(new Date(teacher.last_certification_date), 'dd MMMM yyyy', {
                        locale: az,
                      })}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">Məlumat yoxdur</p>
                  )}
                </div>
              </div>

              {/* No data fallback */}
              {!teacher.performance_rating &&
                teacher.experience_years == null &&
                teacher.miq_score == null &&
                teacher.certification_score == null &&
                !teacher.last_certification_date && (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Performans məlumatları hələ daxil edilməyib</p>
                  </div>
                )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Workplace Management Modal */}
      <WorkplaceManagementModal
        open={workplaceModalOpen}
        onClose={() => {
          setWorkplaceModalOpen(false);
          setSelectedWorkplace(null);
        }}
        teacherId={teacher.id}
        workplace={selectedWorkplace}
        onSuccess={refetchWorkplaces}
      />
    </>
  );
};
