/**
 * RegionTeacherManager Component (MVP)
 * Multi-institution teacher management for RegionAdmin
 */

import React, { useState } from 'react';
import { useRegionTeacherManager } from './hooks/useRegionTeacherManager';
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
  Eye,
  Edit,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RegionTeacherImportModal } from './RegionTeacherImportModal';
import type { EnhancedTeacherProfile } from '@/types/teacher';

// Position type labels
const POSITION_TYPE_LABELS: Record<string, string> = {
  direktor: 'Direktor',
  direktor_muavini_tedris: 'Dir. Müavini (Tədris)',
  direktor_muavini_inzibati: 'Dir. Müavini (İnzibati)',
  müəllim: 'Müəllim',
  'muəllim': 'Müəllim', // Alternative spelling
  psixoloq: 'Psixoloq',
  kitabxanaçı: 'Kitabxanaçı',
};

// Employment status labels
const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  full_time: 'Tam ştat',
  part_time: 'Natamam ştat',
  contract: 'Müqavilə',
  temporary: 'Müvəqqəti',
};

export const RegionTeacherManager: React.FC = () => {
  // Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<EnhancedTeacherProfile | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<EnhancedTeacherProfile | null>(null);

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
  } = useRegionTeacherManager();

  // Debug log
  console.log('🎯 RegionTeacherManager render:', {
    teachersCount: teachers.length,
    isLoading: isLoadingTeachers,
    hasTeachers: teachers.length > 0,
    teachers: teachers,
  });

  // Handle bulk activate
  const handleBulkActivate = () => {
    if (selectedTeachers.length === 0) return;
    bulkUpdateStatus({
      teacherIds: selectedTeachers.map(t => t.id),
      isActive: true,
    });
  };

  // Handle bulk deactivate
  const handleBulkDeactivate = () => {
    if (selectedTeachers.length === 0) return;
    bulkUpdateStatus({
      teacherIds: selectedTeachers.map(t => t.id),
      isActive: false,
    });
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedTeachers.length === 0) return;
    if (confirm(`${selectedTeachers.length} müəllimi silmək istədiyinizə əminsiniz?`)) {
      bulkDelete(selectedTeachers.map(t => t.id));
    }
  };

  // Check if all visible teachers are selected
  const isAllSelected = teachers.length > 0 && selectedTeachers.length === teachers.length;
  const isSomeSelected = selectedTeachers.length > 0 && selectedTeachers.length < teachers.length;

  return (
    <div className="space-y-6 p-6">
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
            onClick={() => setCreateModalOpen(true)}
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
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Müəllim adı, email..."
                value={filters.search || ''}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="pl-10"
              />
            </div>

            {/* Sector Filter */}
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
              <SelectTrigger>
                <SelectValue placeholder="Sektor" />
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

            {/* School Filter */}
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
              <SelectTrigger>
                <SelectValue placeholder="Məktəb" />
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

            {/* Status Filter */}
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
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                <SelectItem value="true">Aktiv</SelectItem>
                <SelectItem value="false">Qeyri-aktiv</SelectItem>
              </SelectContent>
            </Select>
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
            <div className="text-center py-12 text-gray-500">
              Heç bir müəllim tapılmadı
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
                          {teacher.profile?.first_name} {teacher.profile?.last_name}
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
                            <DropdownMenuItem onClick={() => setViewingTeacher(teacher)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Bax
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setEditingTeacher(teacher);
                              setCreateModalOpen(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Düzəliş et
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                if (confirm(`${teacher.profile?.first_name} ${teacher.profile?.last_name} müəllimini silmək istədiyinizə əminsiniz?`)) {
                                  // TODO: Implement single delete
                                }
                              }}
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
    </div>
  );
};
