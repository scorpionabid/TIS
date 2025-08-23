import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Users, 
  GraduationCap,
  School,
  AlertCircle,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Table as TableIcon,
  Grid3X3,
  RefreshCw,
  Upload,
  Download
} from "lucide-react";
import { Student, studentService, StudentFilters } from "@/services/students";
import { institutionService } from "@/services/institutions";
import { useAuth } from "@/contexts/AuthContext";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/common/TablePagination";
import { useToast } from "@/hooks/use-toast";
import { StudentCard } from "@/components/students/StudentCard";
import { StudentDetailsDialog } from "@/components/students/StudentDetailsDialog";
import { EnrollmentModal } from "@/components/students/EnrollmentModal";
import { UserModal } from "@/components/modals/UserModal";
import { ImportModal } from "@/components/import/ImportModal";

interface Institution {
  id: number;
  name: string;
  type?: {
    name: string;
    key: string;
  };
  level?: number;
}

type SortField = 'full_name' | 'student_number' | 'class_name' | 'status' | 'institution' | 'enrollment_date';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';

export default function Students() {
  const { currentUser: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('full_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Modal state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Fetch institutions for filter (based on user role)
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions', 'for-filter'],
    queryFn: () => institutionService.getAll({ per_page: 100 }),
  });

  const availableInstitutions = useMemo(() => {
    if (!institutionsResponse?.data?.data) return [];
    
    // Filter institutions based on user role
    let institutions = institutionsResponse.data.data;
    
    if (!user) return [];
    
    // SuperAdmin sees all institutions
    if (user.role === 'superadmin') {
      return institutions.filter((inst: Institution) => inst.level && inst.level >= 3); // Schools and sectors
    }
    
    // RegionAdmin sees institutions in their region
    if (user.role === 'regionadmin') {
      const userInstitutionId = user.institution_id;
      return institutions.filter((inst: Institution) => 
        inst.id === userInstitutionId || 
        (inst.level && inst.level >= 3) // Schools under their region
      );
    }
    
    // SectorAdmin sees schools in their sector
    if (user.role === 'sektoradmin') {
      const userInstitutionId = user.institution_id;
      return institutions.filter((inst: Institution) => 
        inst.id === userInstitutionId ||
        (inst.level === 4) // Only schools
      );
    }
    
    // School staff see only their institution
    if (user.role === 'məktəbadmin' || user.role === 'müəllim') {
      return institutions.filter((inst: Institution) => inst.id === user.institution_id);
    }
    
    return [];
  }, [institutionsResponse, user]);

  // Fetch students
  const { data: studentsResponse, isLoading, error } = useQuery({
    queryKey: ['students', { 
      search: searchTerm,
      institution_id: institutionFilter === 'all' ? undefined : parseInt(institutionFilter),
      status: statusFilter === 'all' ? undefined : statusFilter,
      grade_level: gradeFilter === 'all' ? undefined : parseInt(gradeFilter),
      per_page: 50
    }],
    queryFn: () => {
      const filters: StudentFilters = {
        search: searchTerm || undefined,
        institution_id: institutionFilter === 'all' ? undefined : parseInt(institutionFilter),
        status: statusFilter === 'all' ? undefined : statusFilter,
        grade_level: gradeFilter === 'all' ? undefined : parseInt(gradeFilter),
        per_page: 50
      };
      return studentService.getAll(filters);
    },
    enabled: !!user,
  });

  const students: Student[] = useMemo(() => {
    return studentsResponse?.students || [];
  }, [studentsResponse]);

  // Statistics
  const stats = useMemo(() => {
    if (!students.length) return { total: 0, active: 0, inactive: 0, graduated: 0 };
    
    return {
      total: students.length,
      active: students.filter(s => s.status === 'active').length,
      inactive: students.filter(s => s.status === 'inactive').length,
      graduated: students.filter(s => s.status === 'graduated').length,
    };
  }, [students]);

  // Sorting and filtering
  const sortedAndFilteredStudents = useMemo(() => {
    let filtered = [...students];

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'full_name':
          aValue = a.full_name?.toLowerCase() || '';
          bValue = b.full_name?.toLowerCase() || '';
          break;
        case 'student_number':
          aValue = a.student_number || '';
          bValue = b.student_number || '';
          break;
        case 'class_name':
          aValue = a.class_name?.toLowerCase() || '';
          bValue = b.class_name?.toLowerCase() || '';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'institution':
          aValue = a.institution?.name?.toLowerCase() || '';
          bValue = b.institution?.name?.toLowerCase() || '';
          break;
        case 'enrollment_date':
          aValue = new Date(a.enrollment_date || 0);
          bValue = new Date(b.enrollment_date || 0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [students, sortField, sortDirection]);

  // Pagination
  const pagination = usePagination(sortedAndFilteredStudents, {
    initialPage: 1,
    initialItemsPerPage: 20
  });

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setInstitutionFilter('all');
    setStatusFilter('all');
    setGradeFilter('all');
  };

  // Utility functions for student cards
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'active': 'Aktiv',
      'inactive': 'Deaktiv',
      'graduated': 'Məzun',
      'transferred_out': 'Transfer',
      'dropped': 'Tərk etmiş',
      'expelled': 'İxrac'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-red-100 text-red-800',
      'graduated': 'bg-purple-100 text-purple-800',
      'transferred_out': 'bg-blue-100 text-blue-800',
      'dropped': 'bg-yellow-100 text-yellow-800',
      'expelled': 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getGenderText = (gender: string) => {
    const genderMap: Record<string, string> = {
      'male': 'Kişi',
      'female': 'Qadın',
      'other': 'Digər'
    };
    return genderMap[gender] || gender;
  };

  const getGradeLevelText = (level: string | number) => {
    return `${level}-ci sinif`;
  };

  // Handler functions
  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsUserModalOpen(true);
  };

  const handleEnrollStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsEnrollmentModalOpen(true);
  };

  const handleUserSave = async (userData: any) => {
    try {
      if (editingStudent) {
        await studentService.update(editingStudent.id, userData);
        toast({
          title: "Uğurlu",
          description: "Şagird məlumatları yeniləndi",
        });
      } else {
        await studentService.create(userData);
        toast({
          title: "Uğurlu",
          description: "Yeni şagird yaradıldı",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsUserModalOpen(false);
      setEditingStudent(null);
    } catch (error) {
      toast({
        title: "Xəta",
        description: error instanceof Error ? error.message : "Əməliyyat uğursuz oldu",
        variant: "destructive",
      });
    }
  };

  const handleEnrollment = async (enrollmentData: any) => {
    try {
      // This would call enrollment API
      console.log('Enrollment data:', enrollmentData);
      toast({
        title: "Uğurlu",
        description: "Şagird sinifə yazıldı",
      });
      setIsEnrollmentModalOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      toast({
        title: "Xəta",
        description: "Yazılma əməliyyatı uğursuz oldu",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: 'Aktiv' },
      inactive: { variant: 'secondary' as const, label: 'Deaktiv' },
      graduated: { variant: 'success' as const, label: 'Məzun' },
      transferred_out: { variant: 'destructive' as const, label: 'Transfer' },
      dropped: { variant: 'destructive' as const, label: 'Tərk etmiş' },
      expelled: { variant: 'destructive' as const, label: 'İxrac' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
      { variant: 'secondary' as const, label: status };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Şagirdlər</h1>
            <p className="text-muted-foreground">Şagirdlərin idarə edilməsi</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-6 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>Şagird Nömrəsi</TableHead>
                <TableHead>Sinif</TableHead>
                <TableHead>Müəssisə</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Əməliyyat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1,2,3,4,5].map((i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Şagirdlər</h1>
            <p className="text-muted-foreground">Şagirdlərin idarə edilməsi</p>
          </div>
        </div>

        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-destructive">Şagirdlər yüklənərkən xəta baş verdi</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['students'] })}
            >
              Yenidən cəhd et
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Şagirdlər</h1>
          <p className="text-muted-foreground">
            Şagirdlərin idarə edilməsi ({stats.total} şagird)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border rounded-md p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-2"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 px-2"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['students'] })} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Yenilə
          </Button>
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            İdxal et
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            İxrac et
          </Button>
          <Button 
            onClick={() => {
              setEditingStudent(null);
              setIsUserModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Yeni Şagird
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ümumi Şagird</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiv Şagird</CardTitle>
            <GraduationCap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deaktiv Şagird</CardTitle>
            <School className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inactive}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Məzun Şagird</CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.graduated}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Şagird axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>
          
          <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Müəssisə" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün müəssisələr</SelectItem>
              {availableInstitutions.map((institution: Institution) => (
                <SelectItem key={institution.id} value={institution.id.toString()}>
                  {institution.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="inactive">Deaktiv</SelectItem>
              <SelectItem value="graduated">Məzun</SelectItem>
              <SelectItem value="transferred_out">Transfer</SelectItem>
              <SelectItem value="dropped">Tərk etmiş</SelectItem>
              <SelectItem value="expelled">İxrac</SelectItem>
            </SelectContent>
          </Select>

          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Sinif" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün siniflər</SelectItem>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                <SelectItem key={grade} value={grade.toString()}>
                  {`${grade} sinif`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {pagination.totalItems} şagird
          </span>
          {(searchTerm || institutionFilter !== 'all' || statusFilter !== 'all' || gradeFilter !== 'all') && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-1" />
              Filterləri təmizlə
            </Button>
          )}
        </div>
      </div>

      {/* Content - Table or Cards View */}
      {viewMode === 'table' ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('full_name')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Ad Soyad
                    {getSortIcon('full_name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('student_number')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Şagird Nömrəsi
                    {getSortIcon('student_number')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('class_name')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Sinif
                    {getSortIcon('class_name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('institution')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Müəssisə
                    {getSortIcon('institution')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('status')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Status
                    {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('enrollment_date')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Qeydiyyat Tarixi
                    {getSortIcon('enrollment_date')}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[100px]">Əməliyyat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.totalItems === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {searchTerm || institutionFilter !== 'all' || statusFilter !== 'all' || gradeFilter !== 'all'
                      ? 'Axtarış üzrə heç bir nəticə tapılmadı'
                      : 'Heç bir şagird tapılmadı.'}
                  </TableCell>
                </TableRow>
              ) : (
                pagination.paginatedItems.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        {student.full_name || `${student.first_name} ${student.last_name}`}
                      </div>
                    </TableCell>
                    <TableCell>{student.student_number}</TableCell>
                    <TableCell>
                      {student.class_name || (student.current_grade_level ? `${student.current_grade_level} sinif` : '-')}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={student.institution?.name}>
                        {student.institution?.name || '-'}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                    <TableCell>
                      {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString('az-AZ') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedStudent(student)}
                          title="Bax"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditStudent(student)}
                          title="Redaktə et"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          title="Sil"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-4">
          {pagination.totalItems === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Şagird tapılmadı</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || institutionFilter !== 'all' || statusFilter !== 'all' || gradeFilter !== 'all'
                      ? 'Axtarış kriteriyasına uyğun şagird tapılmadı'
                      : 'Hələ ki yaradılmış şagird yoxdur'}
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={() => {
                      setEditingStudent(null);
                      setIsUserModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    İlk şagirdi yarat
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagination.paginatedItems.map((student) => (
                <StudentCard 
                  key={student.id} 
                  student={student}
                  onViewDetails={setSelectedStudent}
                  onEdit={handleEditStudent}
                  onEnroll={handleEnrollStudent}
                  getStatusText={getStatusText}
                  getStatusColor={getStatusColor}
                  getGenderText={getGenderText}
                  getGradeLevelText={getGradeLevelText}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalItems > 0 && (
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          onPageChange={pagination.goToPage}
          onItemsPerPageChange={pagination.setItemsPerPage}
          onPrevious={pagination.goToPreviousPage}
          onNext={pagination.goToNextPage}
          canGoPrevious={pagination.canGoPrevious}
          canGoNext={pagination.canGoNext}
        />
      )}

      {/* Modals */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingStudent(null);
        }}
        onSave={handleUserSave}
        editingUser={editingStudent}
        userType="student"
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        importType="students"
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['students'] });
          setIsImportModalOpen(false);
        }}
      />

      <EnrollmentModal
        isOpen={isEnrollmentModalOpen}
        onClose={() => {
          setIsEnrollmentModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        classes={[]}
        selectedGradeForEnrollment={null}
        setSelectedGradeForEnrollment={() => {}}
        onEnroll={handleEnrollment}
        isEnrolling={false}
        getGradeLevelText={getGradeLevelText}
      />

      <StudentDetailsDialog
        student={selectedStudent}
        isOpen={!!selectedStudent && !isEnrollmentModalOpen && !isUserModalOpen}
        onClose={() => setSelectedStudent(null)}
        onEdit={handleEditStudent}
        onEnroll={handleEnrollStudent}
        getStatusText={getStatusText}
        getStatusColor={getStatusColor}
        getGenderText={getGenderText}
        getGradeLevelText={getGradeLevelText}
      />
    </div>
  );
}