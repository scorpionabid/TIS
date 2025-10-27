import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveTable, ResponsiveTableColumn, MobileStatusBadge, MobileActionButton } from "@/components/ui/responsive-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Loader2, Shield, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Role, CreateRoleData, roleService } from "@/services/roles";
import { RoleModal } from "@/components/modals/RoleModal";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type SortField = 'name' | 'display_name' | 'level' | 'role_category' | 'permissions';
type SortDirection = 'asc' | 'desc';

export default function Roles() {
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check access permissions
  const isSuperAdmin = currentUser && currentUser.role === 'superadmin';

  // Load roles - use enabled prop
  const { data: rolesResponse, isLoading, error } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.getAll(),
    enabled: isSuperAdmin,
  });

  const rawRoles = rolesResponse?.roles || [];

  // Load permissions for modal - use enabled prop
  const { data: permissionsResponse } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => roleService.getPermissions(),
    staleTime: 1000 * 60 * 10,
    enabled: isSuperAdmin,
  });

  const allPermissions = permissionsResponse?.permissions || [];

  // Filtering and Sorting logic - moved before early return
  const roles = useMemo(() => {
    let filtered = [...rawRoles];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(role => 
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (role.display_name && role.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(role => role.role_category === categoryFilter);
    }

    // Apply level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(role => role.level.toString() === levelFilter);
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
        case 'display_name':
          aValue = (a.display_name || a.name).toLowerCase();
          bValue = (b.display_name || b.name).toLowerCase();
          break;
        case 'level':
          aValue = a.level;
          bValue = b.level;
          break;
        case 'role_category':
          aValue = a.role_category.toLowerCase();
          bValue = b.role_category.toLowerCase();
          break;
        case 'permissions':
          aValue = a.permissions.length;
          bValue = b.permissions.length;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rawRoles, sortField, sortDirection, searchTerm, categoryFilter, levelFilter]);

  // Security check - only SuperAdmin can access roles management
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız SuperAdmin istifadəçiləri daxil ola bilər
          </p>
        </div>
      </div>
    );
  }

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setLevelFilter('all');
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

  const handleOpenModal = (role?: Role) => {
    setSelectedRole(role || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRole(null);
  };

  const handleSave = async (data: CreateRoleData) => {
    try {
      if (selectedRole) {
        await roleService.update(selectedRole.id, data);
        toast({
          title: "Rol yeniləndi",
          description: "Rol məlumatları uğurla yeniləndi.",
        });
      } else {
        await roleService.create(data);
        toast({
          title: "Rol əlavə edildi",
          description: "Yeni rol uğurla yaradıldı.",
        });
      }
      
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
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

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (role: Role, deleteType: 'soft' | 'hard') => {
    try {
      await roleService.delete(role.id, deleteType);
      
      const deleteMessage = 'Rol silindi';
      const deleteDescription = 'Rol uğurla silindi.';
      
      toast({
        title: deleteMessage,
        description: deleteDescription,
      });
      
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
    } catch (error) {
      toast({
        title: "Silinə bilmədi",
        description: error instanceof Error ? error.message : "Rol silinərkən xəta baş verdi.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false);
    setRoleToDelete(null);
  };

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case 'system': return 'default';
      case 'custom': return 'secondary';
      default: return 'outline';
    }
  };

  const getLevelBadgeColor = (level: number) => {
    if (level <= 2) return 'bg-red-100 text-red-800';
    if (level <= 5) return 'bg-orange-100 text-orange-800';
    if (level <= 8) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  // Define responsive table columns
  const columns: ResponsiveTableColumn[] = [
    {
      key: 'name',
      label: 'Ad',
      className: 'w-[200px]',
      render: (value, role) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          {value}
        </div>
      ),
      mobileRender: (value) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'display_name',
      label: 'Göstəriş adı',
      render: (value, role) => value || role.name,
      hideOnMobile: true
    },
    {
      key: 'description',
      label: 'Təsvir',
      render: (value) => (
        <div className="max-w-[200px] truncate" title={value}>
          {value || '-'}
        </div>
      ),
      mobileRender: (value) => (
        <span className="text-sm text-muted-foreground">
          {value ? (value.length > 50 ? `${value.substring(0, 50)}...` : value) : '-'}
        </span>
      )
    },
    {
      key: 'level',
      label: 'Səviyyə',
      render: (value) => (
        <Badge className={`${getLevelBadgeColor(value)} border-0`}>
          Səviyyə {value}
        </Badge>
      ),
      mobileRender: (value) => (
        <MobileStatusBadge
          status={`Səviyyə ${value}`}
          variant="outline"
        />
      )
    },
    {
      key: 'role_category',
      label: 'Kateqoriya',
      render: (value) => (
        <Badge variant={getCategoryBadgeVariant(value)}>
          {value === 'system' ? 'Sistem' : value === 'custom' ? 'Özəl' : value}
        </Badge>
      ),
      mobileRender: (value) => (
        <MobileStatusBadge
          status={value === 'system' ? 'Sistem' : value === 'custom' ? 'Özəl' : value}
          variant={getCategoryBadgeVariant(value) as any}
        />
      )
    },
    {
      key: 'permissions',
      label: 'İcazələr',
      render: (value) => (
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">{value.length}</span>
          <span className="text-xs text-muted-foreground">icazə</span>
        </div>
      ),
      mobileRender: (value) => (
        <span className="text-sm font-medium">{value.length} icazə</span>
      )
    }
  ];

  // Get unique levels and categories for filters
  const uniqueLevels = [...new Set(rawRoles.map(role => role.level))].sort((a, b) => a - b);
  const uniqueCategories = [...new Set(rawRoles.map(role => role.role_category))];

  if (isLoading) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rollar</h1>
            <p className="text-muted-foreground">Sistem rollarının və icazələrinin idarə edilməsi</p>
          </div>
        </div>
        
        <ResponsiveTable
          data={[]}
          columns={columns}
          loading={true}
          emptyMessage="Rol tapılmadı"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Rollar yüklənərkən problem yarandı.</p>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rollar</h1>
          <p className="text-muted-foreground">Sistem rollarının və icazələrinin idarə edilməsi</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4" />
          Yeni Rol
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rol axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Kateqoriya" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === 'system' ? 'Sistem' : category === 'custom' ? 'Özəl' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Səviyyə" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün səviyyələr</SelectItem>
              {uniqueLevels.map((level) => (
                <SelectItem key={level} value={level.toString()}>
                  Səviyyə {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {roles.length} rol
          </span>
          {(searchTerm || categoryFilter !== 'all' || levelFilter !== 'all') && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-1" />
              Filterləri təmizlə
            </Button>
          )}
        </div>
      </div>

      <ResponsiveTable
        data={roles}
        columns={columns}
        loading={isLoading}
        emptyMessage="Heç bir rol tapılmadı"
        actions={(role) => (
          <>
            <MobileActionButton
              onClick={() => handleOpenModal(role)}
              variant="outline"
            >
              <Edit className="h-3 w-3 mr-1" />
              Redaktə
            </MobileActionButton>
            {role.role_category !== 'system' && (
              <MobileActionButton
                onClick={() => handleDeleteClick(role)}
                variant="outline"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Sil
              </MobileActionButton>
            )}
          </>
        )}
      />

      {/* Role Modal */}
      <RoleModal
        open={isModalOpen}
        onClose={handleCloseModal}
        role={selectedRole}
        onSave={handleSave}
        permissions={allPermissions}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        item={roleToDelete}
        onConfirm={handleDeleteConfirm}
        itemType="rol"
      />
    </div>
  );
}