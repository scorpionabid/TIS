import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, UserIcon, Mail, Phone, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, FileDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User, CreateUserData, UpdateUserData, userService } from "@/services/users";
import { UserModal } from "@/components/modals/UserModal";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/common/TablePagination";

type SortField = 'name' | 'email' | 'role' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

// Role labels for display
const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  regionadmin: 'Regional Admin',
  regionoperator: 'Regional Operator',
  sektoradmin: 'Sektor Admin',
  məktəbadmin: 'Məktəb Admin',
  müəllim: 'Müəllim',
  user: 'İstifadəçi',
};

// Utility function to safely convert value to string - FIXED FOR ROLE
const safeToString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    // Handle role object with null values - get from role name mapping
    if (value.name === null && value.display_name === null && value.id === null) {
      return 'Təyin edilməyib';
    }
    if (value.name) return String(value.name);
    if (value.display_name) return String(value.display_name);
    return JSON.stringify(value);
  }
  return String(value);
};

// Utility function to extract simple string values from arrays
const extractUniqueStrings = (users: any[], field: string): string[] => {
  const values = users
    .map(user => user[field])
    .filter(value => value !== null && value !== undefined)
    .map(value => safeToString(value))
    .filter(value => value !== '');
  
  return [...new Set(values)];
};

export default function Users() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load users
  const { data: usersResponse, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers(),
  });

  // Debug: log the response structure
  console.log('🔍 Users API Response:', usersResponse);

  const rawUsers = useMemo(() => {
    if (!usersResponse) return [];
    
    // Handle different response formats and normalize user data
    let users = [];
    if (Array.isArray(usersResponse)) users = usersResponse;
    else if (usersResponse.data && Array.isArray(usersResponse.data)) users = usersResponse.data;
    else if (usersResponse.users && Array.isArray(usersResponse.users)) users = usersResponse.users;
    
    // Normalize user data for consistent handling
    return users.map((user: any) => ({
      ...user,
      // Create computed name field
      name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      // Normalize phone field
      phone: user.phone || user.contact_phone,
      // Normalize status field
      status: user.status || (user.is_active ? 'active' : 'inactive'),
      // Normalize role field
      role: user.role || user.role_id
    }));
  }, [usersResponse]);

  // Get unique roles and statuses for filters - with safe string extraction
  const uniqueRoles = extractUniqueStrings(rawUsers, 'role');
  const uniqueStatuses = extractUniqueStrings(rawUsers, 'status');

  // Filtering and Sorting logic
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...rawUsers];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        safeToString(user.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeToString(user.email).toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeToString(user.username).toLowerCase().includes(searchTerm.toLowerCase()) ||
        safeToString(user.phone).includes(searchTerm)
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => safeToString(user.role) === roleFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => safeToString(user.status) === statusFilter);
    }

    // Sort the filtered results
    const sorted = filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = safeToString(a.name).toLowerCase();
          bValue = safeToString(b.name).toLowerCase();
          break;
        case 'email':
          aValue = safeToString(a.email).toLowerCase();
          bValue = safeToString(b.email).toLowerCase();
          break;
        case 'role':
          aValue = (roleLabels[safeToString(a.role)] || safeToString(a.role)).toLowerCase();
          bValue = (roleLabels[safeToString(b.role)] || safeToString(b.role)).toLowerCase();
          break;
        case 'status':
          aValue = safeToString(a.status);
          bValue = safeToString(b.status);
          break;
        case 'created_at':
          aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
          bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rawUsers, sortField, sortDirection, searchTerm, roleFilter, statusFilter]);

  // Apply pagination
  const pagination = usePagination(filteredAndSortedUsers, {
    initialPage: 1,
    initialItemsPerPage: 20
  });

  const users = pagination.paginatedItems;

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
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

  const handleOpenModal = (user?: User) => {
    setSelectedUser(user || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleSave = async (data: any) => {
    try {
      if (selectedUser) {
        await userService.updateUser(selectedUser.id, data);
        toast({
          title: "İstifadəçi yeniləndi",
          description: "İstifadəçi məlumatları uğurla yeniləndi.",
        });
      } else {
        await userService.createUser(data);
        toast({
          title: "İstifadəçi əlavə edildi",
          description: "Yeni istifadəçi uğurla yaradıldı.",
        });
      }
      
      await queryClient.invalidateQueries({ queryKey: ['users'] });
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

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (user: User, deleteType: 'soft' | 'hard') => {
    try {
      await userService.deleteUser(user.id);
      
      toast({
        title: "İstifadəçi silindi",
        description: "İstifadəçi uğurla silindi.",
      });
      
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      toast({
        title: "Silinə bilmədi",
        description: error instanceof Error ? error.message : "İstifadəçi silinərkən xəta baş verdi.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const handleExport = () => {
    const csvData = users.map(user => ({
      'Ad və Soyad': safeToString(user.name),
      'Email': safeToString(user.email),
      'İstifadəçi adı': safeToString(user.username),
      'Rol': roleLabels[safeToString(user.role)] || safeToString(user.role),
      'Region': user.region?.name ? safeToString(user.region.name) : '',
      'Müəssisə': user.institution?.name ? safeToString(user.institution.name) : '',
      'Departament': user.department ? safeToString(user.department) : '',
      'Telefon': safeToString(user.phone),
      'Status': safeToString(user.status) === 'active' ? 'Aktiv' : 'Deaktiv',
      'Yaradıldı': user.created_at ? new Date(user.created_at).toLocaleDateString('az-AZ') : '',
    }));

    if (csvData.length === 0) {
      toast({
        title: "Export edilə bilmədi",
        description: "Export ediləcək məlumat yoxdur.",
        variant: "destructive",
      });
      return;
    }

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `istifadeciler-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadgeVariant = (status: string) => {
    return status === 'active' ? 'default' : 'secondary';
  };

  const getRoleBadgeVariant = (role: string) => {
    if (['superadmin', 'regionadmin'].includes(role)) return 'destructive';
    if (['sektoradmin', 'məktəbadmin'].includes(role)) return 'secondary';
    return 'outline';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">İstifadəçilər</h1>
            <p className="text-muted-foreground">Sistem istifadəçilərinin idarə edilməsi</p>
          </div>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">İstifadəçi</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Region/Müəssisə</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Yaradıldı</TableHead>
                <TableHead className="text-right w-[100px]">Əməliyyat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1,2,3,4,5].map((i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-16 bg-muted rounded animate-pulse" /></TableCell>
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
        <p className="text-muted-foreground">İstifadəçilər yüklənərkən problem yarandı.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">İstifadəçilər</h1>
          <p className="text-muted-foreground">Sistem istifadəçilərinin idarə edilməsi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Export
          </Button>
          <Button className="flex items-center gap-2" onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4" />
            Yeni İstifadəçi
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="İstifadəçi axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün rollar</SelectItem>
              {uniqueRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleLabels[role] || role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="inactive">Deaktiv</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {pagination.totalItems} istifadəçi
          </span>
          {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
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
              <TableHead className="w-[250px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  İstifadəçi
                  {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('role')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Rol
                  {getSortIcon('role')}
                </Button>
              </TableHead>
              <TableHead>Region/Müəssisə</TableHead>
              <TableHead>Telefon</TableHead>
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
                  onClick={() => handleSort('created_at')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Yaradıldı
                  {getSortIcon('created_at')}
                </Button>
              </TableHead>
              <TableHead className="text-right w-[100px]">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.totalItems === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Heç bir istifadəçi tapılmadı.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: any, index: number) => {
                // Debug: log problematic user data for first user
                if (index === 0) {
                  console.log('🔍 First user data:', user);
                  console.log('🔍 User role:', user.role, typeof user.role);
                }
                
                const userRole = safeToString(user.role);
                const userStatus = safeToString(user.status);
                
                return (
                  <TableRow key={user.id || index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{safeToString(user.name)}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {safeToString(user.email)}
                          </div>
                          {user.username && (
                            <div className="text-xs text-muted-foreground">@{safeToString(user.username)}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(userRole)}>
                        {roleLabels[userRole] || userRole}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{safeToString(user.region?.name || user.institution?.name || '-')}</div>
                        {user.department && (
                          <div className="text-xs text-muted-foreground">
                            {safeToString(user.department)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.phone ? (
                        <div className="text-sm flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {safeToString(user.phone)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(userStatus)}>
                        {userStatus === 'active' ? 'Aktiv' : 'Deaktiv'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('az-AZ') : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenModal(user)}
                          title="Redaktə et"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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

      {/* User Modal */}
      <UserModal
        open={isModalOpen}
        onClose={handleCloseModal}
        user={selectedUser}
        onSave={handleSave}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        item={userToDelete}
        onConfirm={handleDeleteConfirm}
        itemType="istifadəçi"
      />
    </div>
  );
}