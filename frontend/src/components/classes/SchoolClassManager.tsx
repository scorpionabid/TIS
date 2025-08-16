import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { 
  School, 
  Search, 
  Plus,
  Users,
  GraduationCap,
  Calendar,
  Clock,
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
  Settings,
  UserPlus,
  Copy,
  Trash2,
  CalendarDays
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { schoolAdminService, schoolAdminKeys, SchoolClass } from '@/services/schoolAdmin';
import { PaginationParams } from '@/services/BaseService';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SchoolClassManagerProps {
  className?: string;
}

interface ClassFilters extends PaginationParams {
  grade_level?: number;
  academic_year?: string;
  is_active?: boolean;
  class_teacher_id?: number;
}

export const SchoolClassManager: React.FC<SchoolClassManagerProps> = ({ className }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ClassFilters>({
    page: 1,
    per_page: 20,
  });
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newClassData, setNewClassData] = useState({
    name: '',
    grade_level: '',
    room_number: '',
    capacity: '',
    class_teacher_id: '',
    academic_year: new Date().getFullYear().toString(),
  });

  // Fetch classes
  const { 
    data: classes, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: schoolAdminKeys.classes(),
    queryFn: () => schoolAdminService.getClasses(filters),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch teachers for class teacher assignment
  const { 
    data: teachers 
  } = useQuery({
    queryKey: schoolAdminKeys.teachers(),
    queryFn: () => schoolAdminService.getTeachers(),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: (data: Partial<SchoolClass>) => schoolAdminService.createClass(data),
    onSuccess: () => {
      toast.success('Sinif uğurla yaradıldı');
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.classes() });
      setCreateModalOpen(false);
      setNewClassData({
        name: '',
        grade_level: '',
        room_number: '',
        capacity: '',
        class_teacher_id: '',
        academic_year: new Date().getFullYear().toString(),
      });
    },
    onError: () => {
      toast.error('Sinif yaradıla bilmədi');
    },
  });

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: ({ classId, data }: { classId: number; data: Partial<SchoolClass> }) =>
      schoolAdminService.updateClass(classId, data),
    onSuccess: () => {
      toast.success('Sinif məlumatları yeniləndi');
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.classes() });
    },
    onError: () => {
      toast.error('Yeniləmə zamanı xəta baş verdi');
    },
  });

  const getCapacityColor = (current: number, total: number) => {
    const percentage = (current / total) * 100;
    if (percentage >= 95) return 'destructive';
    if (percentage >= 80) return 'warning';
    if (percentage >= 60) return 'primary';
    return 'success';
  };

  const getGradeLevelText = (level: number) => {
    if (level === 0) return 'Anasinifi';
    if (level <= 4) return `${level}. sinif (İbtidai)`;
    if (level <= 9) return `${level}. sinif (Orta)`;
    if (level <= 11) return `${level}. sinif (Tam orta)`;
    return `${level}. sinif`;
  };

  const getCurrentAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    // Academic year starts in September (month 8)
    return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  const handleCreateClass = () => {
    const data = {
      name: newClassData.name,
      grade_level: parseInt(newClassData.grade_level),
      academic_year: newClassData.academic_year,
      room_number: newClassData.room_number || undefined,
      capacity: parseInt(newClassData.capacity),
      class_teacher_id: newClassData.class_teacher_id ? parseInt(newClassData.class_teacher_id) : undefined,
      is_active: true,
    };
    createClassMutation.mutate(data);
  };

  const filteredClasses = classes?.filter(cls => {
    const matchesSearch = !searchTerm || 
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.class_teacher?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = selectedTab === 'all' || 
      (selectedTab === 'active' && cls.is_active) ||
      (selectedTab === 'inactive' && !cls.is_active);
    
    return matchesSearch && matchesTab;
  }) || [];

  const classStats = {
    total: classes?.length || 0,
    active: classes?.filter(c => c.is_active).length || 0,
    inactive: classes?.filter(c => !c.is_active).length || 0,
    overcrowded: classes?.filter(c => c.current_enrollment > c.capacity * 0.9).length || 0,
    needs_teacher: classes?.filter(c => !c.class_teacher_id && c.is_active).length || 0,
  };

  const ClassCard: React.FC<{ schoolClass: SchoolClass }> = ({ schoolClass }) => {
    const capacityPercentage = (schoolClass.current_enrollment / schoolClass.capacity) * 100;
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Class Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
                  <School className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{schoolClass.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getGradeLevelText(schoolClass.grade_level)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {schoolClass.academic_year} akademik ili
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={schoolClass.is_active ? 'success' : 'secondary'}>
                  {schoolClass.is_active ? 'Aktiv' : 'Passiv'}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedClass(schoolClass)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ətraflı bax
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Redaktə et
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Users className="h-4 w-4 mr-2" />
                      Şagirdlər
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Cədvəl
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Davamiyyət
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopyala
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="h-4 w-4 mr-2" />
                      Hesabat al
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Class Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {schoolClass.room_number && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Otaq: {schoolClass.room_number}</span>
                </div>
              )}
              
              {schoolClass.class_teacher && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="truncate">{schoolClass.class_teacher.name}</span>
                </div>
              )}

              {!schoolClass.class_teacher && schoolClass.is_active && (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Sinif rəhbəri təyin edilməyib</span>
                </div>
              )}
            </div>

            {/* Enrollment Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Şagird sayı</span>
                <span className="font-medium">
                  {schoolClass.current_enrollment}/{schoolClass.capacity}
                </span>
              </div>
              <Progress 
                value={capacityPercentage} 
                className="h-2"
                // @ts-ignore
                indicatorClassName={cn(
                  capacityPercentage >= 95 && "bg-red-500",
                  capacityPercentage >= 80 && capacityPercentage < 95 && "bg-orange-500",
                  capacityPercentage < 80 && "bg-green-500"
                )}
              />
              {capacityPercentage >= 95 && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Tutum həddini aşıb
                </p>
              )}
              {capacityPercentage >= 80 && capacityPercentage < 95 && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Tutuma yaxın
                </p>
              )}
            </div>

            {/* Schedule Info */}
            {schoolClass.schedule && schoolClass.schedule.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Bu həftəki dərslər:</div>
                <div className="flex flex-wrap gap-1">
                  {schoolClass.schedule.slice(0, 3).map((schedule, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {schedule.subject_name}
                    </Badge>
                  ))}
                  {schoolClass.schedule.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{schoolClass.schedule.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" className="flex-1">
                <Users className="h-3 w-3 mr-1" />
                Şagirdlər
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <BookOpen className="h-3 w-3 mr-1" />
                Davamiyyət
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <CalendarDays className="h-3 w-3 mr-1" />
                Cədvəl
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Siniflər yüklənərkən xəta baş verdi</h3>
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
          <h2 className="text-2xl font-bold text-foreground">Sinif İdarəetməsi</h2>
          <p className="text-muted-foreground">
            Məktəb siniflərini idarə edin və izləyin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Yenilə
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            İxrac et
          </Button>
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Sinif
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Yeni sinif yarat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Sinif adı *</Label>
                  <Input
                    id="name"
                    value={newClassData.name}
                    onChange={(e) => setNewClassData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="məs. 5-A"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grade_level">Sinif səviyyəsi *</Label>
                  <Select 
                    value={newClassData.grade_level} 
                    onValueChange={(value) => setNewClassData(prev => ({ ...prev, grade_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Səviyyə seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Anasinifi</SelectItem>
                      {[...Array(11)].map((_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1}. sinif
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="room_number">Otaq nömrəsi</Label>
                    <Input
                      id="room_number"
                      value={newClassData.room_number}
                      onChange={(e) => setNewClassData(prev => ({ ...prev, room_number: e.target.value }))}
                      placeholder="məs. 201"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacity">Tutum *</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      max="50"
                      value={newClassData.capacity}
                      onChange={(e) => setNewClassData(prev => ({ ...prev, capacity: e.target.value }))}
                      placeholder="25"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class_teacher">Sinif rəhbəri</Label>
                  <Select 
                    value={newClassData.class_teacher_id} 
                    onValueChange={(value) => setNewClassData(prev => ({ ...prev, class_teacher_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Müəllim seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Hələlik təyin etmə</SelectItem>
                      {teachers?.filter(t => t.is_active).map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          {teacher.first_name} {teacher.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academic_year">Akademik il</Label>
                  <Select 
                    value={newClassData.academic_year} 
                    onValueChange={(value) => setNewClassData(prev => ({ ...prev, academic_year: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={getCurrentAcademicYear()}>{getCurrentAcademicYear()}</SelectItem>
                      <SelectItem value={`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`}>
                        {new Date().getFullYear()}-{new Date().getFullYear() + 1}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                    Ləğv et
                  </Button>
                  <Button 
                    onClick={handleCreateClass}
                    disabled={!newClassData.name || !newClassData.grade_level || !newClassData.capacity || createClassMutation.isPending}
                  >
                    {createClassMutation.isPending ? 'Yaradılır...' : 'Yarat'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi</p>
                <p className="text-2xl font-bold">{classStats.total}</p>
              </div>
              <School className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv</p>
                <p className="text-2xl font-bold text-green-600">{classStats.active}</p>
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
                <p className="text-2xl font-bold text-gray-600">{classStats.inactive}</p>
              </div>
              <Settings className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tutumu dolub</p>
                <p className="text-2xl font-bold text-red-600">{classStats.overcrowded}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rəhbərsiz</p>
                <p className="text-2xl font-bold text-orange-600">{classStats.needs_teacher}</p>
              </div>
              <User className="h-8 w-8 text-orange-600" />
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
                  placeholder="Sinif adı, otaq və ya müəllim adı ilə axtarın..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filters.grade_level?.toString() || 'all'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, grade_level: value === 'all' ? undefined : parseInt(value) }))
              }>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Səviyyə seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün səviyyələr</SelectItem>
                  <SelectItem value="0">Anasinifi</SelectItem>
                  {[...Array(11)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {i + 1}. sinif
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filters.academic_year || 'current'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, academic_year: value === 'current' ? getCurrentAcademicYear() : value }))
              }>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Akademik il" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Cari il</SelectItem>
                  <SelectItem value={getCurrentAcademicYear()}>{getCurrentAcademicYear()}</SelectItem>
                  <SelectItem value={`${new Date().getFullYear() - 1}-${new Date().getFullYear()}`}>
                    {new Date().getFullYear() - 1}-{new Date().getFullYear()}
                  </SelectItem>
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

      {/* Class Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            Hamısı ({classStats.total})
          </TabsTrigger>
          <TabsTrigger value="active">
            Aktiv ({classStats.active})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Passiv ({classStats.inactive})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-lg" />
                        <div className="space-y-2">
                          <div className="w-24 h-5 bg-muted rounded" />
                          <div className="w-32 h-4 bg-muted rounded" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full h-3 bg-muted rounded" />
                        <div className="w-3/4 h-3 bg-muted rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map(schoolClass => (
                <ClassCard key={schoolClass.id} schoolClass={schoolClass} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <School className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Sinif tapılmadı</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 
                      'Axtarış kriteriyasına uyğun sinif tapılmadı' : 
                      selectedTab === 'all' ? 
                        'Hələ ki məktəbdə yaradılmış sinif yoxdur' :
                        `${selectedTab === 'active' ? 'Aktiv' : 'Passiv'} sinif yoxdur`
                    }
                  </p>
                  <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    İlk sinifi yarat
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Class Details Modal */}
      {selectedClass && (
        <Dialog open={!!selectedClass} onOpenChange={(open) => !open && setSelectedClass(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {selectedClass.name} - Ətraflı məlumat
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sinif adı</label>
                  <p className="text-foreground">{selectedClass.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Səviyyə</label>
                  <p className="text-foreground">{getGradeLevelText(selectedClass.grade_level)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Akademik il</label>
                  <p className="text-foreground">{selectedClass.academic_year}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div>
                    <Badge variant={selectedClass.is_active ? 'success' : 'secondary'}>
                      {selectedClass.is_active ? 'Aktiv' : 'Passiv'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Capacity & Teacher */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Şagird sayı</label>
                  <div className="space-y-2">
                    <p className="text-foreground">
                      {selectedClass.current_enrollment} / {selectedClass.capacity}
                    </p>
                    <Progress 
                      value={(selectedClass.current_enrollment / selectedClass.capacity) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Otaq nömrəsi</label>
                  <p className="text-foreground">{selectedClass.room_number || 'Təyin edilməyib'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sinif rəhbəri</label>
                  <p className="text-foreground">
                    {selectedClass.class_teacher?.name || 'Təyin edilməyib'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedClass(null)}>
                  Bağla
                </Button>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Şagirdlər
                </Button>
                <Button variant="outline">
                  <CalendarDays className="h-4 w-4 mr-2" />
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