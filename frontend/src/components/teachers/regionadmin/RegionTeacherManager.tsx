/**
 * RegionTeacherManager Component (MVP)
 * Multi-institution teacher management for RegionAdmin
 */

import React, { useState } from 'react';
import { useRegionTeacherManager } from './hooks/useRegionTeacherManager';
import { TablePagination } from '@/components/common/TablePagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  GraduationCap,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Trash2,
  Users,
  Loader2,
  Upload,
  Plus,
  MoreVertical,
  Edit,
  Filter,
  RotateCcw,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { POSITION_TYPE_LABELS, EMPLOYMENT_STATUS_LABELS } from '@/types/teacher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RegionTeacherImportModal } from './RegionTeacherImportModal';
import type { EnhancedTeacherProfile } from '@/types/teacher';
import { RegionTeacherFormModal } from './RegionTeacherFormModal';
import { type RegionTeacherCreateInput } from '@/services/teachers';
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
import { useToast } from '@/hooks/use-toast';



export const RegionTeacherManager: React.FC = () => {
  // Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<EnhancedTeacherProfile | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    variant?: 'default' | 'destructive';
  }>({
    open: false,
    title: '',
    description: '',
    action: () => {},
  });
  const { toast } = useToast();

  const {
    currentUser,
    sectors,
    schools,
    teachers,
    statistics,
    isLoadingTeachers,
    filters,
    updateFilters,
    selectedSectorIds,
    updateSectorSelection,
    selectedTeachers,
    toggleTeacherSelection,
    toggleSelectAll,
    clearSelection,
    bulkUpdateStatus,
    bulkDelete,
    exportTeachers,
    isUpdatingStatus,
    isDeleting,
    isExporting,
    createTeacher,
    updateTeacher,
    pagination,
    subjects,
    clearFilters,
    isSavingTeacher,
  } = useRegionTeacherManager();

  // Debug log (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 RegionTeacherManager render:', {
      teachersCount: teachers.length,
      isLoading: isLoadingTeachers,
      hasTeachers: teachers.length > 0,
      teachers: teachers,
    });
  }

  // Handle bulk activate
  const handleBulkActivate = () => {
    if (selectedTeachers.length === 0) return;
    setConfirmModal({
      open: true,
      title: 'Hesabları Aktivləşdir',
      description: `${selectedTeachers.length} müəllim hesabını aktiv etmək istədiyinizə əminsiniz?`,
      action: () => bulkUpdateStatus({
        teacherIds: selectedTeachers.map(t => t.id),
        isActive: true,
      }),
      variant: 'default',
    });
  };

  // Handle bulk deactivate
  const handleBulkDeactivate = () => {
    if (selectedTeachers.length === 0) return;
    setConfirmModal({
      open: true,
      title: 'Hesabları Deaktiv Et',
      description: `${selectedTeachers.length} müəllim hesabını qeyri-aktiv etmək istədiyinizə əminsiniz?`,
      action: () => bulkUpdateStatus({
        teacherIds: selectedTeachers.map(t => t.id),
        isActive: false,
      }),
      variant: 'destructive',
    });
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedTeachers.length === 0) return;
    setConfirmModal({
      open: true,
      title: 'Müəllimləri Stil',
      description: `Seçilmiş ${selectedTeachers.length} müəllimi sistemdən tamamilə silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`,
      action: () => bulkDelete(selectedTeachers.map(t => t.id)),
      variant: 'destructive',
    });
  };

  // Check if all visible teachers are selected
  const isAllSelected = teachers.length > 0 && selectedTeachers.length === teachers.length;
  const isSomeSelected = selectedTeachers.length > 0 && selectedTeachers.length < teachers.length;

  const closeTeacherForm = () => {
    setCreateModalOpen(false);
    setEditingTeacher(null);
  };

  const handleTeacherSave = async (values: RegionTeacherCreateInput) => {
    try {
      if (editingTeacher) {
        await updateTeacher(editingTeacher.id, values);
      } else {
        await createTeacher(values);
      }
      closeTeacherForm();
    } catch (error) {
      console.error('RegionTeacherManager - Teacher save error', error);
      // Toast is handled in mutation hook
    }
  };

  const handleSingleDelete = (teacher: EnhancedTeacherProfile) => {
    setConfirmModal({
      open: true,
      title: 'Müəllimi Sil',
      description: `${teacher.profile?.first_name || teacher.first_name} ${teacher.profile?.last_name || teacher.last_name} müəllimini sistemdən tamamilə silmək istədiyinizə əminsiniz?`,
      action: () => bulkDelete([teacher.id]), // Reuse bulk delete for single
      variant: 'destructive',
    });
  };

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            Müəllim İdarəetməsi
          </h1>
          <p className="text-gray-600 mt-1">
            {currentUser?.institution?.name} - Bütün sektorlar və məktəblər
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            İdxal/İxrac
          </Button>
          <Button
            variant="outline"
            onClick={() => exportTeachers()}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>
          <Button
            onClick={() => {
              setEditingTeacher(null);
              setCreateModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Müəllim
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ümumi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_teachers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Aktiv
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statistics.active_teachers}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Qeyri-aktiv
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statistics.inactive_teachers}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Müəssisələr</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(statistics.by_institution || {}).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-500" />
              <h3 className="font-semibold text-slate-700">Filtrlər</h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Filtrləri təmizlə
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Axtarış</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Müəllim adı, email..."
                  value={filters.search || ''}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="pl-10 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>
            </div>

            {/* Sector Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Sektor</label>
              <Select
                value={selectedSectorIds[0]?.toString() || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    updateSectorSelection([]);
                  } else {
                    updateSectorSelection([parseInt(value)]);
                  }
                }}
              >
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Bütün sektorlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün sektorlar</SelectItem>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id.toString()}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* School Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Müəssisə</label>
              <Select
                value={filters.school_ids?.[0]?.toString() || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    updateFilters({ school_ids: [] });
                  } else {
                    updateFilters({ school_ids: [parseInt(value)] });
                  }
                }}
                disabled={schools.length === 0}
              >
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder={schools.length === 0 ? "Sektor seçin" : "Bütün məktəblər"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün məktəblər</SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id.toString()}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Fənn</label>
              <Select
                value={filters.subject_id?.toString() || 'all'}
                onValueChange={(value) => {
                  updateFilters({ subject_id: value === 'all' ? undefined : parseInt(value) });
                }}
              >
                <SelectTrigger className="border-slate-200">
                  <div className="flex items-center">
                    <GraduationCap className="h-4 w-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="Bütün fənlər" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün fənlər</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Vəzifə</label>
              <Select
                value={filters.position_type || 'all'}
                onValueChange={(value) => {
                  updateFilters({ position_type: value === 'all' ? undefined : value });
                }}
              >
                <SelectTrigger className="border-slate-200">
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="Bütün vəzifələr" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün vəzifələr</SelectItem>
                  {Object.entries(POSITION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employment Status Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">İş Statusu</label>
              <Select
                value={filters.employment_status || 'all'}
                onValueChange={(value) => {
                  updateFilters({ employment_status: value === 'all' ? undefined : value });
                }}
              >
                <SelectTrigger className="border-slate-200">
                  <div className="flex items-center">
                    <UserCheck className="h-4 w-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="Bütün statuslar" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün statuslar</SelectItem>
                  {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 ml-1">Hesab Statusu</label>
              <Select
                value={filters.is_active?.toString() || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    updateFilters({ is_active: undefined });
                  } else {
                    updateFilters({ is_active: value === 'true' });
                  }
                }}
              >
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Hesab statusu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün hesablar</SelectItem>
                  <SelectItem value="true">Aktiv hesablar</SelectItem>
                  <SelectItem value="false">Qeyri-aktiv hesablar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTeachers.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {selectedTeachers.length} müəllim seçildi
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkActivate}
                  disabled={isUpdatingStatus}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aktivləşdir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDeactivate}
                  disabled={isUpdatingStatus}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Deaktiv et
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Sil
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                >
                  Ləğv et
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoadingTeachers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : teachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="bg-slate-50 p-4 rounded-full mb-4">
                <Users className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">Heç bir müəllim tapılmadı</h3>
              <p className="text-slate-500 text-center max-w-sm mt-1">
                Axtarış meyarlarınıza uyğun heç bir nəticə movcud deyil. Filtrləri təmizləyərək yenidən yoxlayın.
              </p>
              <Button 
                variant="outline" 
                className="mt-6"
                onClick={clearFilters}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Filtrləri Sıfırla
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      {...(isSomeSelected ? { indeterminate: true as any } : {})}
                      onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                    />
                  </TableHead>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Müəssisə</TableHead>
                  <TableHead>Əsas fənn</TableHead>
                  <TableHead>Vəzifə</TableHead>
                  <TableHead>İş Statusu</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => {
                  const isSelected = selectedTeachers.some(t => t.id === teacher.id);

                  return (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleTeacherSelection(teacher)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {teacher.profile?.first_name || teacher.first_name} {teacher.profile?.last_name || teacher.last_name}
                        </div>
                      </TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {teacher.institution?.name || 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {teacher.teacher_subjects?.find(ts => ts.is_primary_subject)?.subject?.name || 
                         teacher.profile?.subjects?.[0] || 
                         teacher.profile?.specialty || 
                         '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {POSITION_TYPE_LABELS[teacher.profile?.position_type || ''] || teacher.profile?.position_type || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {EMPLOYMENT_STATUS_LABELS[teacher.profile?.employment_status || ''] || teacher.profile?.employment_status || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={teacher.is_active ? 'default' : 'destructive'}>
                          {teacher.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingTeacher(teacher);
                              setCreateModalOpen(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Düzəliş et
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => handleSingleDelete(teacher)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination Section */}
        {pagination && pagination.total_pages > 1 && (
          <div className="px-6 border-t border-slate-100 bg-slate-50/30">
            <TablePagination
              currentPage={pagination.current_page}
              totalPages={pagination.total_pages}
              totalItems={pagination.total}
              itemsPerPage={pagination.per_page}
              onPageChange={(page) => updateFilters({ page })}
              onItemsPerPageChange={(perPage) => updateFilters({ per_page: perPage, page: 1 })}
              isLoading={isLoadingTeachers}
            />
          </div>
        )}
      </Card>

      {/* Debug info */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">Debug Info</CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
          <div>Sectors: {sectors.length}</div>
          <div>Schools: {schools.length}</div>
          <div>Teachers: {teachers.length}</div>
          <div>Selected: {selectedTeachers.length}</div>
        </CardContent>
      </Card>

      {/* Import Modal */}
      <RegionTeacherImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
      <RegionTeacherFormModal
        isOpen={createModalOpen}
        onClose={closeTeacherForm}
        onSubmit={handleTeacherSave}
        schools={schools}
        teacher={editingTeacher}
        isSubmitting={isSavingTeacher}
      />

      {/* Modern Confirmation Dialog */}
      <AlertDialog 
        open={confirmModal.open} 
        onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={confirmModal.variant === 'destructive' ? 'text-red-600' : ''}>
              {confirmModal.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmModal.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ləğv et</AlertDialogCancel>
            <AlertDialogAction
              className={confirmModal.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
              onClick={() => {
                confirmModal.action();
                setConfirmModal(prev => ({ ...prev, open: false }));
              }}
            >
              Bəli, davam et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
