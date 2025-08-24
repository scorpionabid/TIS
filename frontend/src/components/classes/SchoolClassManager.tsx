import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, Download, AlertTriangle, School, Eye, Edit, Trash2, Users, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/common/TablePagination';
import { useQuery } from '@tanstack/react-query';
import { institutionService } from '@/services/institutions';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolClassManager } from './hooks/useSchoolClassManager';
import { ClassCard } from './ClassCard';
import { ClassCreateDialog } from './ClassCreateDialog';
import { ClassDetailsDialog } from './ClassDetailsDialog';
import { ClassStatsCards } from './ClassStatsCards';
import { ClassFilters } from './ClassFilters';

interface SchoolClassManagerProps {
  className?: string;
}

export const SchoolClassManager: React.FC<SchoolClassManagerProps> = ({ className }) => {
  // Institution filter state
  const [institutionFilter, setInstitutionFilter] = React.useState<string>('all');
  
  // Auth context for role-based filtering
  const { currentUser: user } = useAuth();
  
  // Fetch institutions for filter (based on user role)
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions', 'for-filter'],
    queryFn: () => institutionService.getAll({ per_page: 100 }),
  });

  const availableInstitutions = React.useMemo(() => {
    if (!institutionsResponse?.data?.data) return [];
    
    // Filter institutions based on user role
    let institutions = institutionsResponse.data.data;
    
    if (!user) return [];
    
    // SuperAdmin sees all institutions
    if (user.role === 'superadmin') {
      return institutions.filter((inst: any) => inst.level && inst.level >= 3); // Schools and sectors
    }
    
    // RegionAdmin sees institutions in their region
    if (user.role === 'regionadmin') {
      const userInstitutionId = user.institution_id;
      return institutions.filter((inst: any) => 
        inst.id === userInstitutionId || 
        (inst.level && inst.level >= 3) // Schools under their region
      );
    }
    
    // SectorAdmin sees schools in their sector
    if (user.role === 'sektoradmin') {
      const userInstitutionId = user.institution_id;
      return institutions.filter((inst: any) => 
        inst.id === userInstitutionId ||
        (inst.level === 4) // Only schools
      );
    }
    
    // School staff see only their institution
    if (user.role === 'schooladmin' || user.role === 'müəllim') {
      return institutions.filter((inst: any) => inst.id === user.institution_id);
    }
    
    return [];
  }, [institutionsResponse, user]);

  const {
    // Data
    entities: classes,
    isLoading,
    error,
    
    // State
    searchTerm,
    filters,
    selectedTab,
    selectedEntity: selectedClass,
    createModalOpen,
    newEntityData: newClassData,
    
    // Actions
    setSearchTerm,
    setFilters,
    setSelectedTab,
    setSelectedEntity: setSelectedClass,
    setCreateModalOpen,
    setNewEntityData: setNewClassData,
    refetch,
    
    // Event handlers
    handleCreate: handleCreateClass,
  } = useSchoolClassManager();

  // Update filters when institution filter changes
  React.useEffect(() => {
    setFilters(prev => ({
      ...prev,
      institution_id: institutionFilter === 'all' ? undefined : parseInt(institutionFilter)
    }));
  }, [institutionFilter, setFilters]);

  // Calculate class stats locally
  const classStats = {
    total: classes?.length || 0,
    active: classes?.filter(c => c.is_active)?.length || 0,
    inactive: classes?.filter(c => !c.is_active)?.length || 0,
    overcrowded: classes?.filter(c => c.current_enrollment > c.capacity)?.length || 0,
    needs_teacher: classes?.filter(c => !c.class_teacher_id)?.length || 0,
  };

  // Filter classes based on search and tab (institution filtering is handled by backend)
  const filteredClasses = classes?.filter(schoolClass => {
    const matchesSearch = !searchTerm || 
      schoolClass.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof schoolClass.class_teacher === 'string' 
        ? schoolClass.class_teacher.toLowerCase().includes(searchTerm.toLowerCase())
        : schoolClass.class_teacher?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      schoolClass.room_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = selectedTab === 'all' || 
      (selectedTab === 'active' && schoolClass.is_active) ||
      (selectedTab === 'inactive' && !schoolClass.is_active);
    
    return matchesSearch && matchesTab;
  }) || [];

  // Pagination
  const pagination = usePagination(filteredClasses, {
    initialPage: 1,
    initialItemsPerPage: 20
  });

  // Utility functions
  const getGradeLevelText = (level: number) => {
    if (level <= 4) return 'İbtidai';
    if (level <= 9) return 'Ümumi';
    return 'Orta';
  };

  const getCurrentAcademicYear = () => {
    return new Date().getFullYear().toString();
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
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Sinif
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <ClassStatsCards classStats={classStats} />

      {/* Filters */}
      <ClassFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filters={filters}
        setFilters={setFilters}
        getCurrentAcademicYear={getCurrentAcademicYear}
        institutionFilter={institutionFilter}
        setInstitutionFilter={setInstitutionFilter}
        availableInstitutions={availableInstitutions}
      />

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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Sinif adı</TableHead>
                    <TableHead>Sinif səviyyəsi</TableHead>
                    <TableHead>Otaq</TableHead>
                    <TableHead>Sinif rəhbəri</TableHead>
                    <TableHead>Şagird sayı</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Əməliyyatlar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(10)].map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-lg" />
                          <div className="space-y-2">
                            <div className="w-24 h-4 bg-muted rounded" />
                            <div className="w-20 h-3 bg-muted rounded" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-20 h-4 bg-muted rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="w-16 h-4 bg-muted rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="w-24 h-4 bg-muted rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="w-12 h-4 bg-muted rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="w-12 h-6 bg-muted rounded-full" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <div className="w-8 h-8 bg-muted rounded" />
                          <div className="w-8 h-8 bg-muted rounded" />
                          <div className="w-8 h-8 bg-muted rounded" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : pagination.totalItems > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Sinif adı</TableHead>
                    <TableHead>Sinif səviyyəsi</TableHead>
                    <TableHead>Otaq</TableHead>
                    <TableHead>Sinif rəhbəri</TableHead>
                    <TableHead>Şagird sayı</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Əməliyyatlar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.map(schoolClass => (
                    <TableRow key={schoolClass.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
                            <School className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium">{schoolClass.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {typeof schoolClass.academic_year === 'object' 
                                ? schoolClass.academic_year.name || schoolClass.academic_year.year || 'Akademik il'
                                : schoolClass.academic_year || 'Akademik il'
                              } akademik ili
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {getGradeLevelText(schoolClass.grade_level)} - {schoolClass.grade_level}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          {schoolClass.room_number ? (
                            <>
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {schoolClass.room_number}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Təyin edilməyib</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          {schoolClass.class_teacher ? (
                            <>
                              <User className="h-4 w-4 text-muted-foreground" />
                              {typeof schoolClass.class_teacher === 'object' 
                                ? schoolClass.class_teacher.name || schoolClass.class_teacher.full_name || 'Müəllim'
                                : schoolClass.class_teacher
                              }
                            </>
                          ) : (
                            <span className="text-orange-600">Təyin edilməyib</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">
                            {schoolClass.current_enrollment}/{schoolClass.capacity}
                          </span>
                          {schoolClass.current_enrollment > schoolClass.capacity && (
                            <span className="text-red-600 ml-1">
                              (+{schoolClass.current_enrollment - schoolClass.capacity})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          schoolClass.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {schoolClass.is_active ? 'Aktiv' : 'Passiv'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedClass(schoolClass)}
                            title="Bax"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
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
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
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

      {/* Dialogs */}
      <ClassCreateDialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        newClassData={newClassData}
        setNewClassData={setNewClassData}
        onCreateClass={handleCreateClass}
        teachers={[]}
        getCurrentAcademicYear={getCurrentAcademicYear}
        isCreating={false}
      />

      <ClassDetailsDialog
        schoolClass={selectedClass}
        isOpen={!!selectedClass}
        onClose={() => setSelectedClass(null)}
        getGradeLevelText={getGradeLevelText}
      />
    </div>
  );
};

export default SchoolClassManager;