import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, Download, Upload, AlertTriangle, Users, Edit, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSchoolTeacherManager } from './hooks/useSchoolTeacherManager';
import { TeacherCard } from './TeacherCard';
import { TeacherDetailsDialog } from './TeacherDetailsDialog';
import { TeacherStatsCards } from './TeacherStatsCards';
import { TeacherFilters } from './TeacherFilters';
import { UserModal } from '@/components/modals/UserModal';
import { ImportModal } from '@/components/import/ImportModal';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/common/TablePagination';
import { useQuery } from '@tanstack/react-query';
import { institutionService } from '@/services/institutions';
import { useAuth } from '@/contexts/AuthContext';

interface SchoolTeacherManagerProps {
  className?: string;
}

export const SchoolTeacherManager: React.FC<SchoolTeacherManagerProps> = ({ className }) => {
  // Local state for import modal (not in generic hook)
  const [importModalOpen, setImportModalOpen] = React.useState(false);
  const [institutionFilter, setInstitutionFilter] = React.useState<string>('all');
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [teacherToDelete, setTeacherToDelete] = React.useState<any>(null);
  
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
    if (user.role === 'məktəbadmin' || user.role === 'müəllim') {
      return institutions.filter((inst: any) => inst.id === user.institution_id);
    }
    
    return [];
  }, [institutionsResponse, user]);
  
  const {
    // State
    searchTerm,
    filters,
    selectedTab,
    selectedEntity: selectedTeacher,
    createModalOpen: userModalOpen,
    editingEntity: editingUser,
    
    // Data
    entities: teachers,
    isLoading,
    error,
    
    // Actions
    setSearchTerm,
    setFilters,
    setSelectedTab,
    setSelectedEntity: setSelectedTeacher,
    setCreateModalOpen: setUserModalOpen,
    setEditingEntity: setEditingUser,
    refetch,
    
    // Handlers
    handleCreate,
    handleUpdate,
    
    // Loading states
    isCreating,
    isUpdating
  } = useSchoolTeacherManager();

  // Update filters when institution filter changes
  React.useEffect(() => {
    setFilters(prev => ({
      ...prev,
      institution_id: institutionFilter === 'all' ? undefined : parseInt(institutionFilter)
    }));
  }, [institutionFilter, setFilters]);

  // Handler for user save
  const handleUserSave = async (userData: any) => {
    try {
      if (editingUser) {
        await handleUpdate(editingUser.id, userData);
      } else {
        await handleCreate(userData);
      }
    } catch (error) {
      throw error; // Re-throw to let modal handle the error
    }
  };

  // Calculate stats from teachers data
  const teacherStats = {
    total: teachers?.length || 0,
    active: teachers?.filter(t => t.is_active)?.length || 0,
    inactive: teachers?.filter(t => !t.is_active)?.length || 0,
    full_time: teachers?.filter(t => t.employment_type === 'full_time')?.length || 0,
    part_time: teachers?.filter(t => t.employment_type === 'part_time')?.length || 0,
    needs_assignment: teachers?.filter(t => !t.department)?.length || 0,
  };

  // Filter teachers based on selected tab and search (institution filtering is handled by backend)
  const filteredTeachers = teachers?.filter(teacher => {
    const matchesTab = selectedTab === 'all' || 
      (selectedTab === 'active' && teacher.is_active) ||
      (selectedTab === 'inactive' && !teacher.is_active);
    
    const matchesSearch = !searchTerm || 
      teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesTab && matchesSearch;
  }) || [];

  const handleEditTeacher = (teacher: any) => {
    setEditingUser(teacher);
    setUserModalOpen(true);
  };

  const handleDeleteTeacher = (teacher: any) => {
    setTeacherToDelete(teacher);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (deleteType: 'soft' | 'hard') => {
    if (!teacherToDelete) return;
    
    try {
      const { schoolAdminService } = await import('@/services/schoolAdmin');
      
      if (deleteType === 'soft') {
        await schoolAdminService.softDeleteTeacher(teacherToDelete.id);
      } else {
        await schoolAdminService.hardDeleteTeacher(teacherToDelete.id);
      }
      
      // Refresh data
      refetch();
      
      // Close modal and reset state
      setDeleteModalOpen(false);
      setTeacherToDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleExportTeachers = async () => {
    try {
      // Create CSV content from filtered teachers
      const csvData = filteredTeachers.map(teacher => ({
        'Ad Soyad': teacher.name || `${teacher.first_name} ${teacher.last_name}`.trim(),
        'Email': teacher.email,
        'Müəssisə': teacher.institution,
        'Fənlər': Array.isArray(teacher.subjects) ? teacher.subjects.join(', ') : teacher.subjects || '',
        'Status': teacher.is_active ? 'Aktiv' : 'Passiv',
        'İşçi ID': teacher.employee_id || '',
        'Telefon': teacher.phone || '',
        'İşə qəbul tarixi': teacher.hire_date || '',
        'İş növü': teacher.employment_type || ''
      }));

      // Convert to CSV
      const csvContent = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `muellimler_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Utility functions (since generic hook doesn't provide them)
  const getDepartmentText = (dept: string) => dept || 'Təyin edilməyib';
  const getPositionText = (pos: string) => pos || 'Müəllim';
  const getPerformanceColor = (performance: string) => 'bg-green-100 text-green-800';
  const getWorkloadColor = (workload: string) => 'bg-blue-100 text-blue-800';

  // Pagination
  const pagination = usePagination(filteredTeachers, {
    initialPage: 1,
    initialItemsPerPage: 20
  });

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
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            İdxal et
          </Button>
          <Button variant="outline" onClick={handleExportTeachers}>
            <Download className="h-4 w-4 mr-2" />
            İxrac et
          </Button>
          <Button 
            onClick={() => {
              setEditingUser(null);
              setUserModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Müəllim
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <TeacherStatsCards teacherStats={teacherStats} />

      {/* Filters */}
      <TeacherFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filters={filters}
        setFilters={setFilters}
        institutionFilter={institutionFilter}
        setInstitutionFilter={setInstitutionFilter}
        availableInstitutions={availableInstitutions}
      />

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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Ad Soyad</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Müəssisə</TableHead>
                    <TableHead>Fənlər</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Əməliyyatlar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                          <div className="w-32 h-4 bg-muted rounded animate-pulse" />
                        </div>
                      </TableCell>
                      <TableCell><div className="w-40 h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="w-48 h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="w-24 h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="w-16 h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="w-20 h-4 bg-muted rounded animate-pulse" /></TableCell>
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
                    <TableHead className="w-[200px]">Ad Soyad</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Müəssisə</TableHead>
                    <TableHead>Fənlər</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Əməliyyatlar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.map(teacher => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {teacher.name || `${teacher.first_name} ${teacher.last_name}`.trim() || teacher.email}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {teacher.employee_id}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {teacher.institution}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {Array.isArray(teacher.subjects) && teacher.subjects.length > 0 
                            ? teacher.subjects.join(', ') 
                            : 'Təyin edilməyib'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          teacher.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {teacher.is_active ? 'Aktiv' : 'Passiv'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedTeacher(teacher)}
                            title="Bax"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditTeacher(teacher)}
                            title="Redaktə et"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteTeacher(teacher)}
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
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Müəllim tapılmadı</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 
                      'Axtarış kriteriyasına uyğun müəllim tapılmadı' : 
                      selectedTab === 'all' ? 
                        'Hələ ki məktəbdə yaradılmış müəllim yoxdur' :
                        `${selectedTab === 'active' ? 'Aktiv' : 'Passiv'} müəllim yoxdur`
                    }
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={() => {
                      setEditingUser(null);
                      setUserModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    İlk müəllimi yarat
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <UserModal
        open={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleUserSave}
        user={editingUser}
      />


      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        importType="teachers"
        onImportComplete={() => {
          refetch();
          setImportModalOpen(false);
        }}
      />

      <TeacherDetailsDialog
        teacher={selectedTeacher}
        isOpen={!!selectedTeacher}
        onClose={() => setSelectedTeacher(null)}
        onEdit={handleEditTeacher}
        getDepartmentText={getDepartmentText}
        getPositionText={getPositionText}
        getPerformanceColor={getPerformanceColor}
        getWorkloadColor={getWorkloadColor}
      />

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTeacherToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={teacherToDelete?.name || `${teacherToDelete?.first_name} ${teacherToDelete?.last_name}`.trim() || teacherToDelete?.email || 'Müəllim'}
        itemType="Müəllim"
        isLoading={isUpdating}
      />
    </div>
  );
};

export default SchoolTeacherManager;