import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  School, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  Building2,
  Users,
  BookOpen,
  TrendingUp,
  Eye,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '../components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { preschoolsService, type Preschool, type PreschoolFilters, type PreschoolCreateData } from '../services/preschools';
import { sectorsService } from '../services/sectors';
import { userService } from '../services/users';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { PreschoolCreateModal } from '../components/modals/PreschoolCreateModal';
import { PreschoolEditModal } from '../components/modals/PreschoolEditModal';
import { PreschoolDetailModal } from '../components/modals/PreschoolDetailModal';

const PRESCHOOL_TYPES = [
  { value: 'kindergarten', label: 'Uşaq Bağçası', icon: '🏫' },
  { value: 'preschool_center', label: 'Məktəbəqədər Təhsil Mərkəzi', icon: '🎓' },
  { value: 'nursery', label: 'Uşaq Evləri', icon: '🏡' }
] as const;

export default function Preschools() {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPreschool, setSelectedPreschool] = useState<Preschool | null>(null);

  const queryClient = useQueryClient();

  // Build filters
  const filters: PreschoolFilters = {
    ...(searchTerm && { search: searchTerm }),
    ...(selectedType !== 'all' && { type: selectedType as any }),
    ...(selectedSector !== 'all' && { sector_id: parseInt(selectedSector) }),
    ...(selectedStatus !== 'all' && { is_active: selectedStatus === 'active' }),
    sort_by: 'name',
    sort_order: 'asc'
  };

  // Fetch preschools
  const { data: preschoolsResponse, isLoading, error } = useQuery({
    queryKey: ['preschools', filters],
    queryFn: () => preschoolsService.getPreschools(filters),
    refetchOnWindowFocus: false,
  });

  // Load sectors for filters - role-based
  const { data: sectorsResponse } = useQuery({
    queryKey: ['sectors', currentUser?.role, currentUser?.institution?.id],
    queryFn: async () => {
      if (currentUser?.role === 'superadmin') {
        // SuperAdmin can see all sectors
        return await sectorsService.getSectors();
      } else if (currentUser?.role === 'regionadmin') {
        // RegionAdmin can only see sectors under their region
        if (currentUser.institution?.id) {
          return await sectorsService.getSectorsByRegion(currentUser.institution.id);
        }
      } else if (currentUser?.role === 'sektoradmin') {
        // SektorAdmin can only see their own sector
        if (currentUser.institution) {
          return { data: [currentUser.institution] };
        }
      }
      return { data: [] };
    },
    enabled: !!currentUser,
    refetchOnWindowFocus: false,
  });

  // Fetch statistics
  const { data: statisticsResponse } = useQuery({
    queryKey: ['preschool-statistics'],
    queryFn: () => preschoolsService.getPreschoolStatistics(),
    refetchOnWindowFocus: false,
  });

  const preschools = preschoolsResponse?.data || [];
  const sectors = sectorsResponse?.data || [];
  const statistics = statisticsResponse?.data;

  // Mutations
  const createMutation = useMutation({
    mutationFn: preschoolsService.createPreschool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preschools'] });
      queryClient.invalidateQueries({ queryKey: ['preschool-statistics'] });
      setIsCreateModalOpen(false);
      toast.success('Məktəbəqədər müəssisə uğurla yaradıldı');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Məktəbəqədər müəssisə yaratmaq mümkün olmadı');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      preschoolsService.updatePreschool(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preschools'] });
      setIsEditModalOpen(false);
      toast.success('Məktəbəqədər müəssisə uğurla yeniləndi');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Məktəbəqədər müəssisə yeniləmək mümkün olmadı');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: preschoolsService.deletePreschool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preschools'] });
      queryClient.invalidateQueries({ queryKey: ['preschool-statistics'] });
      toast.success('Məktəbəqədər müəssisə uğurla silindi');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Məktəbəqədər müəssisə silmək mümkün olmadı');
    },
  });

  const handleOpenCreateModal = () => {
    setSelectedPreschool(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (preschool: Preschool) => {
    setSelectedPreschool(preschool);
    setIsEditModalOpen(true);
  };

  const handleOpenDetailModal = (preschool: Preschool) => {
    setSelectedPreschool(preschool);
    setIsDetailModalOpen(true);
  };

  const handleCreate = (data: PreschoolCreateData) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: any) => {
    if (selectedPreschool) {
      updateMutation.mutate({ id: selectedPreschool.id, data });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Bu məktəbəqədər müəssisəni silmək istədiyinizə əminsiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  // Get type icon and color
  const getTypeInfo = (type: string) => {
    const typeInfo = PRESCHOOL_TYPES.find(t => t.value === type);
    return typeInfo || { icon: '🏫', label: type };
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Xəta baş verdi</h3>
          <p className="text-muted-foreground">Məktəbəqədər müəssisələr yüklənərkən xəta baş verdi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Məktəbəqədər Müəssisələr</h1>
          <p className="text-muted-foreground">
            Uşaq bağçaları, məktəbəqədər təhsil mərkəzləri və uşaq evlərini idarə edin
          </p>
        </div>
        {/* Only superadmin, regionadmin, and sektoradmin can create preschools */}
        {currentUser?.role && ['superadmin', 'regionadmin', 'sektoradmin'].includes(currentUser.role) && (
          <Button onClick={handleOpenCreateModal} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Yeni Məktəbəqədər Müəssisə
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Ümumi</p>
                  <p className="text-2xl font-bold">{statistics.total_preschools}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Aktiv</p>
                  <p className="text-2xl font-bold">{statistics.active_preschools}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Uşaqlar</p>
                  <p className="text-2xl font-bold">{statistics.performance_summary.total_children}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Müəllimlər</p>
                  <p className="text-2xl font-bold">{statistics.performance_summary.total_teachers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Məktəbəqədər müəssisə axtarın..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Növ seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün növlər</SelectItem>
                {PRESCHOOL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Sektor seçin" />
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
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Qeyri-aktiv</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Preschools Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : preschools.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Məktəbəqədər müəssisə tapılmadı</h3>
            <p className="text-muted-foreground mb-4">
              Axtarış kriteriyalarınıza uyğun məktəbəqədər müəssisə yoxdur
            </p>
            <Button onClick={handleOpenCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              İlk məktəbəqədər müəssisəni yaradın
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {preschools.map((preschool) => {
            const typeInfo = getTypeInfo(preschool.type);
            return (
              <Card key={preschool.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{typeInfo.icon}</span>
                        <Badge variant={preschool.is_active ? 'default' : 'secondary'}>
                          {typeInfo.label}
                        </Badge>
                        {preschool.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <CardTitle className="text-lg leading-tight">
                        {preschool.name}
                      </CardTitle>
                      {preschool.short_name && (
                        <p className="text-sm text-muted-foreground">{preschool.short_name}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDetailModal(preschool)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ətraflı baxış
                        </DropdownMenuItem>
                        {/* Only superadmin, regionadmin, and sektoradmin can edit/delete preschools */}
                        {currentUser?.role && ['superadmin', 'regionadmin', 'sektoradmin'].includes(currentUser.role) && (
                          <>
                            <DropdownMenuItem onClick={() => handleOpenEditModal(preschool)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Redaktə et
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(preschool.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Sector Info */}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4 mr-2" />
                      <span>{preschool.sector_name}</span>
                    </div>

                    {/* Location */}
                    {preschool.address && (
                      <div className="flex items-start text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{preschool.address}</span>
                      </div>
                    )}

                    {/* Contact */}
                    <div className="flex items-center justify-between text-sm">
                      {preschool.phone && (
                        <div className="flex items-center text-muted-foreground">
                          <Phone className="h-3 w-3 mr-1" />
                          <span className="text-xs">{preschool.phone}</span>
                        </div>
                      )}
                      {preschool.email && (
                        <div className="flex items-center text-muted-foreground">
                          <Mail className="h-3 w-3 mr-1" />
                          <span className="text-xs">{preschool.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Manager Info */}
                    {preschool.manager ? (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <User className="h-4 w-4 mr-2" />
                        <span>
                          {(preschool.manager.first_name && preschool.manager.last_name) 
                            ? `${preschool.manager.first_name} ${preschool.manager.last_name}`
                            : preschool.manager.username || preschool.manager.email?.split('@')[0] || 'Admin'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center text-sm text-amber-600">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        <span>Menecer təyin edilməyib</span>
                      </div>
                    )}

                    {/* Statistics */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {preschool.statistics.total_children}
                        </div>
                        <div className="text-xs text-muted-foreground">Uşaq</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {preschool.statistics.total_teachers}
                        </div>
                        <div className="text-xs text-muted-foreground">Müəllim</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">
                          {preschool.statistics.total_staff}
                        </div>
                        <div className="text-xs text-muted-foreground">İşçi</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Components */}
      <PreschoolCreateModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreate}
      />

      <PreschoolEditModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        preschool={selectedPreschool}
        onSave={handleUpdate}
      />

      <PreschoolDetailModal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        preschool={selectedPreschool}
        onEdit={handleOpenEditModal}
      />
    </div>
  );
}