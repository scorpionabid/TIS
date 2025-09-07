import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Loader2, Building, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Department, CreateDepartmentData, departmentService } from "@/services/departments";
import { DepartmentModal } from "@/components/modals/DepartmentModal";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/common/TablePagination";

type SortField = 'name' | 'short_name' | 'department_type' | 'institution' | 'is_active';
type SortDirection = 'asc' | 'desc';

export default function Departments() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Define the expected API response type
  interface DepartmentsApiResponse {
    success: boolean;
    data: {
      data: Department[];
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }

  // Define the base response type from the API
  interface PaginatedResponse<T> {
    success: boolean;
    data: {
      data: T[];
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }

  // Extend the Department interface to include department_type_display
  interface ExtendedDepartment extends Department {
    department_type_display?: string;
  }

  // Load departments with proper typing
  const { data: departmentsResponse, isLoading, error } = useQuery<PaginatedResponse<ExtendedDepartment>>({
    queryKey: ['departments'],
    queryFn: () => departmentService.getAll() as Promise<PaginatedResponse<ExtendedDepartment>>,
  });

  // Extract departments from the API response
  const rawDepartments: ExtendedDepartment[] = useMemo(() => {
    if (!departmentsResponse) return [];
    
    // Handle the paginated response structure from the API
    if (departmentsResponse.success && departmentsResponse.data?.data) {
      return departmentsResponse.data.data;
    }
    
    console.warn('Unexpected departments response structure:', departmentsResponse);
    return [];
  }, [departmentsResponse]);

  // Load department types for filter with proper typing
  interface DepartmentType {
    id: string;
    key: string;        // For SelectItem value
    name: string;       // For display name
    label: string;      // For SelectItem label
    description?: string;
  }

  const { data: typesResponse } = useQuery<{ success: boolean; data: DepartmentType[] }>({
    queryKey: ['department-types'],
    queryFn: () => departmentService.getTypes() as Promise<{ success: boolean; data: DepartmentType[] }>,
    staleTime: 1000 * 60 * 10,
  });

  const departmentTypes = useMemo<DepartmentType[]>(() => {
    if (!typesResponse) return [];
    
    // Handle the response structure from the API
    if (typesResponse.success && Array.isArray(typesResponse.data)) {
      return typesResponse.data.map(type => ({
        ...type,
        id: type.id || String(Math.random()),
        key: type.id || String(Math.random()),  // Ensure key is unique and set for SelectItem
        label: type.name || 'Unnamed',          // Use name as label by default
        name: type.name || 'Unnamed'            // Ensure name is always defined
      }));
    }
    
    // Fallback for other response structures
    return Array.isArray(typesResponse) 
      ? typesResponse.map((t, index) => ({
          ...t,
          id: t.id || `type-${index}`,
          key: t.id || `type-${index}`,
          label: t.name || 'Unnamed',
          name: t.name || 'Unnamed'
        }))
      : [];
  }, [typesResponse]);

  // Filtering and Sorting logic
  const filteredAndSortedDepartments: ExtendedDepartment[] = useMemo(() => {
    let filtered = [...rawDepartments];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(dept => 
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dept.short_name && dept.short_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (dept.institution?.name && dept.institution.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(dept => 
        statusFilter === 'active' ? dept.is_active : !dept.is_active
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(dept => dept.department_type === typeFilter);
    }

    // Sort the filtered results
    const sorted = filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'short_name':
          aValue = (a.short_name || '').toLowerCase();
          bValue = (b.short_name || '').toLowerCase();
          break;
        case 'department_type':
          aValue = (a.department_type_display || a.department_type).toLowerCase();
          bValue = (b.department_type_display || b.department_type).toLowerCase();
          break;
        case 'institution':
          aValue = (a.institution?.name || '').toLowerCase();
          bValue = (b.institution?.name || '').toLowerCase();
          break;
        case 'is_active':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rawDepartments, sortField, sortDirection, searchTerm, statusFilter, typeFilter]);

  // Apply pagination
  const pagination = usePagination(filteredAndSortedDepartments, {
    initialPage: 1,
    initialItemsPerPage: 15
  });

  const departments = pagination.paginatedItems;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

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
      <div className="p-6 space-y-6">
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
                <TableHead>Qısa ad</TableHead>
                <TableHead>Növ</TableHead>
                <TableHead>Müəssisə</TableHead>
                <TableHead>Tutum</TableHead>
                <TableHead>Büdcə</TableHead>
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
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Departmentlər yüklənərkən problem yarandı.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Departmentlər</h1>
          <p className="text-muted-foreground">Regional icazələr əsasında departmentlərin idarə edilməsi</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4" />
          Yeni Departament
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Departament axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="inactive">Deaktiv</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Növ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün növlər</SelectItem>
              {departmentTypes.map((type) => {
                const itemKey = type.key || type.id || `type-${type.name || 'unknown'}`;
                return (
                  <SelectItem key={itemKey} value={itemKey}>
                    {type.label || type.name || 'Unnamed'}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {pagination.totalItems} departament
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
                  onClick={() => handleSort('short_name')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Qısa ad
                  {getSortIcon('short_name')}
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
              <TableHead>Tutum</TableHead>
              <TableHead>Büdcə</TableHead>
              <TableHead className="w-[80px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('is_active')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Status
                  {getSortIcon('is_active')}
                </Button>
              </TableHead>
              <TableHead className="text-right w-[100px]">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.totalItems === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  Heç bir departament tapılmadı.
                </TableCell>
              </TableRow>
            ) : (
              departments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {department.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {department.short_name || '-'}
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
                    {department.capacity || '-'}
                  </TableCell>
                  <TableCell>
                    {department.budget_allocation ? `${department.budget_allocation} ₼` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={department.is_active ? "default" : "secondary"}>
                      {department.is_active ? 'Aktiv' : 'Deaktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleOpenModal(department)}
                        title="Redaktə et"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteClick(department)}
                        title="Sil"
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