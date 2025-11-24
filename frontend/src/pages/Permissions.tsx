import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search, Filter, AlertTriangle, Eye, Loader2, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Permission, permissionService, PermissionCategory, PermissionScope } from "@/services/permissions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ResponsiveTable, ResponsiveTableColumn } from "@/components/ui/responsive-table";
import { PermissionDetailModal } from "@/components/modals/PermissionDetailModal";

export default function Permissions() {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check access permissions - SuperAdmin only
  const isSuperAdmin = currentUser && currentUser.role === 'superadmin';

  // Load permissions
  const { data: permissionsData, isLoading, error } = useQuery({
    queryKey: ['permissions', searchTerm, categoryFilter, scopeFilter, statusFilter, currentPage, perPage],
    queryFn: () => permissionService.getAll({
      search: searchTerm || undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      scope: scopeFilter !== 'all' ? scopeFilter : undefined,
      is_active: statusFilter !== 'all' ? (statusFilter === 'active') : undefined,
      page: currentPage,
      per_page: perPage,
    }),
    enabled: isSuperAdmin,
  });

  // Load categories
  const { data: categoriesData } = useQuery({
    queryKey: ['permission-categories'],
    queryFn: () => permissionService.getCategories(),
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 10,
  });

  // Load scopes
  const { data: scopesData } = useQuery({
    queryKey: ['permission-scopes'],
    queryFn: () => permissionService.getScopes(),
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 10,
  });

  const permissions = permissionsData?.permissions || [];
  const categories = categoriesData?.categories || [];
  const scopes = scopesData?.scopes || [];

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setScopeFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, scopeFilter, statusFilter]);

  // Security check
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

  const handleToggleStatus = async (permission: Permission) => {
    try {
      const newStatus = !permission.is_active;
      const response = await permissionService.update(permission.id, {
        is_active: newStatus
      });

      if (response.warning) {
        toast({
          title: "Diqqət",
          description: response.warning,
          variant: "default",
        });
      } else {
        toast({
          title: "Status dəyişdirildi",
          description: `${permission.name} ${newStatus ? 'aktiv' : 'qeyri-aktiv'} edildi`,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['permissions'] });
    } catch (error) {
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Status dəyişdirilərkən problem yarandı.",
        variant: "destructive",
      });
    }
  };

  const getScopeBadgeColor = (scope: string) => {
    switch (scope) {
      case 'global': return 'bg-red-100 text-red-800 border-red-300';
      case 'system': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'regional': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'sector': return 'bg-green-100 text-green-800 border-green-300';
      case 'institution': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'classroom': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'global': return 'Global';
      case 'system': return 'Sistem';
      case 'regional': return 'Regional';
      case 'sector': return 'Sektor';
      case 'institution': return 'Məktəb';
      case 'classroom': return 'Sinif';
      default: return scope;
    }
  };

  const isSystemPermission = (permission: Permission) => {
    return permission.name.includes('system.') ||
           ['roles.create', 'roles.delete', 'users.delete'].includes(permission.name);
  };

  // Define table columns
  const columns: ResponsiveTableColumn[] = [
    {
      key: 'name',
      label: 'Səlahiyyət Adı',
      className: 'w-[250px]',
      render: (value) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium text-sm">{value}</span>
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
      label: 'Göstəriş Adı',
      render: (value, permission) => value || permission.name,
      hideOnMobile: true,
      className: 'max-w-[200px] truncate'
    },
    {
      key: 'resource',
      label: 'Resource',
      render: (value) => (
        <span className="text-sm text-muted-foreground">{value || '-'}</span>
      ),
      hideOnMobile: true
    },
    {
      key: 'action',
      label: 'Action',
      render: (value) => (
        <Badge variant="outline" className="text-xs">
          {value || '-'}
        </Badge>
      ),
      hideOnMobile: true
    },
    {
      key: 'category',
      label: 'Kateqoriya',
      render: (value) => (
        <Badge variant="secondary" className="text-xs">
          {value || 'N/A'}
        </Badge>
      ),
      hideOnMobile: true
    },
    {
      key: 'scope',
      label: 'Scope',
      render: (value) => (
        <Badge className={`${getScopeBadgeColor(value)} border text-xs`}>
          {getScopeLabel(value)}
        </Badge>
      ),
      mobileRender: (value) => (
        <Badge className={`${getScopeBadgeColor(value)} border text-xs`}>
          {getScopeLabel(value)}
        </Badge>
      )
    },
    {
      key: 'roles_count',
      label: 'Rollar',
      render: (value) => (
        <span className="text-sm text-muted-foreground">{value || 0} rol</span>
      ),
      hideOnMobile: true
    },
    {
      key: 'users_count',
      label: 'İstifadəçilər',
      render: (value) => (
        <span className="text-sm text-muted-foreground">{value || 0} istif.</span>
      ),
      hideOnMobile: true
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value, permission) => (
        <Switch
          checked={value}
          onCheckedChange={() => handleToggleStatus(permission)}
          disabled={isSystemPermission(permission)}
          className="data-[state=checked]:bg-green-600"
        />
      ),
      mobileRender: (value, permission) => (
        <Switch
          checked={value}
          onCheckedChange={() => handleToggleStatus(permission)}
          disabled={isSystemPermission(permission)}
          className="data-[state=checked]:bg-green-600"
        />
      )
    },
    {
      key: 'actions',
      label: '',
      render: (_, permission) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setSelectedPermission(permission);
              setDetailModalOpen(true);
            }}>
              <Eye className="h-4 w-4 mr-2" />
              Detallar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-[50px]'
    },
  ];

  if (isLoading) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Səlahiyyət İdarəetməsi</h1>
            <p className="text-muted-foreground">Sistem səlahiyyətlərinin idarə edilməsi</p>
          </div>
        </div>

        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Səlahiyyətlər yüklənərkən problem yarandı.</p>
      </div>
    );
  }

  const activeCount = permissions.filter(p => p.is_active).length;

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Səlahiyyət İdarəetməsi</h1>
          <p className="text-muted-foreground">
            Cəmi {permissionsData?.total || 0} səlahiyyət · {activeCount} aktiv
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Səlahiyyət axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full sm:w-[250px]"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Kateqoriya" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.name} value={category.name}>
                  {category.name} ({category.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün scope-lar</SelectItem>
              {scopes.map((scope) => (
                <SelectItem key={scope.name} value={scope.name}>
                  {scope.label} ({scope.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="inactive">Qeyri-aktiv</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(searchTerm || categoryFilter !== 'all' || scopeFilter !== 'all' || statusFilter !== 'all') && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <Filter className="h-4 w-4 mr-1" />
            Filterləri təmizlə
          </Button>
        )}
      </div>

      {/* Permissions Table */}
      <ResponsiveTable
        data={permissions}
        columns={columns}
        loading={isLoading}
        emptyMessage="Heç bir səlahiyyət tapılmadı"
      />

      {/* Pagination */}
      {permissionsData && permissionsData.total > perPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="text-sm text-muted-foreground">
            Göstərilir {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, permissionsData.total)} / {permissionsData.total}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              İlk
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Əvvəlki
            </Button>

            <span className="text-sm px-3">
              Səhifə {currentPage} / {permissionsData.last_page}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(permissionsData.last_page, prev + 1))}
              disabled={currentPage === permissionsData.last_page}
            >
              Növbəti
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(permissionsData.last_page)}
              disabled={currentPage === permissionsData.last_page}
            >
              Son
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Səhifə başına:</label>
            <Select value={perPage.toString()} onValueChange={(value) => {
              setPerPage(Number(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="215">Hamısı</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Permission Detail Modal */}
      <PermissionDetailModal
        open={detailModalOpen}
        permission={selectedPermission}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedPermission(null);
        }}
      />
    </div>
  );
}
