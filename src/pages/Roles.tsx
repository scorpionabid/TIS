import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Loader2, Shield, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Role, CreateRoleData, roleService } from "@/services/roles";
import { RoleModal } from "@/components/modals/RoleModal";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { useToast } from "@/hooks/use-toast";

type SortField = 'name' | 'display_name' | 'level' | 'role_category' | 'permissions';
type SortDirection = 'asc' | 'desc';

export default function Roles() {
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

  // Load roles
  const { data: rolesResponse, isLoading, error } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.getAll(),
  });

  const rawRoles = rolesResponse?.roles || [];

  // Load permissions for modal
  const { data: permissionsResponse } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => roleService.getPermissions(),
    staleTime: 1000 * 60 * 10,
  });

  const allPermissions = permissionsResponse?.permissions || [];

  // Filtering and Sorting logic
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

  // Get unique levels and categories for filters
  const uniqueLevels = [...new Set(rawRoles.map(role => role.level))].sort((a, b) => a - b);
  const uniqueCategories = [...new Set(rawRoles.map(role => role.role_category))];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rollar</h1>
            <p className="text-muted-foreground">Sistem rollarının və icazələrinin idarə edilməsi</p>
          </div>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Ad</TableHead>
                <TableHead>Göstəriş adı</TableHead>
                <TableHead>Təsvir</TableHead>
                <TableHead>Səviyyə</TableHead>
                <TableHead>Kateqoriya</TableHead>
                <TableHead>İcazələr</TableHead>
                <TableHead className="text-right w-[100px]">Əməliyyat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1,2,3,4,5].map((i) => (
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

  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Rollar yüklənərkən problem yarandı.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
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
                  onClick={() => handleSort('display_name')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Göstəriş adı
                  {getSortIcon('display_name')}
                </Button>
              </TableHead>
              <TableHead>Təsvir</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('level')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Səviyyə
                  {getSortIcon('level')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('role_category')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Kateqoriya
                  {getSortIcon('role_category')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('permissions')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  İcazələr
                  {getSortIcon('permissions')}
                </Button>
              </TableHead>
              <TableHead className="text-right w-[100px]">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Heç bir rol tapılmadı.
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      {role.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {role.display_name || role.name}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate" title={role.description}>
                      {role.description || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getLevelBadgeColor(role.level)} border-0`}>
                      Səviyyə {role.level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getCategoryBadgeVariant(role.role_category)}>
                      {role.role_category === 'system' ? 'Sistem' : role.role_category === 'custom' ? 'Özəl' : role.role_category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{role.permissions.length}</span>
                      <span className="text-xs text-muted-foreground">icazə</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleOpenModal(role)}
                        title="Redaktə et"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {role.role_category !== 'system' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteClick(role)}
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