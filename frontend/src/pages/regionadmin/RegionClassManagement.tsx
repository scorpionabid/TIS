import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { regionAdminClassService, ClassFilters, ClassData, UpdateClassPayload } from '@/services/regionadmin/classes';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { type CheckedState } from '@radix-ui/react-checkbox';
import {
  GraduationCap,
  Users,
  School,
  TrendingUp,
  Upload,
  Download,
  Search,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2
} from 'lucide-react';
import { TablePagination } from '@/components/common/TablePagination';
import { RegionClassImportModal } from '@/components/modals/RegionClassImportModal';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AcademicYearManager } from '@/components/academic-years/AcademicYearManager';

type EditFormState = {
  name: string;
  class_level: string;
  specialty: string;
  class_type: string;
  class_profile: string;
  education_program: string;
  teaching_shift: string;
  teaching_week: string;
  student_count: string;
  is_active: boolean;
};

const defaultEditFormState: EditFormState = {
  name: '',
  class_level: '',
  specialty: '',
  class_type: '',
  class_profile: '',
  education_program: 'umumi',
  teaching_shift: '',
  teaching_week: '',
  student_count: '',
  is_active: true,
};

export const RegionClassManagement = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'classes' | 'academic-years'>('classes');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ ...defaultEditFormState });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClassData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [classLevelFilter, setClassLevelFilter] = useState<string>('all');
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Build filter params
  const filterParams: ClassFilters = useMemo(() => {
    const params: ClassFilters = {
      page,
      per_page: perPage,
    };

    if (searchTerm.trim()) params.search = searchTerm.trim();
    if (institutionFilter !== 'all') params.institution_id = parseInt(institutionFilter);
    if (classLevelFilter !== 'all') params.class_level = parseInt(classLevelFilter);
    if (academicYearFilter !== 'all') params.academic_year_id = parseInt(academicYearFilter);
    if (statusFilter !== 'all') params.is_active = statusFilter === 'active';

    return params;
  }, [searchTerm, institutionFilter, classLevelFilter, academicYearFilter, statusFilter, page, perPage]);

  // Fetch statistics
  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: ['regionadmin', 'class-statistics'],
    queryFn: () => regionAdminClassService.getStatistics(),
    enabled: !!currentUser,
  });

  // Fetch classes
  const {
    data: classesData,
    isLoading: classesLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['regionadmin', 'classes', filterParams],
    queryFn: () => regionAdminClassService.getClasses(filterParams),
    enabled: !!currentUser,
    keepPreviousData: true,
  });

  // Fetch filter options
  const { data: institutions } = useQuery({
    queryKey: ['regionadmin', 'institutions'],
    queryFn: () => regionAdminClassService.getAvailableInstitutions(),
    enabled: !!currentUser,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: academicYears } = useQuery({
    queryKey: ['regionadmin', 'academic-years'],
    queryFn: () => regionAdminClassService.getAvailableAcademicYears(),
    enabled: !!currentUser,
    staleTime: 10 * 60 * 1000,
  });

  const rawClasses = classesData?.data?.data || [];
  const totalItems = classesData?.data?.total || 0;
  const totalPages = classesData?.data?.last_page || 1;
  const currentPage = classesData?.data?.current_page || page;

  // Apply client-side sorting
  const classes = useMemo(() => {
    if (!sortColumn || rawClasses.length === 0) return rawClasses;

    const sorted = [...rawClasses].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'institution':
          aValue = a.institution?.name || '';
          bValue = b.institution?.name || '';
          break;
        case 'utis':
          aValue = a.institution?.utis_code || '';
          bValue = b.institution?.utis_code || '';
          break;
        case 'level':
          aValue = a.class_level || 0;
          bValue = b.class_level || 0;
          break;
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'specialty':
          aValue = a.specialty || '';
          bValue = b.specialty || '';
          break;
        case 'students':
          aValue = a.student_count || 0;
          bValue = b.student_count || 0;
          break;
        case 'teacher':
          aValue = a.homeroomTeacher ? `${a.homeroomTeacher.first_name} ${a.homeroomTeacher.last_name}` : '';
          bValue = b.homeroomTeacher ? `${b.homeroomTeacher.first_name} ${b.homeroomTeacher.last_name}` : '';
          break;
        case 'year':
          aValue = a.academicYear?.year || '';
          bValue = b.academicYear?.year || '';
          break;
        case 'status':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        default:
          return 0;
      }

      // Compare values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr, 'az-AZ');
      } else {
        return bStr.localeCompare(aStr, 'az-AZ');
      }
    });

    return sorted;
  }, [rawClasses, sortColumn, sortDirection]);

  useEffect(() => {
    setSelectedClasses(prev => prev.filter(id => rawClasses.some(cls => cls.id === id)));
  }, [rawClasses]);

  const classesOnPageIds = classes.map(cls => cls.id);
  const allPageSelected = classesOnPageIds.length > 0 && classesOnPageIds.every(id => selectedClasses.includes(id));
  const partiallySelected = !allPageSelected && classesOnPageIds.some(id => selectedClasses.includes(id));

  const handleSelectRow = (id: number) => {
    setSelectedClasses(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = (checked: CheckedState) => {
    const shouldSelect = checked === true || checked === 'indeterminate';
    if (shouldSelect) {
      setSelectedClasses(prev => {
        const combined = new Set(prev);
        classesOnPageIds.forEach(id => combined.add(id));
        return Array.from(combined);
      });
    } else {
      setSelectedClasses(prev => prev.filter(id => !classesOnPageIds.includes(id)));
    }
  };

  const handleClearSelection = () => setSelectedClasses([]);

  const openEditDialog = (cls: ClassData) => {
    setEditingClass(cls);
    setEditForm({
      name: cls.name || '',
      class_level: cls.class_level !== undefined && cls.class_level !== null ? String(cls.class_level) : '',
      specialty: cls.specialty || '',
      class_type: cls.class_type || '',
      class_profile: cls.class_profile || '',
      education_program: cls.education_program || 'umumi',
      teaching_shift: cls.teaching_shift || '',
      teaching_week: cls.teaching_week || '',
      student_count: cls.student_count !== undefined && cls.student_count !== null ? String(cls.student_count) : '',
      is_active: !!cls.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    if (isSaving) return;
    setIsEditDialogOpen(false);
    setEditingClass(null);
    setEditForm({ ...defaultEditFormState });
  };

  const handleEditSubmit = async () => {
    if (!editingClass) return;

    if (!editForm.name.trim()) {
      toast({
        title: 'Ad tələb olunur',
        description: 'Sinif adı boş ola bilməz.',
        variant: 'destructive',
      });
      return;
    }

    if (!editForm.class_level) {
      toast({
        title: 'Sinif səviyyəsi tələb olunur',
        description: 'Zəhmət olmasa sinif səviyyəsini seçin.',
        variant: 'destructive',
      });
      return;
    }

    const classLevelValue = parseInt(editForm.class_level, 10);
    if (Number.isNaN(classLevelValue)) {
      toast({
        title: 'Yanlış səviyyə',
        description: 'Sinif səviyyəsi düzgün seçilməyib.',
        variant: 'destructive',
      });
      return;
    }

    const payload: UpdateClassPayload = {
      name: editForm.name.trim(),
      class_level: classLevelValue,
      specialty: editForm.specialty.trim() || null,
      class_type: editForm.class_type.trim() || null,
      class_profile: editForm.class_profile.trim() || null,
      education_program: editForm.education_program || 'umumi',
      teaching_shift: editForm.teaching_shift.trim() || null,
      teaching_week: editForm.teaching_week.trim() || null,
      is_active: editForm.is_active,
    };

    if (editForm.student_count) {
      const parsed = parseInt(editForm.student_count, 10);
      if (!Number.isNaN(parsed)) {
        payload.student_count = parsed;
      }
    }

    setIsSaving(true);
    try {
      await regionAdminClassService.updateClass(editingClass.id, payload);
      toast({
        title: 'Sinif yeniləndi',
        description: `${payload.name || editingClass.name} məlumatları uğurla yeniləndi.`,
      });
      handleCloseEditDialog();
      refetch();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Sinif yenilənmədi';
      toast({
        title: 'Xəta',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const classLabelBase = `${deleteTarget.class_level ?? ''}${deleteTarget.name ?? ''}`.trim();
    const classLabel = classLabelBase || deleteTarget.name || 'Sinif';
    try {
      await regionAdminClassService.deleteClass(deleteTarget.id);
      toast({
        title: 'Sinif silindi',
        description: `${classLabel} sinifi silindi.`,
      });
      setSelectedClasses(prev => prev.filter(id => id !== deleteTarget.id));
      refetch();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Sinif silinə bilmədi';
      toast({
        title: 'Xəta',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedClasses.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await regionAdminClassService.bulkDeleteClasses(selectedClasses);
      toast({
        title: 'Seçilən siniflər silindi',
        description: `${selectedClasses.length} sinif siyahıdan silindi.`,
      });
      setSelectedClasses([]);
      setIsBulkDeleteDialogOpen(false);
      refetch();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Siniflər silinə bilmədi';
      toast({
        title: 'Xəta',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Handle filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setInstitutionFilter('all');
    setClassLevelFilter('all');
    setAcademicYearFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 ml-1" />
      : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
  };

  const hasActiveFilters = useMemo(() => {
    return searchTerm || institutionFilter !== 'all' || classLevelFilter !== 'all' ||
           academicYearFilter !== 'all' || statusFilter !== 'all';
  }, [searchTerm, institutionFilter, classLevelFilter, academicYearFilter, statusFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (institutionFilter !== 'all') count++;
    if (classLevelFilter !== 'all') count++;
    if (academicYearFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    return count;
  }, [searchTerm, institutionFilter, classLevelFilter, academicYearFilter, statusFilter]);

  const handleExport = async () => {
    try {
      const response = await regionAdminClassService.exportClasses(filterParams);

      const blob = response instanceof Blob ? response : response?.data;
      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error('İxrac üçün fayl yaradıla bilmədi');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sinifler-eksport-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'İxrac hazırdır',
        description: 'Sinif siyahısı uğurla yükləndi.',
      });
    } catch (error) {
      toast({
        title: 'İxrac zamanı xəta',
        description: error instanceof Error ? error.message : 'Fayl hazırlanmadı. Yenidən cəhd edin.',
        variant: 'destructive',
      });
    }
  };

  const stats = statistics?.data;

  return (
    <div className="p-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'classes' | 'academic-years')}
        className="space-y-6"
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="classes">Siniflər</TabsTrigger>
          <TabsTrigger value="academic-years">Təhsil illəri</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sinif İdarəetməsi</h1>
            <p className="text-muted-foreground mt-2">
              Region daxilindəki bütün sinifləri idarə edin və bulk əməliyyatlar aparın
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cəmi Siniflər</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.total_classes || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bütün müəssisələrdə
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiv Siniflər</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '...' : stats?.active_classes || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cari tədris ilində
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cəmi Şagirdlər</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.total_students || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bütün siniflərdə
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Müəssisələr</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classesData?.total_institutions || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {classesData?.region_name || 'Region'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setIsImportModalOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                İdxal Et
              </Button>
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                İxrac Et
              </Button>
            </div>

            {selectedClasses.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                <span className="text-sm font-medium">
                  {selectedClasses.length} sinif seçildi
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Seçilənləri Sil
                </Button>
                <Button size="sm" variant="ghost" onClick={handleClearSelection}>
                  Seçimi sıfırla
                </Button>
              </div>
            )}

            {/* Active Filters Info */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                <span className="font-medium">Aktiv filtrlər ({activeFilterCount}):</span>
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <Badge variant="secondary" className="gap-1">
                      Axtarış: {searchTerm}
                    </Badge>
                  )}
                  {institutionFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      Müəssisə: {institutions?.find(i => i.id.toString() === institutionFilter)?.name}
                    </Badge>
                  )}
                  {classLevelFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {classLevelFilter}-ci sinif
                    </Badge>
                  )}
                  {academicYearFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {academicYears?.find(y => y.id.toString() === academicYearFilter)?.year}
                    </Badge>
                  )}
                  {statusFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {statusFilter === 'active' ? 'Aktiv' : 'Passiv'}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative min-w-[300px] flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Sinif adı, müəssisə, UTIS kodu ilə axtar..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Institution Filter */}
              <Select value={institutionFilter} onValueChange={(value) => { setInstitutionFilter(value); setPage(1); }}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Müəssisə seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün müəssisələr</SelectItem>
                  {institutions?.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id.toString()}>
                      {inst.name}
                      {inst.utis_code && ` (${inst.utis_code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Class Level Filter */}
              <Select value={classLevelFilter} onValueChange={(value) => { setClassLevelFilter(value); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sinif səviyyəsi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün səviyyələr</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      {level}-ci sinif
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Academic Year Filter */}
              <Select value={academicYearFilter} onValueChange={(value) => { setAcademicYearFilter(value); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tədris ili seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün tədris illəri</SelectItem>
                  {academicYears?.map((year) => (
                    <SelectItem key={year.id} value={year.id.toString()}>
                      {year.year}{year.is_current && ' (Cari)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="inactive">Passiv</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                  Filtrlər Təmizlə
                  {activeFilterCount > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Siniflər ({totalItems})</CardTitle>
        </CardHeader>
        <CardContent>
          {classesLoading && !isFetching ? (
            <div className="text-center py-8 text-muted-foreground">Yüklənir...</div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Heç bir sinif tapılmadı
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block rounded-md border overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 w-10">
                        <Checkbox
                          aria-label="Hamısını seç"
                          checked={allPageSelected ? true : partiallySelected ? 'indeterminate' : false}
                          onCheckedChange={handleSelectAllOnPage}
                        />
                      </th>
                      <th
                        className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition select-none"
                        onClick={() => handleSort('institution')}
                      >
                        <div className="flex items-center">
                          Müəssisə
                          {getSortIcon('institution')}
                        </div>
                      </th>
                      <th
                        className="p-3 text-left font-medium text-xs cursor-pointer hover:bg-muted/70 transition select-none"
                        onClick={() => handleSort('utis')}
                      >
                        <div className="flex items-center">
                          UTIS
                          {getSortIcon('utis')}
                        </div>
                      </th>
                      <th
                        className="p-3 text-center font-medium cursor-pointer hover:bg-muted/70 transition select-none"
                        onClick={() => handleSort('level')}
                      >
                        <div className="flex items-center justify-center">
                          Səviyyə
                          {getSortIcon('level')}
                        </div>
                      </th>
                      <th
                        className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition select-none"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Sinif
                          {getSortIcon('name')}
                        </div>
                      </th>
                      <th
                        className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition select-none"
                        onClick={() => handleSort('specialty')}
                      >
                        <div className="flex items-center">
                          İxtisas
                          {getSortIcon('specialty')}
                        </div>
                      </th>
                      <th className="p-3 text-left font-medium text-xs">Sinfin tipi</th>
                      <th className="p-3 text-left font-medium text-xs">Profil</th>
                      <th className="p-3 text-left font-medium text-xs">Növbə</th>
                      <th className="p-3 text-left font-medium text-xs">Proqram</th>
                      <th
                        className="p-3 text-center font-medium cursor-pointer hover:bg-muted/70 transition select-none"
                        onClick={() => handleSort('students')}
                      >
                        <div className="flex items-center justify-center">
                          Şagird
                          {getSortIcon('students')}
                        </div>
                      </th>
                      <th className="p-3 text-center font-medium text-xs">O/Q</th>
                      <th
                        className="p-3 text-left font-medium text-xs cursor-pointer hover:bg-muted/70 transition select-none"
                        onClick={() => handleSort('teacher')}
                      >
                        <div className="flex items-center">
                          Sinif Müəllimi
                          {getSortIcon('teacher')}
                        </div>
                      </th>
                      <th
                        className="p-3 text-left font-medium text-xs cursor-pointer hover:bg-muted/70 transition select-none"
                        onClick={() => handleSort('year')}
                      >
                        <div className="flex items-center">
                          Tədris İli
                          {getSortIcon('year')}
                        </div>
                      </th>
                      <th
                        className="p-3 text-center font-medium cursor-pointer hover:bg-muted/70 transition select-none"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center justify-center">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </th>
                      <th className="p-3 text-right font-medium text-xs">Əməliyyatlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((cls) => (
                      <tr key={cls.id} className="border-b hover:bg-muted/30 transition">
                        <td className="p-3 w-10">
                          <Checkbox
                            checked={selectedClasses.includes(cls.id)}
                            onCheckedChange={() => handleSelectRow(cls.id)}
                            aria-label={`${cls.name} seç`}
                          />
                        </td>
                        {/* Institution */}
                        <td className="p-3">
                          <div className="font-medium text-sm">{cls.institution?.name || '-'}</div>
                          <div className="text-xs text-muted-foreground">{cls.institution?.type || ''}</div>
                        </td>

                        {/* UTIS Code */}
                        <td className="p-3">
                          {cls.institution?.utis_code ? (
                            <Badge variant="outline" className="text-xs font-mono">
                              {cls.institution.utis_code}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>

                        {/* Class Level */}
                        <td className="p-3 text-center">
                          <Badge variant="secondary" className="font-semibold">
                            {cls.class_level}
                          </Badge>
                        </td>

                        {/* Class Name */}
                        <td className="p-3">
                          <span className="font-bold text-lg">{cls.name}</span>
                        </td>

                        {/* Specialty */}
                        <td className="p-3">
                          <span className="text-sm">{cls.specialty || '-'}</span>
                        </td>

                        {/* Class Type */}
                        <td className="p-3">
                          {cls.class_type ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {cls.class_type}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>

                        {/* Class Profile */}
                        <td className="p-3">
                          {cls.class_profile ? (
                            <span className="text-sm">{cls.class_profile}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>

                        {/* Teaching shift */}
                        <td className="p-3">
                          {cls.teaching_shift ? (
                            <Badge variant="outline" className="text-xs">
                              {cls.teaching_shift}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>

                        {/* Education Program */}
                        <td className="p-3">
                          {cls.education_program ? (
                            <Badge variant="outline" className="text-xs">
                              {cls.education_program === 'umumi' ? 'Ümumi' :
                               cls.education_program === 'xususi' ? 'Xüsusi' :
                               cls.education_program === 'ferdi_mekteb' ? 'Fərdi (M)' :
                               cls.education_program === 'ferdi_ev' ? 'Fərdi (E)' :
                               cls.education_program}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>

                        {/* Student Count */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-base">{cls.student_count}</span>
                          </div>
                        </td>

                        {/* Gender Split */}
                        <td className="p-3">
                          <div className="flex gap-2 justify-center text-sm">
                            <span className="text-blue-600 font-medium">♂{cls.male_student_count}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-pink-600 font-medium">♀{cls.female_student_count}</span>
                          </div>
                        </td>

                        {/* Homeroom Teacher */}
                        <td className="p-3">
                          {cls.homeroomTeacher ? (
                            <div className="text-sm">
                              <div className="font-medium">
                                {cls.homeroomTeacher.first_name} {cls.homeroomTeacher.last_name}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Təyin olunmayıb</span>
                          )}
                        </td>

                        {/* Academic Year */}
                        <td className="p-3">
                          <div className="text-xs">
                            {cls.academicYear?.year}
                            {cls.academicYear?.is_current && (
                              <Badge variant="default" className="ml-1 text-xs py-0 px-1">Cari</Badge>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3 text-center">
                          <Badge
                            variant={cls.is_active ? 'default' : 'secondary'}
                            className={cls.is_active ? 'bg-green-600' : 'bg-gray-400'}
                          >
                            {cls.is_active ? 'Aktiv' : 'Passiv'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(cls)}
                              aria-label="Düzəliş et"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(cls)}
                              aria-label="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {classes.map((cls) => (
                  <Card key={cls.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3 pb-3 border-b">
                        <div className="flex items-start gap-3 flex-1 pr-2">
                          <Checkbox
                            checked={selectedClasses.includes(cls.id)}
                            onCheckedChange={() => handleSelectRow(cls.id)}
                            aria-label={`${cls.name} seç`}
                          />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="font-semibold text-base">
                                {cls.class_level}
                              </Badge>
                              <span className="font-bold text-xl">{cls.name}</span>
                            </div>
                            <div className="text-sm font-medium text-muted-foreground">
                              {cls.institution?.name}
                            </div>
                            {cls.institution?.utis_code && (
                              <Badge variant="outline" className="text-xs font-mono mt-1">
                                {cls.institution.utis_code}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant={cls.is_active ? 'default' : 'secondary'}
                            className={cls.is_active ? 'bg-green-600' : 'bg-gray-400'}
                          >
                            {cls.is_active ? 'Aktiv' : 'Passiv'}
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(cls)}
                              aria-label="Düzəliş et"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(cls)}
                              aria-label="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="space-y-2.5">
                        {/* Specialty */}
                        {cls.specialty && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">İxtisas:</span>
                            <span className="font-medium">{cls.specialty}</span>
                          </div>
                        )}

                        {/* Class type */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sinfin tipi:</span>
                          <div>
                            {cls.class_type ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                {cls.class_type}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </div>

                        {/* Profile */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Profil:</span>
                          <span className="font-medium">{cls.class_profile || '-'}</span>
                        </div>

                        {/* Shift */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Növbə:</span>
                          {cls.teaching_shift ? (
                            <Badge variant="outline" className="text-xs">
                              {cls.teaching_shift}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>

                        {cls.education_program && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Proqram:</span>
                            <Badge variant="outline" className="text-xs">
                              {cls.education_program === 'umumi' ? 'Ümumi' :
                               cls.education_program === 'xususi' ? 'Xüsusi' :
                               cls.education_program === 'ferdi_mekteb' ? 'Fərdi (M)' :
                               cls.education_program === 'ferdi_ev' ? 'Fərdi (E)' :
                               cls.education_program}
                            </Badge>
                          </div>
                        )}

                        {/* Student Count */}
                        <div className="flex items-center justify-between text-sm pt-2 border-t">
                          <span className="text-muted-foreground">Şagird sayı:</span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-base">{cls.student_count}</span>
                            </div>
                            <div className="flex gap-2 text-sm">
                              <span className="text-blue-600 font-medium">♂{cls.male_student_count}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-pink-600 font-medium">♀{cls.female_student_count}</span>
                            </div>
                          </div>
                        </div>

                        {/* Homeroom Teacher */}
                        {cls.homeroomTeacher && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Sinif müəllimi:</span>
                            <span className="font-medium">
                              {cls.homeroomTeacher.first_name} {cls.homeroomTeacher.last_name}
                            </span>
                          </div>
                        )}

                        {/* Academic Year */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tədris ili:</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{cls.academicYear?.year}</span>
                            {cls.academicYear?.is_current && (
                              <Badge variant="default" className="text-xs py-0 px-1.5">Cari</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-4">
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={perPage}
                  onPageChange={setPage}
                  onNext={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  onPrevious={() => setPage(prev => Math.max(prev - 1, 1))}
                  onItemsPerPageChange={(value) => {
                    setPerPage(value);
                    setPage(1);
                  }}
                  startIndex={(currentPage - 1) * perPage}
                  endIndex={Math.min(currentPage * perPage, totalItems)}
                  canGoNext={currentPage < totalPages}
                  canGoPrevious={currentPage > 1}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) handleCloseEditDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sinif məlumatlarını redaktə et</DialogTitle>
            <DialogDescription>
              {editingClass ? `${editingClass.class_level}${editingClass.name} sinifi üçün dəyişiklik edin.` : 'Sinif seçilməyib.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-name">Sinif adı</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Sinif səviyyəsi</Label>
                <Select value={editForm.class_level} onValueChange={(value) => setEditForm(prev => ({ ...prev, class_level: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((level) => (
                      <SelectItem key={level} value={level.toString()}>
                        {level === 0 ? 'Hazırlıq' : `${level}-ci sinif`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-specialty">İxtisas</Label>
                <Input
                  id="edit-specialty"
                  value={editForm.specialty}
                  onChange={(e) => setEditForm(prev => ({ ...prev, specialty: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-class-type">Sinfin tipi</Label>
                <Input
                  id="edit-class-type"
                  value={editForm.class_type}
                  onChange={(e) => setEditForm(prev => ({ ...prev, class_type: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-class-profile">Profil</Label>
                <Input
                  id="edit-class-profile"
                  value={editForm.class_profile}
                  onChange={(e) => setEditForm(prev => ({ ...prev, class_profile: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-program">Təhsil proqramı</Label>
                <Select
                  value={editForm.education_program}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, education_program: value }))}
                >
                  <SelectTrigger id="edit-program">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="umumi">Ümumi</SelectItem>
                    <SelectItem value="xususi">Xüsusi</SelectItem>
                    <SelectItem value="ferdi_mekteb">Fərdi (Məktəb)</SelectItem>
                    <SelectItem value="ferdi_ev">Fərdi (Ev)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-shift">Növbə</Label>
                <Input
                  id="edit-shift"
                  value={editForm.teaching_shift}
                  onChange={(e) => setEditForm(prev => ({ ...prev, teaching_shift: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-week">Tədris həftəsi</Label>
                <Input
                  id="edit-week"
                  value={editForm.teaching_week}
                  onChange={(e) => setEditForm(prev => ({ ...prev, teaching_week: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-student-count">Şagird sayı</Label>
                <Input
                  id="edit-student-count"
                  type="number"
                  min={0}
                  value={editForm.student_count}
                  onChange={(e) => setEditForm(prev => ({ ...prev, student_count: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Sinif statusu</Label>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <Switch
                    checked={editForm.is_active}
                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_active: !!checked }))}
                  />
                  <span className="text-sm">{editForm.is_active ? 'Aktiv' : 'Passiv'}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog} disabled={isSaving}>
              Ləğv et
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSaving}>
              {isSaving ? 'Yenilənir...' : 'Yadda saxla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !isDeleting) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sinifi silmək istəyirsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu əməliyyat geri qaytarılmayacaq. Seçilmiş sinif sistemdən silinəcək.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Ləğv et</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Silinir...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={(open) => { if (!open && !isBulkDeleting) setIsBulkDeleteDialogOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seçilmiş siniflər silinsin?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedClasses.length} sinifi silmək üzrəsiniz. Bu əməliyyat geri qaytarıla bilməz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Ləğv et</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkDelete}
              disabled={isBulkDeleting || selectedClasses.length === 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? 'Silinir...' : 'Seçilənləri sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Modal */}
          <RegionClassImportModal
            isOpen={isImportModalOpen}
            onClose={() => {
              setIsImportModalOpen(false);
              refetch(); // Refresh data after import
            }}
          />
        </TabsContent>

        <TabsContent value="academic-years" className="mt-6">
          <AcademicYearManager
            currentUser={currentUser}
            enableAutoGeneration
            queryKey={['regionadmin', 'academic-years-management']}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RegionClassManagement;
