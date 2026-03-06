import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit,
  BookOpen,
  Star,
  Clock,
  Award,
  Briefcase,
  Building,
  Plus
} from 'lucide-react';
import { SchoolTeacher } from '@/services/schoolAdmin';
import { useQuery } from '@tanstack/react-query';
import { teacherService } from '@/services/teachers';
import { WorkplaceManagementModal } from '@/components/modals/WorkplaceManagementModal';
import { TeacherWorkplace, WORKPLACE_PRIORITY_LABELS } from '@/types/teacher';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

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

export const TeacherDetailsDialog: React.FC<TeacherDetailsDialogProps> = ({
  teacher,
  isOpen,
  onClose,
  onEdit,
  getDepartmentText,
  getPositionText,
  getPerformanceColor,
  getWorkloadColor
}) => {
  const [workplaceModalOpen, setWorkplaceModalOpen] = useState(false);
  const [selectedWorkplace, setSelectedWorkplace] = useState<TeacherWorkplace | null>(null);

  // Load teacher workplaces
  const { data: workplaces, refetch: refetchWorkplaces } = useQuery({
    queryKey: ['teacher', teacher?.id, 'workplaces'],
    queryFn: () => teacherService.getTeacherWorkplaces(teacher!.id),
    enabled: isOpen && !!teacher,
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">
                <Users className="h-4 w-4 mr-2" />
                Ümumi məlumat
              </TabsTrigger>
              <TabsTrigger value="workplaces">
                <Building className="h-4 w-4 mr-2" />
                İş yerləri ({workplaces?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Ad və Soyad</label>
              <p className="text-foreground">{teacher.first_name} {teacher.last_name}</p>
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
              <label className="text-sm font-medium text-muted-foreground">Performans reytinqi</label>
              <div className="space-y-2">
                {teacher.performance_rating ? (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-lg font-bold">{teacher.performance_rating.toFixed(1)}</span>
                    <Badge variant={getPerformanceColor(teacher.performance_rating)}>
                      {teacher.performance_rating >= 4.5 ? 'Əla' : 
                       teacher.performance_rating >= 3.5 ? 'Yaxşı' : 
                       teacher.performance_rating >= 2.5 ? 'Orta' : 'Zəif'}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Qiymətləndirilməyib</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Həftəlik iş saatı</label>
              <div className="space-y-2">
                {teacher.weekly_hours ? (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="text-lg font-bold">{teacher.weekly_hours} saat</span>
                    <Badge variant={getWorkloadColor(teacher.weekly_hours)}>
                      {teacher.weekly_hours >= 35 ? 'Həddindən artıq' : 
                       teacher.weekly_hours >= 25 ? 'Yüksək' : 
                       teacher.weekly_hours >= 15 ? 'Normal' : 'Az'}
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
                  {teacher.subjects.map((subject, index) => (
                    <div key={index} className="p-2 bg-muted/30 rounded text-sm">
                      <div className="font-medium">{subject.name}</div>
                      {subject.hours_per_week && (
                        <div className="text-xs text-muted-foreground">{subject.hours_per_week} saat/həftə</div>
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
                  {teacher.classes.map((classInfo, index) => (
                    <div key={index} className="p-3 bg-muted/30 rounded">
                      <div className="font-medium">{classInfo.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {classInfo.student_count} şagird
                      </div>
                      {classInfo.is_class_teacher && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Sinif rəhbəri
                        </Badge>
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
                  <label className="text-sm font-medium text-muted-foreground">Sertifikatlar</label>
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
              <label className="text-sm font-medium text-muted-foreground">İşə başlama tarixi</label>
              <p className="text-foreground">
                {teacher.hire_date 
                  ? format(new Date(teacher.hire_date), 'dd MMMM yyyy', { locale: az })
                  : 'Məlumat yoxdur'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Son yeniləmə</label>
              <p className="text-foreground">
                {teacher.updated_at 
                  ? format(new Date(teacher.updated_at), 'dd MMMM yyyy', { locale: az })
                  : 'Məlumat yoxdur'
                }
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

            {/* Workplaces Tab */}
            <TabsContent value="workplaces" className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">İş yerləri</h3>
                <Button onClick={handleAddWorkplace} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni iş yeri
                </Button>
              </div>

              {workplaces && workplaces.length > 0 ? (
                <div className="space-y-3">
                  {workplaces.map((workplace) => (
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
                              variant={workplace.status === 'active' ? 'default' : 'secondary'}
                            >
                              {workplace.status_label}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditWorkplace(workplace)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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
                  ))}
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