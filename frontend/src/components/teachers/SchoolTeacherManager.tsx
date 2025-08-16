import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Search, 
  Plus,
  UserPlus,
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
  User,
  Star,
  Clock,
  Award,
  Briefcase,
  Building
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { schoolAdminService, schoolAdminKeys, SchoolTeacher } from '@/services/schoolAdmin';
import { PaginationParams } from '@/services/BaseService';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SchoolTeacherManagerProps {
  className?: string;
}

interface TeacherFilters extends PaginationParams {
  department?: string;
  position?: string;
  subject?: string;
  is_active?: boolean;
}

export const SchoolTeacherManager: React.FC<SchoolTeacherManagerProps> = ({ className }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<TeacherFilters>({
    page: 1,
    per_page: 20,
  });
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState<SchoolTeacher | null>(null);

  // Fetch teachers
  const { 
    data: teachers, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: schoolAdminKeys.teachers(),
    queryFn: () => schoolAdminService.getTeachers(filters),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Teacher update mutation
  const updateTeacherMutation = useMutation({
    mutationFn: ({ teacherId, data }: { teacherId: number; data: Partial<SchoolTeacher> }) =>
      schoolAdminService.updateTeacher(teacherId, data),
    onSuccess: () => {
      toast.success('Müəllim məlumatları yeniləndi');
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.teachers() });
    },
    onError: () => {
      toast.error('Yeniləmə zamanı xəta baş verdi');
    },
  });

  const getDepartmentText = (department?: string) => {
    const departments: Record<string, string> = {
      'academic': 'Akademik',
      'administrative': 'İnzibati',
      'support': 'Dəstək',
      'science': 'Elm',
      'humanities': 'Humanitar',
      'arts': 'İncəsənət',
      'sports': 'İdman',
      'language': 'Dil',
      'mathematics': 'Riyaziyyat',
      'other': 'Digər'
    };
    return departments[department || ''] || department || 'Təyin edilməyib';
  };

  const getPositionText = (position?: string) => {
    const positions: Record<string, string> = {
      'teacher': 'Müəllim',
      'senior_teacher': 'Böyük müəllim',
      'head_teacher': 'Sinif rəhbəri',
      'department_head': 'Şöbə müdiri',
      'deputy_principal': 'Direktor müavini',
      'principal': 'Direktor',
      'substitute': 'Əvəzedici müəllim',
      'intern': 'Stajçı',
      'coordinator': 'Koordinator'
    };
    return positions[position || ''] || position || 'Təyin edilməyib';
  };

  const getPerformanceColor = (rating?: number) => {
    if (!rating) return 'secondary';
    if (rating >= 4.5) return 'success';
    if (rating >= 3.5) return 'primary';
    if (rating >= 2.5) return 'warning';
    return 'destructive';
  };

  const getWorkloadColor = (hours?: number) => {
    if (!hours) return 'secondary';
    if (hours >= 35) return 'destructive';
    if (hours >= 25) return 'warning';
    if (hours >= 15) return 'primary';
    return 'success';
  };

  const filteredTeachers = teachers?.filter(teacher => {
    const matchesSearch = !searchTerm || 
      teacher.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = selectedTab === 'all' || 
      (selectedTab === 'active' && teacher.is_active) ||
      (selectedTab === 'inactive' && !teacher.is_active);
    
    return matchesSearch && matchesTab;
  }) || [];

  const teacherStats = {
    total: teachers?.length || 0,
    active: teachers?.filter(t => t.is_active).length || 0,
    inactive: teachers?.filter(t => !t.is_active).length || 0,
    high_performers: teachers?.filter(t => t.performance_rating && t.performance_rating >= 4.0).length || 0,
    overloaded: teachers?.filter(t => t.workload_hours && t.workload_hours >= 35).length || 0,
  };

  const TeacherCard: React.FC<{ teacher: SchoolTeacher }> = ({ teacher }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-purple-600" />
          </div>

          {/* Teacher Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {teacher.first_name} {teacher.last_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {getPositionText(teacher.position)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ID: {teacher.employee_id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={teacher.is_active ? 'success' : 'secondary'}>
                  {teacher.is_active ? 'Aktiv' : 'Passiv'}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedTeacher(teacher)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ətraflı bax
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Redaktə et
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Calendar className="h-4 w-4 mr-2" />
                      Cədvəl bax
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Award className="h-4 w-4 mr-2" />
                      Performans
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="h-4 w-4 mr-2" />
                      Hesabat al
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Teacher Details */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-4 w-4" />
                  <span>{getDepartmentText(teacher.department)}</span>
                </div>
                
                {teacher.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{teacher.email}</span>
                  </div>
                )}

                {teacher.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{teacher.phone}</span>
                  </div>
                )}

                {teacher.hire_date && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>İşə başlama: {format(new Date(teacher.hire_date), 'dd.MM.yyyy', { locale: az })}</span>
                  </div>
                )}
              </div>

              {/* Performance & Workload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teacher.performance_rating && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Performans
                      </span>
                      <Badge variant={getPerformanceColor(teacher.performance_rating)} className="text-xs">
                        {teacher.performance_rating.toFixed(1)}/5.0
                      </Badge>
                    </div>
                    <Progress value={(teacher.performance_rating / 5) * 100} className="h-2" />
                  </div>
                )}

                {teacher.workload_hours && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        İş yükü
                      </span>
                      <Badge variant={getWorkloadColor(teacher.workload_hours)} className="text-xs">
                        {teacher.workload_hours} saat/həftə
                      </Badge>
                    </div>
                    <Progress value={(teacher.workload_hours / 40) * 100} className="h-2" />
                  </div>
                )}
              </div>

              {/* Subjects */}
              {teacher.subjects && teacher.subjects.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Dərslər:</div>
                  <div className="flex flex-wrap gap-1">
                    {teacher.subjects.slice(0, 3).map((subject, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                    {teacher.subjects.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{teacher.subjects.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Classes */}
              {teacher.classes && teacher.classes.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Siniflər:</div>
                  <div className="flex flex-wrap gap-1">
                    {teacher.classes.slice(0, 4).map((classId, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        Sinif {classId}
                      </Badge>
                    ))}
                    {teacher.classes.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{teacher.classes.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
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
              <h3 className="text-lg font-medium mb-2">Müəllimlər yüklənərkən xəta baş verdi</h3>
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
          <h2 className="text-2xl font-bold text-foreground">Müəllim İdarəetməsi</h2>
          <p className="text-muted-foreground">
            Məktəb müəllimlərini idarə edin və izləyin
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
            Yeni Müəllim
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
                <p className="text-2xl font-bold">{teacherStats.total}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv</p>
                <p className="text-2xl font-bold text-green-600">{teacherStats.active}</p>
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
                <p className="text-2xl font-bold text-gray-600">{teacherStats.inactive}</p>
              </div>
              <User className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Yüksək performans</p>
                <p className="text-2xl font-bold text-purple-600">{teacherStats.high_performers}</p>
              </div>
              <Star className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Yüklü cədvəl</p>
                <p className="text-2xl font-bold text-orange-600">{teacherStats.overloaded}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
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
                  placeholder="Ad, soyad, ID və ya e-mail ilə axtarın..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filters.department || 'all'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, department: value === 'all' ? undefined : value }))
              }>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Şöbə seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün şöbələr</SelectItem>
                  <SelectItem value="academic">Akademik</SelectItem>
                  <SelectItem value="science">Elm</SelectItem>
                  <SelectItem value="humanities">Humanitar</SelectItem>
                  <SelectItem value="mathematics">Riyaziyyat</SelectItem>
                  <SelectItem value="language">Dil</SelectItem>
                  <SelectItem value="arts">İncəsənət</SelectItem>
                  <SelectItem value="sports">İdman</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.position || 'all'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, position: value === 'all' ? undefined : value }))
              }>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Vəzifə seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün vəzifələr</SelectItem>
                  <SelectItem value="teacher">Müəllim</SelectItem>
                  <SelectItem value="senior_teacher">Böyük müəllim</SelectItem>
                  <SelectItem value="head_teacher">Sinif rəhbəri</SelectItem>
                  <SelectItem value="department_head">Şöbə müdiri</SelectItem>
                  <SelectItem value="deputy_principal">Direktor müavini</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.is_active?.toString() || 'all'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, is_active: value === 'all' ? undefined : value === 'true' }))
              }>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün statuslar</SelectItem>
                  <SelectItem value="true">Aktiv</SelectItem>
                  <SelectItem value="false">Passiv</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teacher Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            Hamısı ({teacherStats.total})
          </TabsTrigger>
          <TabsTrigger value="active">
            Aktiv ({teacherStats.active})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Passiv ({teacherStats.inactive})
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
          ) : filteredTeachers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeachers.map(teacher => (
                <TeacherCard key={teacher.id} teacher={teacher} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Müəllim tapılmadı</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 
                      'Axtarış kriteriyasına uyğun müəllim tapılmadı' : 
                      selectedTab === 'all' ? 
                        'Hələ ki məktəbdə qeydiyyatda olan müəllim yoxdur' :
                        `${selectedTab === 'active' ? 'Aktiv' : 'Passiv'} müəllim yoxdur`
                    }
                  </p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    İlk müəllimi əlavə et
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Teacher Details Modal */}
      {selectedTeacher && (
        <Dialog open={!!selectedTeacher} onOpenChange={(open) => !open && setSelectedTeacher(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {selectedTeacher.first_name} {selectedTeacher.last_name} - Ətraflı məlumat
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">İşçi ID</label>
                  <p className="text-foreground">{selectedTeacher.employee_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div>
                    <Badge variant={selectedTeacher.is_active ? 'success' : 'secondary'}>
                      {selectedTeacher.is_active ? 'Aktiv' : 'Passiv'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Vəzifə</label>
                  <p className="text-foreground">{getPositionText(selectedTeacher.position)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Şöbə</label>
                  <p className="text-foreground">{getDepartmentText(selectedTeacher.department)}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Əlaqə məlumatları</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">E-mail</label>
                    <p className="text-foreground">{selectedTeacher.email}</p>
                  </div>
                  {selectedTeacher.phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefon</label>
                      <p className="text-foreground">{selectedTeacher.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Peşəkar məlumatlar</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">İşə başlama tarixi</label>
                    <p className="text-foreground">
                      {format(new Date(selectedTeacher.hire_date), 'dd MMMM yyyy', { locale: az })}
                    </p>
                  </div>
                  {selectedTeacher.workload_hours && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Həftəlik iş yükü</label>
                      <p className="text-foreground">{selectedTeacher.workload_hours} saat</p>
                    </div>
                  )}
                  {selectedTeacher.performance_rating && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Performans reytinqi</label>
                      <div className="flex items-center gap-2">
                        <p className="text-foreground">{selectedTeacher.performance_rating.toFixed(1)}/5.0</p>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i}
                              className={cn(
                                "h-4 w-4",
                                i < Math.floor(selectedTeacher.performance_rating!) 
                                  ? "fill-yellow-400 text-yellow-400" 
                                  : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subjects & Classes */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Dərslər və siniflər</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTeacher.subjects && selectedTeacher.subjects.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tədris etdiyi dərslər</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedTeacher.subjects.map((subject, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedTeacher.classes && selectedTeacher.classes.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Məsul olduğu siniflər</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedTeacher.classes.map((classId, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            Sinif {classId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedTeacher(null)}>
                  Bağla
                </Button>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Cədvəl
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
    </div>
  );
};