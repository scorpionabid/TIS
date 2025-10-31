import { useState, useMemo } from 'react';
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
  X
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

  const classes = classesData?.data?.data || [];
  const totalItems = classesData?.data?.total || 0;
  const totalPages = classesData?.data?.last_page || 1;
  const currentPage = classesData?.data?.current_page || page;

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

  const hasActiveFilters = useMemo(() => {
    return searchTerm || institutionFilter !== 'all' || classLevelFilter !== 'all' ||
           academicYearFilter !== 'all' || statusFilter !== 'all';
  }, [searchTerm, institutionFilter, classLevelFilter, academicYearFilter, statusFilter]);

  // Handle export
  const handleExportTemplate = async () => {
    try {
      const blob = await regionAdminClassService.downloadTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `class_import_template_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template download failed:', error);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await regionAdminClassService.exportClasses(filterParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `classes_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
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

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative min-w-[250px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Sinif adı ilə axtar..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Institution Filter */}
              <Select value={institutionFilter} onValueChange={(value) => { setInstitutionFilter(value); setPage(1); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Müəssisə" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün müəssisələr</SelectItem>
                  {institutions?.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id.toString()}>
                      {inst.name}
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
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tədris ili" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün illər</SelectItem>
                  {academicYears?.map((year) => (
                    <SelectItem key={year.id} value={year.id.toString()}>
                      {year.year} {year.is_current && '(Cari)'}
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
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Təmizlə
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
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">Müəssisə</th>
                      <th className="p-3 text-left font-medium">Səviyyə</th>
                      <th className="p-3 text-left font-medium">Sinif</th>
                      <th className="p-3 text-left font-medium">Şagirdlər</th>
                      <th className="p-3 text-left font-medium">Cinsi Bölgü</th>
                      <th className="p-3 text-left font-medium">İxtisas</th>
                      <th className="p-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((cls) => (
                      <tr key={cls.id} className="border-b hover:bg-muted/30 transition">
                        <td className="p-3">
                          <div className="font-medium">{cls.institution?.name || '-'}</div>
                          <div className="text-xs text-muted-foreground">{cls.institution?.type || ''}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary">{cls.class_level}</Badge>
                        </td>
                        <td className="p-3 font-medium">{cls.name}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{cls.student_count}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm space-y-1">
                            <div className="flex gap-2">
                              <span className="text-blue-600">♂ {cls.male_student_count}</span>
                              <span className="text-pink-600">♀ {cls.female_student_count}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-muted-foreground">
                            {cls.specialty || '-'}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge variant={cls.is_active ? 'default' : 'secondary'}>
                            {cls.is_active ? 'Aktiv' : 'Passiv'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
