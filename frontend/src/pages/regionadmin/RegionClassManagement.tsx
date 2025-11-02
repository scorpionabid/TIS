import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { regionAdminClassService, ClassFilters } from '@/services/regionadmin/classes';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Users,
  School,
  TrendingUp,
  Upload,
  Download,
  FileSpreadsheet,
  Search,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { TablePagination } from '@/components/common/TablePagination';
import { RegionClassImportModal } from '@/components/modals/RegionClassImportModal';

export const RegionClassManagement = () => {
  const { currentUser } = useAuth();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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

  // Debug logging to inspect data structure
  useEffect(() => {
    if (classesData) {
      console.log('🔍 Classes Data Structure:', {
        fullData: classesData,
        hasData: !!classesData?.data,
        hasDataData: !!classesData?.data?.data,
        dataKeys: classesData ? Object.keys(classesData) : [],
        dataDataKeys: classesData?.data ? Object.keys(classesData.data) : [],
        classesArray: classes,
        classesLength: classes.length,
        totalItems: totalItems,
        totalPages: totalPages,
        currentPage: currentPage
      });
    }
  }, [classesData, classes, totalItems, totalPages, currentPage]);

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

  // Handle export
  const handleExportTemplate = async () => {
    try {
      console.log('🔍 Starting template download...');
      const response = await regionAdminClassService.downloadTemplate();

      console.log('📦 Response received:', {
        type: typeof response,
        isBlob: response instanceof Blob,
        constructor: response?.constructor?.name,
        hasData: !!response?.data,
        dataType: response?.data ? typeof response.data : 'none',
        dataIsBlob: response?.data instanceof Blob
      });

      // Get the blob from response
      let blob: Blob;

      // Check if response.data is a Blob (API wrapper format)
      if (response?.data instanceof Blob) {
        console.log('✅ Found Blob in response.data');
        blob = response.data;
      }
      // Check if response itself is a Blob
      else if (response instanceof Blob) {
        console.log('✅ Response is directly a Blob');
        blob = response;
      }
      // Invalid response - don't create corrupt file
      else {
        console.error('❌ Invalid response format:', response);
        throw new Error('Server cavabı düzgün Excel formatında deyil. Zəhmət olmasa yenidən cəhd edin.');
      }

      // Validate blob has content
      if (!blob || blob.size === 0) {
        console.error('❌ Empty blob received');
        throw new Error('Boş fayl alındı. Zəhmət olmasa yenidən cəhd edin.');
      }

      console.log('✅ Valid blob ready for download:', {
        size: blob.size,
        type: blob.type
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sinif-import-shablon-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Template download completed successfully');
    } catch (error) {
      console.error('❌ Template download failed:', error);
      alert(error instanceof Error ? error.message : 'Şablon yüklənməsində xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
    }
  };

  const handleExport = async () => {
    try {
      const response = await regionAdminClassService.exportClasses(filterParams);

      // Ensure we have a proper Blob
      let blob: Blob;
      if (response instanceof Blob) {
        blob = response;
      } else {
        console.warn('Response is not a Blob, converting...');
        blob = new Blob([JSON.stringify(response)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sinifler-eksport-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const stats = statistics?.data;

  return (
    <div className="p-6 space-y-6">
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
              <Button variant="outline" onClick={handleExportTemplate} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Şablon Yüklə
              </Button>
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                İxrac Et
              </Button>
            </div>

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
                      <th className="p-3 text-left font-medium text-xs">Kateqoriya</th>
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
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((cls) => (
                      <tr key={cls.id} className="border-b hover:bg-muted/30 transition">
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

                        {/* Grade Category */}
                        <td className="p-3">
                          {cls.grade_category ? (
                            <Badge
                              variant="secondary"
                              className={
                                cls.grade_category === 'ixtisaslaşdırılmış' ? 'bg-purple-100 text-purple-800' :
                                cls.grade_category === 'xüsusi' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }
                            >
                              {cls.grade_category}
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
                        <div className="flex-1">
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
                        <Badge
                          variant={cls.is_active ? 'default' : 'secondary'}
                          className={cls.is_active ? 'bg-green-600' : 'bg-gray-400'}
                        >
                          {cls.is_active ? 'Aktiv' : 'Passiv'}
                        </Badge>
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

                        {/* Category & Program */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Kateqoriya:</span>
                          <div>
                            {cls.grade_category ? (
                              <Badge
                                variant="secondary"
                                className={
                                  cls.grade_category === 'ixtisaslaşdırılmış' ? 'bg-purple-100 text-purple-800' :
                                  cls.grade_category === 'xüsusi' ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                                }
                              >
                                {cls.grade_category}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
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

      {/* Import Modal */}
      <RegionClassImportModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          refetch(); // Refresh data after import
        }}
      />
    </div>
  );
};

export default RegionClassManagement;
