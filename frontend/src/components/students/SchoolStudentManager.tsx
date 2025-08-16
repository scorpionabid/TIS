import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  Search, 
  Plus,
  UserPlus,
  UserMinus,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
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
  User
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { schoolAdminService, schoolAdminKeys } from '@/services/schoolAdmin';
import { Student } from '@/services/students';
import { PaginationParams } from '@/services/BaseService';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SchoolStudentManagerProps {
  className?: string;
}

interface StudentFilters extends PaginationParams {
  class_id?: number;
  grade_level?: number;
  enrollment_status?: 'active' | 'inactive' | 'transferred' | 'graduated';
  gender?: 'male' | 'female';
}

export const SchoolStudentManager: React.FC<SchoolStudentManagerProps> = ({ className }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<StudentFilters>({
    page: 1,
    per_page: 20,
  });
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);

  // Fetch students
  const { 
    data: students, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: schoolAdminKeys.students(),
    queryFn: () => schoolAdminService.getSchoolStudents(filters),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch classes for enrollment
  const { 
    data: classes 
  } = useQuery({
    queryKey: schoolAdminKeys.classes(),
    queryFn: () => schoolAdminService.getClasses(),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Student enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: ({ studentId, classId }: { studentId: number; classId: number }) =>
      schoolAdminService.enrollStudent(studentId, classId),
    onSuccess: () => {
      toast.success('Şagird sinifə yazıldı');
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.students() });
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.classes() });
      setEnrollmentModalOpen(false);
    },
    onError: () => {
      toast.error('Yazılma zamanı xəta baş verdi');
    },
  });

  // Student unenrollment mutation
  const unenrollMutation = useMutation({
    mutationFn: ({ studentId, classId }: { studentId: number; classId: number }) =>
      schoolAdminService.unenrollStudent(studentId, classId),
    onSuccess: () => {
      toast.success('Şagird sinifdən çıxarıldı');
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.students() });
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.classes() });
    },
    onError: () => {
      toast.error('Çıxarma zamanı xəta baş verdi');
    },
  });

  const getGenderText = (gender?: string) => {
    switch (gender) {
      case 'male': return 'Oğlan';
      case 'female': return 'Qız';
      default: return 'Təyin edilməyib';
    }
  };

  const getEnrollmentStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'secondary';
      case 'transferred': return 'warning';
      case 'graduated': return 'primary';
      default: return 'secondary';
    }
  };

  const getEnrollmentStatusText = (status?: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'inactive': return 'Passiv';
      case 'transferred': return 'Köçürülüb';
      case 'graduated': return 'Məzun olub';
      default: return 'Naməlum';
    }
  };

  const handleEnrollStudent = (student: Student, classId: number) => {
    enrollMutation.mutate({ studentId: student.id, classId });
  };

  const handleUnenrollStudent = (student: Student, classId: number) => {
    unenrollMutation.mutate({ studentId: student.id, classId });
  };

  const filteredStudents = students?.filter(student => {
    const matchesSearch = !searchTerm || 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = selectedTab === 'all' || student.enrollment_status === selectedTab;
    
    return matchesSearch && matchesTab;
  }) || [];

  const studentStats = {
    total: students?.length || 0,
    active: students?.filter(s => s.enrollment_status === 'active').length || 0,
    inactive: students?.filter(s => s.enrollment_status === 'inactive').length || 0,
    transferred: students?.filter(s => s.enrollment_status === 'transferred').length || 0,
    graduated: students?.filter(s => s.enrollment_status === 'graduated').length || 0,
  };

  const StudentCard: React.FC<{ student: Student }> = ({ student }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-blue-600" />
          </div>

          {/* Student Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {student.first_name} {student.last_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  ID: {student.student_id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getEnrollmentStatusColor(student.enrollment_status)}>
                  {getEnrollmentStatusText(student.enrollment_status)}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedStudent(student)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ətraflı bax
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Redaktə et
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setSelectedStudent(student);
                      setEnrollmentModalOpen(true);
                    }}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Sinifə yaz
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="h-4 w-4 mr-2" />
                      Hesabat al
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Student Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {student.date_of_birth && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Doğum tarixi: {format(new Date(student.date_of_birth), 'dd.MM.yyyy', { locale: az })}</span>
                </div>
              )}
              
              {student.gender && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{getGenderText(student.gender)}</span>
                </div>
              )}

              {student.grade_level && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  <span>{student.grade_level}. sinif</span>
                </div>
              )}

              {student.enrollment_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>Qeydiyyat: {format(new Date(student.enrollment_date), 'dd.MM.yyyy', { locale: az })}</span>
                </div>
              )}

              {student.guardian_phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{student.guardian_phone}</span>
                </div>
              )}

              {student.guardian_email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{student.guardian_email}</span>
                </div>
              )}
            </div>

            {/* Current Classes */}
            {student.current_classes && student.current_classes.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-muted-foreground mb-1">Cari siniflər:</div>
                <div className="flex flex-wrap gap-1">
                  {student.current_classes.map((cls, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {cls}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Şagirdlər yüklənərkən xəta baş verdi</h3>
              <p className="text-muted-foreground mb-4">
                Zəhmət olmasa yenidən cəhd edin
              </p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Yenidən cəhd et
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Şagird İdarəetməsi</h2>
          <p className="text-muted-foreground">
            Məktəb şagirdlərini idarə edin və izləyin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Yenilə
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            İdxal et
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            İxrac et
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Şagird
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi</p>
                <p className="text-2xl font-bold">{studentStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv</p>
                <p className="text-2xl font-bold text-green-600">{studentStats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Passiv</p>
                <p className="text-2xl font-bold text-gray-600">{studentStats.inactive}</p>
              </div>
              <User className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Köçürülüb</p>
                <p className="text-2xl font-bold text-orange-600">{studentStats.transferred}</p>
              </div>
              <UserMinus className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Məzun</p>
                <p className="text-2xl font-bold text-blue-600">{studentStats.graduated}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ad, soyad və ya şagird ID-si ilə axtarın..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filters.class_id?.toString() || 'all'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, class_id: value === 'all' ? undefined : parseInt(value) }))
              }>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sinif seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün siniflər</SelectItem>
                  {classes?.map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filters.enrollment_status || 'all'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, enrollment_status: value === 'all' ? undefined : value as any }))
              }>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün statuslar</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="inactive">Passiv</SelectItem>
                  <SelectItem value="transferred">Köçürülüb</SelectItem>
                  <SelectItem value="graduated">Məzun</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.gender || 'all'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, gender: value === 'all' ? undefined : value as any }))
              }>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Cins seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  <SelectItem value="male">Oğlan</SelectItem>
                  <SelectItem value="female">Qız</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            Hamısı ({studentStats.total})
          </TabsTrigger>
          <TabsTrigger value="active">
            Aktiv ({studentStats.active})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Passiv ({studentStats.inactive})
          </TabsTrigger>
          <TabsTrigger value="transferred">
            Köçürülüb ({studentStats.transferred})
          </TabsTrigger>
          <TabsTrigger value="graduated">
            Məzun ({studentStats.graduated})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-muted rounded-full" />
                      <div className="flex-1 space-y-3">
                        <div className="w-3/4 h-5 bg-muted rounded" />
                        <div className="w-full h-4 bg-muted rounded" />
                        <div className="w-1/2 h-3 bg-muted rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredStudents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map(student => (
                <StudentCard key={student.id} student={student} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Şagird tapılmadı</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 
                      'Axtarış kriteriyasına uyğun şagird tapılmadı' : 
                      selectedTab === 'all' ? 
                        'Hələ ki məktəbdə qeydiyyatda olan şagird yoxdur' :
                        `${getEnrollmentStatusText(selectedTab as any)} statusunda şagird yoxdur`
                    }
                  </p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    İlk şagirdi əlavə et
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Student Details Modal */}
      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedStudent.first_name} {selectedStudent.last_name} - Ətraflı məlumat
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Şagird ID</label>
                  <p className="text-foreground">{selectedStudent.student_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div>
                    <Badge variant={getEnrollmentStatusColor(selectedStudent.enrollment_status)}>
                      {getEnrollmentStatusText(selectedStudent.enrollment_status)}
                    </Badge>
                  </div>
                </div>
                {selectedStudent.date_of_birth && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Doğum tarixi</label>
                    <p className="text-foreground">
                      {format(new Date(selectedStudent.date_of_birth), 'dd MMMM yyyy', { locale: az })}
                    </p>
                  </div>
                )}
                {selectedStudent.gender && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cins</label>
                    <p className="text-foreground">{getGenderText(selectedStudent.gender)}</p>
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Əlaqə məlumatları</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedStudent.guardian_name && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Valideyn adı</label>
                      <p className="text-foreground">{selectedStudent.guardian_name}</p>
                    </div>
                  )}
                  {selectedStudent.guardian_phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefon</label>
                      <p className="text-foreground">{selectedStudent.guardian_phone}</p>
                    </div>
                  )}
                  {selectedStudent.guardian_email && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">E-mail</label>
                      <p className="text-foreground">{selectedStudent.guardian_email}</p>
                    </div>
                  )}
                  {selectedStudent.address && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Ünvan</label>
                      <p className="text-foreground">{selectedStudent.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Academic Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Akademik məlumatlar</h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedStudent.grade_level && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Sinif səviyyəsi</label>
                      <p className="text-foreground">{selectedStudent.grade_level}. sinif</p>
                    </div>
                  )}
                  {selectedStudent.enrollment_date && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Qeydiyyat tarixi</label>
                      <p className="text-foreground">
                        {format(new Date(selectedStudent.enrollment_date), 'dd MMMM yyyy', { locale: az })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedStudent(null)}>
                  Bağla
                </Button>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Redaktə et
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Enrollment Modal */}
      <Dialog open={enrollmentModalOpen} onOpenChange={setEnrollmentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şagirdi sinifə yaz</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedStudent && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </p>
                <p className="text-sm text-muted-foreground">ID: {selectedStudent.student_id}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Sinif seçin</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Sinif seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name} ({cls.current_enrollment}/{cls.capacity} şagird)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEnrollmentModalOpen(false)}>
                Ləğv et
              </Button>
              <Button 
                onClick={() => {
                  // Implementation for enrollment
                  toast.success('Yazılma funksionallığı tezliklə əlavə olunacaq');
                  setEnrollmentModalOpen(false);
                }}
                disabled={enrollMutation.isPending}
              >
                {enrollMutation.isPending ? 'Yazılır...' : 'Sinifə yaz'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};