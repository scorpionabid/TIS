import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Loader2, Building, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, AlertTriangle } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Department, departmentService, DepartmentListResponse, DepartmentType as DepartmentTypeItem, DepartmentFilters } from "@/services/departments";
import { DepartmentModal } from "@/components/modals/DepartmentModal";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import { TablePagination } from "@/components/common/TablePagination";
import { User, userService, UserFilters } from "@/services/users";
import { CreateDepartmentData } from "@/services/departments";
import { useAuth } from "@/contexts/AuthContext";

type SortField = 'name' | 'department_type';
type SortDirection = 'asc' | 'desc';

export default function Departments() {
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'archived'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [departmentAdmins, setDepartmentAdmins] = useState<Record<number, User | null>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  // Check access permissions
  const hasAccess = currentUser && ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'].includes(currentUser.role);

  const fetchDepartmentAdmin = async (departmentId: number) => {
    try {
      const filters: UserFilters = {
        department_id: departmentId,
        role: 'department_admin'
      };
      
      const response = await userService.getUsers(filters);
      
      // Find the first active admin for this department
      const admin = response.data?.find(user => 
        user.is_active && 
        user.role === 'department_admin' &&
        user.department?.id === departmentId
      ) || null;
      
      setDepartmentAdmins(prev => ({
        ...prev,
        [departmentId]: admin
      }));
      
      return admin;
    } catch (error) {
      console.error('Error fetching department admin:', error);
      return null;
    }
  };


  // Extend the Department interface to include department_type_display
  interface ExtendedDepartment extends Department {
    department_type_display?: string;
    admin?: User | null;
  }

  const { data: departmentsResponse, isLoading, isError } = useQuery<DepartmentListResponse>({
    queryKey: ['departments', {
      page,
      perPage,
      searchTerm,
      status: statusFilter,
      type: typeFilter,
      sortField,
      sortDirection,
      userRole: currentUser?.role,
      institutionId: currentUser?.institution?.id
    }],
    queryFn: () => {
      const params: DepartmentFilters = {
        page,
        per_page: perPage,
        search: searchTerm || undefined,
        department_type: typeFilter === 'all' ? undefined : typeFilter,
        sort_by: sortField,
        sort_direction: sortDirection,
      };

      switch (statusFilter) {
        case 'active':
          params.is_active = true;
          break;
        case 'inactive':
          params.is_active = false;
          params.include_deleted = true;
          break;
        case 'archived':
          params.only_deleted = true;
          break;
        default:
          break;
      }

      return departmentService.getAll(params);
    },
    enabled: hasAccess,
    keepPreviousData: true,
  });

  const departments = departmentsResponse?.data ?? [];

  const departmentsWithAdmins: ExtendedDepartment[] = useMemo(() => {
    return departments.map((department) => ({
      ...department,
      admin: department.deleted_at ? null : (departmentAdmins[department.id] ?? null),
    }));
  }, [departments, departmentAdmins]);

  useEffect(() => {
    if (!hasAccess || departments.length === 0) {
      return;
    }

    const missingAdminDepts = departments.filter((dept) => !dept.deleted_at && !(dept.id in departmentAdmins));

    missingAdminDepts.forEach((department, index) => {
      setTimeout(() => {
        fetchDepartmentAdmin(department.id);
      }, index * 100);
    });
  }, [departments, hasAccess, departmentAdmins]);

  const paginationMeta = departmentsResponse?.pagination;

  useEffect(() => {
    if (paginationMeta?.per_page && paginationMeta.per_page !== perPage) {
      setPerPage(paginationMeta.per_page);
    }
  }, [paginationMeta?.per_page, perPage]);

  const totalItems = paginationMeta?.total ?? departments.length;
  const itemsPerPageResolved = paginationMeta?.per_page ?? perPage;
  const currentPage = paginationMeta?.current_page ?? page;
  const totalPages = paginationMeta?.last_page ?? Math.max(Math.ceil(totalItems / (itemsPerPageResolved || 1)), 1);
  const startIndex = paginationMeta?.from !== undefined && paginationMeta?.from !== null
    ? Math.max(paginationMeta.from - 1, 0)
    : (currentPage - 1) * itemsPerPageResolved;
  const endIndex = paginationMeta?.to ?? Math.min(startIndex + itemsPerPageResolved, totalItems);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const handlePreviousPage = () => {
    if (canGoPrevious) {
      setPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (canGoNext) {
      setPage(currentPage + 1);
    }
  };

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, currentPage]);

  interface DepartmentTypeOption {
    key: string;
    label: string;
    description?: string | null;
  }

  const { data: typesResponse } = useQuery({
    queryKey: ['department-types'],
    queryFn: () => departmentService.getTypes(),
    staleTime: 1000 * 60 * 10,
    enabled: hasAccess,
  });

  const departmentTypes = useMemo<DepartmentTypeOption[]>(() => {
    const items = (typesResponse?.data ?? []) as DepartmentTypeItem[];

    return items.map((type, index) => ({
      key: type.key || `type-${index}`,
      label: type.label || type.key || `Unnamed-${index}`,
      description: type.description ?? null,
    }));
  }, [typesResponse]);

  const getStatusDisplay = (department: Department) => {
    if (department.deleted_at) {
      return {
        label: 'Arxivləşdirilib',
        dotClass: 'bg-slate-400',
        textClass: 'text-slate-600',
      };
    }

    if (department.is_active) {
      return {
        label: 'Aktiv',
        dotClass: 'bg-green-500',
        textClass: 'text-green-600',
      };
    }

    return {
      label: 'Deaktiv',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-600',
    };
  };

  // Security check - only administrative roles can access department management
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız idarəçi rolları daxil ola bilər
          </p>
        </div>
      </div>
    );
  }

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleOpenModal = (department?: Department) => {
    setSelectedDepartment(department || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDepartment(null);
  };

  const handleSave = async (data: CreateDepartmentData) => {
    try {
      if (selectedDepartment) {
        await departmentService.update(selectedDepartment.id, data);
        toast({
          title: "Departament yeniləndi",
          description: "Departament məlumatları uğurla yeniləndi.",
        });
      } else {
        await departmentService.create(data);
        toast({
          title: "Departament əlavə edildi",
          description: "Yeni departament uğurla yaradıldı.",
        });
      }
      
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      handleCloseModal();
    } catch (error) {
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Əməliyyat zamanı problem yarandı.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteClick = (department: Department) => {
    setDepartmentToDelete(department);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (department: Department, deleteType: 'soft' | 'hard') => {
    try {
      await departmentService.delete(department.id, deleteType);
      
      const deleteMessage = deleteType === 'soft' 
        ? 'Departament deaktiv edildi'
        : 'Departament tamamilə silindi';
      
      const deleteDescription = deleteType === 'soft'
        ? 'Departament uğurla deaktiv edildi.'
        : 'Departament və bütün məlumatları tamamilə silindi.';
      
      toast({
        title: deleteMessage,
        description: deleteDescription,
      });
      
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
    } catch (error) {
      toast({
        title: "Silinə bilmədi",
        description: error instanceof Error ? error.message : "Departament silinərkən xəta baş verdi.",
        variant: "destructive",
      });
      throw error; // Re-throw to handle in modal
    }
  };

  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false);
    setDepartmentToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Departmentlər</h1>
            <p className="text-muted-foreground">Regional icazələr əsasında departmentlərin idarə edilməsi</p>
          </div>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
              <TableHead className="w-[200px]">Ad</TableHead>
              <TableHead>Növ</TableHead>
              <TableHead>Müəssisə</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="text-right w-[100px]">Əməliyyat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1,2,3,4,5,6].map((i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
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

  if (isError) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Departmentlər yüklənərkən problem yarandı.</p>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Departmentlər</h1>
          <p className="text-muted-foreground">Regional icazələr əsasında departmentlərin idarə edilməsi</p>
        </div>
        {['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'].includes(currentUser?.role || '') && (
          <Button className="flex items-center gap-2" onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4" />
            Yeni Departament
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Departament axtar..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-8 w-[250px]"
            />
          </div>
          
          <Select
            value={statusFilter}
            onValueChange={(value: 'all' | 'active' | 'inactive' | 'archived') => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="inactive">Deaktiv</SelectItem>
              <SelectItem value="archived">Arxivləşdirilmiş</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Növ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün növlər</SelectItem>
              {departmentTypes.map((type) => (
                <SelectItem key={type.key} value={type.key}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {totalItems} departament
          </span>
          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-1" />
              Filterləri təmizlə
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Ad
                  {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('department_type')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Növ
                  {getSortIcon('department_type')}
                </Button>
              </TableHead>
              <TableHead>Müəssisə</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead className="w-[60px] text-center">Status</TableHead>
              <TableHead className="text-right w-[100px]">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && totalItems === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                    ? 'Axtarış üzrə heç bir nəticə tapılmadı' 
                    : 'Heç bir departament tapılmadı.'}
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Yüklənir...
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              departmentsWithAdmins.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {department.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate" title={department.department_type_display || department.department_type}>
                      {department.department_type_display || department.department_type}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate" title={department.institution?.name}>
                      {department.institution?.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate">
                      {department.admin ? (
                        <span title={`${department.admin.first_name} ${department.admin.last_name}`}>
                          {department.admin.first_name} {department.admin.last_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Təyin olunmayıb</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const status = getStatusDisplay(department);
                      return (
                        <div className="flex items-center justify-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${status.dotClass}`} aria-hidden />
                          <span className={`text-sm font-medium ${status.textClass}`}>{status.label}</span>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'].includes(currentUser?.role || '') && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenModal(department)}
                          title="Redaktə et"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {['superadmin', 'regionadmin', 'sektoradmin'].includes(currentUser?.role || '') && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteClick(department)}
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPageResolved}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handlePerPageChange}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
        />
      )}

      {/* Department Modal */}
      <DepartmentModal
        open={isModalOpen}
        onClose={handleCloseModal}
        department={selectedDepartment}
        onSave={handleSave}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        item={departmentToDelete}
        itemType="department"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
