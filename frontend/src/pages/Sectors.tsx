import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Plus, Layers, MapPin, Users, School, TrendingUp, Phone, Mail, User, Edit, Trash2, Eye, BarChart3, Loader2, Filter, Building, Activity, Award, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sectorsService, SectorFilters, Sector, SectorCreateData, SectorTask, SectorTaskFilters, SectorTaskCreateData } from "@/services/sectors";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";

export default function Sectors() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState<boolean>(false);
  const [newTask, setNewTask] = useState<SectorTaskCreateData>({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    target_scope: 'sectoral',
    requires_approval: false
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for creating new sector
  const [newSector, setNewSector] = useState<SectorCreateData>({
    name: '',
    code: '',
    description: '',
    parent_id: 0,
    address: '',
    phone: '',
    email: '',
    is_active: true
  });

  // Build filters
  const filters: SectorFilters = useMemo(() => {
    const f: SectorFilters = {};
    if (selectedType !== 'all') f.type = selectedType;
    if (selectedRegion !== 'all') f.region_id = parseInt(selectedRegion);
    if (selectedStatus !== 'all') f.is_active = selectedStatus === 'active';
    if (searchQuery.trim()) f.search = searchQuery.trim();
    f.sort_by = 'name';
    f.sort_order = 'asc';
    return f;
  }, [selectedType, selectedRegion, selectedStatus, searchQuery]);

  // Load sectors data
  const { data: sectorsResponse, isLoading: sectorsLoading, error } = useQuery({
    queryKey: ['sectors', filters],
    queryFn: () => sectorsService.getSectors(filters),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Load statistics
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['sector-statistics'],
    queryFn: () => sectorsService.getSectorStatistics(),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Load available managers
  const { data: managersResponse } = useQuery({
    queryKey: ['available-managers'],
    queryFn: () => sectorsService.getAvailableManagers(),
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });

  // Load sector tasks when a sector is selected
  const { data: tasksResponse, isLoading: tasksLoading } = useQuery({
    queryKey: ['sector-tasks', selectedSector?.id],
    queryFn: () => selectedSector ? sectorsService.getSectorTasks(selectedSector.id, { per_page: 10 }) : null,
    enabled: !!selectedSector && activeTab === 'tasks',
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Load sector task statistics
  const { data: taskStatsResponse } = useQuery({
    queryKey: ['sector-task-statistics', selectedSector?.id],
    queryFn: () => selectedSector ? sectorsService.getSectorTaskStatistics(selectedSector.id) : null,
    enabled: !!selectedSector && activeTab === 'tasks',
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Use real data or fallback to mock data
  const sectors = sectorsResponse?.data || sectorsService.getMockSectors();
  const stats = statsResponse?.data || sectorsService.getMockStatistics();
  const availableManagers = managersResponse?.data || sectorsService.getMockManagers();

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: SectorCreateData) => sectorsService.createSector(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['sector-statistics'] });
      setShowCreateDialog(false);
      setNewSector({
        name: '',
        code: '',
        description: '',
        parent_id: 0,
        address: '',
        phone: '',
        email: '',
        is_active: true
      });
      toast({
        title: "Uğurlu",
        description: "Yeni sektor yaradildı.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Sektor yaratıdılarkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: number) => sectorsService.toggleSectorStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['sector-statistics'] });
      toast({
        title: "Uğurlu",
        description: "Sektor statusu dəyişdirildi.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Status dəyişdirilərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: { sectorId: number; task: SectorTaskCreateData }) => 
      sectorsService.createSectorTask(data.sectorId, data.task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sector-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sector-task-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] }); // To update pending tasks count
      setShowCreateTaskDialog(false);
      setNewTask({
        title: '',
        description: '',
        category: 'other',
        priority: 'medium',
        target_scope: 'sectoral',
        requires_approval: false
      });
      toast({
        title: "Uğurlu",
        description: "Tapşırıq uğurla yaradıldı.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Tapşırıq yaradılarkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });


  // Helper functions
  const getSectorTypeLabel = (type: string) => {
    switch (type) {
      case 'primary': return 'İbtidai təhsil';
      case 'secondary': return 'Orta təhsil';
      case 'preschool': return 'Məktəbəqədər';
      case 'vocational': return 'Peşə təhsili';
      case 'special': return 'Xüsusi təhsil';
      case 'mixed': return 'Qarışıq';
      default: return type;
    }
  };

  const getSectorTypeIcon = (type: string) => {
    switch (type) {
      case 'primary': return <School className="h-5 w-5 text-blue-500" />;
      case 'secondary': return <Building className="h-5 w-5 text-green-500" />;
      case 'preschool': return <Users className="h-5 w-5 text-purple-500" />;
      case 'vocational': return <Activity className="h-5 w-5 text-orange-500" />;
      case 'special': return <Award className="h-5 w-5 text-red-500" />;
      case 'mixed': return <Layers className="h-5 w-5 text-gray-500" />;
      default: return <Building className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 85) return <Badge variant="default">Əla ({rate}%)</Badge>;
    if (rate >= 70) return <Badge variant="outline">Yaxşı ({rate}%)</Badge>;
    if (rate >= 50) return <Badge variant="secondary">Orta ({rate}%)</Badge>;
    return <Badge variant="destructive">Zəif ({rate}%)</Badge>;
  };

  const handleCreateSector = () => {
    if (!newSector.name.trim() || newSector.parent_id === 0) {
      toast({
        title: "Xəta",
        description: "Sektor adı və region məcburidir.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newSector);
  };

  const handleViewDetails = (sector: Sector) => {
    setSelectedSector(sector);
    setActiveTab('details');
    setShowDetailsDialog(true);
  };

  const handleCreateTask = () => {
    if (!selectedSector || !newTask.title.trim()) {
      toast({
        title: "Xəta",
        description: "Tapşırıq başlığı məcburidir.",
        variant: "destructive",
      });
      return;
    }
    createTaskMutation.mutate({ sectorId: selectedSector.id, task: newTask });
  };


  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Sektor məlumatları yüklənərkən problem yarandı.</p>
        <p className="text-sm text-muted-foreground mt-2">Mock məlumatlarla davam edilir</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sektorlar</h1>
          <p className="text-muted-foreground">Regional sektorların idarə edilməsi</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tip" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün tiplər</SelectItem>
              <SelectItem value="primary">İbtidai</SelectItem>
              <SelectItem value="secondary">Orta</SelectItem>
              <SelectItem value="preschool">Məktəbəqədər</SelectItem>
              <SelectItem value="vocational">Peşə</SelectItem>
              <SelectItem value="special">Xüsusi</SelectItem>
              <SelectItem value="mixed">Qarışıq</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hamısı</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="inactive">Qeyri-aktiv</SelectItem>
            </SelectContent>
          </Select>
          
          <Input
            placeholder="Sektorlarda axtar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Yeni Sektor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Yeni Sektor Yaradın</DialogTitle>
                <DialogDescription>
                  Yeni sektor məlumatlarını daxil edin
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Sektor Adı *</Label>
                  <Input
                    id="name"
                    value={newSector.name}
                    onChange={(e) => setNewSector(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Məs: Orta təhsil sektoru"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Sektor Kodu *</Label>
                  <Input
                    id="code"
                    value={newSector.code}
                    onChange={(e) => setNewSector(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Məs: OTS-BAK-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Select value={newSector.parent_id.toString()} onValueChange={(value) => setNewSector(prev => ({ ...prev, parent_id: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Region seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">Bakı Şəhər Təhsil İdarəsi</SelectItem>
                      <SelectItem value="3">Gəncə Şəhər Təhsil İdarəsi</SelectItem>
                      <SelectItem value="4">Şəki Rayon Təhsil İdarəsi</SelectItem>
                      <SelectItem value="5">Şamaxı Rayon Təhsil İdarəsi</SelectItem>
                      <SelectItem value="6">Quba Rayon Təhsil İdarəsi</SelectItem>
                      <SelectItem value="30">LARTİ Regional Təhsil İdarəsi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Təsvir</Label>
                  <Textarea
                    id="description"
                    value={newSector.description}
                    onChange={(e) => setNewSector(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Sektorun ətraflı təsviri..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={newSector.phone}
                    onChange={(e) => setNewSector(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+994 XX XXX-XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newSector.email}
                    onChange={(e) => setNewSector(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="sektor@edu.az"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address">Ünvan</Label>
                  <Input
                    id="address"
                    value={newSector.address}
                    onChange={(e) => setNewSector(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Sektor ünvanı..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Ləğv et
                </Button>
                <Button 
                  onClick={handleCreateSector}
                  disabled={createMutation.isPending || !newSector.name.trim() || newSector.parent_id === 0}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Yarat
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Sektor</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.total_sectors
                  )}
                </p>
              </div>
              <Layers className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv Sektor</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.active_sectors
                  )}
                </p>
                <p className="text-xs text-green-500">
                  {Math.round((stats.active_sectors / stats.total_sectors) * 100)}% aktiv
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Müəssisələr</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.by_region.reduce((sum, region) => sum + region.total_institutions, 0).toLocaleString()
                  )}
                </p>
              </div>
              <Building className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Şagirdlər</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.by_region.reduce((sum, region) => sum + region.total_students, 0).toLocaleString()
                  )}
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectorsLoading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-secondary rounded"></div>
                  <div className="h-4 w-32 bg-secondary rounded"></div>
                </div>
                <div className="h-3 w-24 bg-secondary rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-secondary rounded"></div>
                  <div className="h-3 w-3/4 bg-secondary rounded"></div>
                </div>
                <div className="h-8 w-full bg-secondary rounded mt-4"></div>
              </CardContent>
            </Card>
          ))
        ) : sectors.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Sektor tapılmadı</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Seçilmiş filterlərə uyğun sektor yoxdur
            </p>
            <Button onClick={() => {
              setSelectedType('all');
              setSelectedRegion('all');
              setSelectedStatus('all');
              setSearchQuery('');
            }}>
              Filterləri sıfırla
            </Button>
          </div>
        ) : (
          sectors.map((sector) => (
            <Card key={sector.id} className={`hover:shadow-md transition-shadow ${sector.is_active ? '' : 'opacity-75'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getSectorTypeIcon(sector.type)}
                    <CardTitle className="text-base">{sector.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={sector.is_active ? 'default' : 'secondary'} className="text-xs">
                      {sector.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {sector.region_name}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getSectorTypeLabel(sector.type)}
                    </Badge>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span>Müəssisələr:</span>
                    <span className="font-medium">{sector.statistics.total_institutions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Şagirdlər:</span>
                    <span className="font-medium">{sector.statistics.total_students.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Müəllimlər:</span>
                    <span className="font-medium">{sector.statistics.total_teachers}</span>
                  </div>
                  {sector.statistics.pending_tasks > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Gözləyən tapşırıqlar:</span>
                      <span className="font-medium">{sector.statistics.pending_tasks}</span>
                    </div>
                  )}
                </div>
                
                {/* Performance Metrics */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Performans</span>
                    {getPerformanceBadge(sector.performance_metrics.response_rate)}
                  </div>
                </div>

                {/* Manager Info */}
                {sector.manager ? (
                  <div className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>
                      {(() => {
                        const displayName = (sector.manager.first_name && sector.manager.last_name) 
                          ? `${sector.manager.first_name} ${sector.manager.last_name}`
                          : sector.manager.username || sector.manager.email?.split('@')[0] || 'Admin';
                        return displayName;
                      })()}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 mb-4 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Menecer təyin edilməyib</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleViewDetails(sector)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ətraflı
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleStatusMutation.mutate(sector.id)}
                    disabled={toggleStatusMutation.isPending}
                  >
                    {sector.is_active ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <Activity className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Add New Sector Card */}
        <Card className="border-dashed hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setShowCreateDialog(true)}>
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px]">
            <Plus className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Yeni sektor əlavə et</p>
          </CardContent>
        </Card>
      </div>

      {/* Sector Details Dialog */}
      {selectedSector && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getSectorTypeIcon(selectedSector.type)}
                {selectedSector.name}
              </DialogTitle>
              <DialogDescription>
                {selectedSector.region_name} - {getSectorTypeLabel(selectedSector.type)}
              </DialogDescription>
            </DialogHeader>
            
            {/* Tabs */}
            <div className="flex space-x-1 border-b">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'details'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ətraflı məlumat
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'tasks'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tapşırıqlar ({selectedSector.statistics.pending_tasks})
              </button>
            </div>
            
            {/* Tab Content */}
            {activeTab === 'details' && (
              <div className="space-y-6 mt-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Əsas Məlumatlar</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kod:</span>
                      <span className="font-medium">{selectedSector.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={selectedSector.is_active ? 'default' : 'secondary'}>
                        {selectedSector.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
                      </Badge>
                    </div>
                    {selectedSector.phone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Telefon:</span>
                        <span className="font-medium">{selectedSector.phone}</span>
                      </div>
                    )}
                    {selectedSector.email && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{selectedSector.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Statistikalar</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Müəssisələr:</span>
                      <span className="font-medium">{selectedSector.statistics.total_institutions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Şagirdlər:</span>
                      <span className="font-medium">{selectedSector.statistics.total_students.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Müəllimlər:</span>
                      <span className="font-medium">{selectedSector.statistics.total_teachers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Heyət:</span>
                      <span className="font-medium">{selectedSector.statistics.total_staff}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Performans Göstəriciləri</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Cavab Nisbəti</span>
                      <span className="text-sm font-medium">{selectedSector.performance_metrics.response_rate}%</span>
                    </div>
                    <Progress value={selectedSector.performance_metrics.response_rate} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Tapşırıq Tamamlanması</span>
                      <span className="text-sm font-medium">{selectedSector.performance_metrics.task_completion_rate}%</span>
                    </div>
                    <Progress value={selectedSector.performance_metrics.task_completion_rate} className="h-2" />
                  </div>
                </div>
              </div>

              {/* Institution Breakdown */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Müəssisə Növləri</h4>
                <div className="space-y-2">
                  {selectedSector.institutions_breakdown.map((breakdown, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{breakdown.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{breakdown.count} ({breakdown.percentage}%)</span>
                        <div className="w-16 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${breakdown.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manager Info */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Menecer Məlumatları</h4>
                {selectedSector.manager ? (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {(selectedSector.manager.first_name && selectedSector.manager.last_name) 
                          ? `${selectedSector.manager.first_name} ${selectedSector.manager.last_name}`
                          : selectedSector.manager.username || selectedSector.manager.email?.split('@')[0] || 'Admin'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span>{selectedSector.manager.email}</span>
                      </div>
                      {selectedSector.manager.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{selectedSector.manager.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border border-amber-200 rounded-lg bg-amber-50 text-amber-800">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">Bu sektor üçün menecer təyin edilməyib</span>
                    </div>
                  </div>
                )}
              </div>

              {selectedSector.description && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Təsvir</h4>
                  <p className="text-sm text-muted-foreground">{selectedSector.description}</p>
                </div>
              )}
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Sektor Tapşırıqları</h3>
                  <Button 
                    size="sm" 
                    onClick={() => setShowCreateTaskDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Yeni Tapşırıq
                  </Button>
                </div>

                {/* Task Statistics */}
                {taskStatsResponse?.data && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <Card>
                      <CardContent className="p-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{taskStatsResponse.data.total_tasks}</p>
                          <p className="text-xs text-muted-foreground">Toplam</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-500">{taskStatsResponse.data.pending_tasks}</p>
                          <p className="text-xs text-muted-foreground">Gözləyən</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-500">{taskStatsResponse.data.in_progress_tasks}</p>
                          <p className="text-xs text-muted-foreground">İcrada</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-500">{taskStatsResponse.data.completed_tasks}</p>
                          <p className="text-xs text-muted-foreground">Tamamlanmış</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Tasks List */}
                <div className="space-y-2">
                  {tasksLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Tapşırıqlar yüklənir...</p>
                    </div>
                  ) : tasksResponse?.data?.data?.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Bu sektor üçün tapşırıq yoxdur</p>
                    </div>
                  ) : (
                    tasksResponse?.data?.data?.map((task) => (
                      <Card key={task.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Kateqoriya: {task.category}</span>
                              <span>Prioritet: {task.priority}</span>
                              {task.deadline && (
                                <span>Son tarix: {format(new Date(task.deadline), 'dd.MM.yyyy')}</span>
                              )}
                            </div>
                          </div>
                          <Badge variant={
                            task.status === 'completed' ? 'default' :
                            task.status === 'in_progress' ? 'secondary' :
                            task.status === 'pending' ? 'outline' : 'destructive'
                          }>
                            {task.status === 'completed' ? 'Tamamlandı' :
                             task.status === 'in_progress' ? 'İcrada' :
                             task.status === 'pending' ? 'Gözləyir' : task.status}
                          </Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Create Task Dialog */}
      <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Yeni Tapşırıq Yaradın</DialogTitle>
            <DialogDescription>
              {selectedSector?.name} üçün yeni tapşırıq yaradın
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Tapşırıq Başlığı *</Label>
              <Input
                id="task-title"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Tapşırıq başlığını daxil edin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Təsvir</Label>
              <Textarea
                id="task-description"
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Tapşırıq təsvirini daxil edin"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-category">Kateqoriya</Label>
                <Select value={newTask.category} onValueChange={(value: any) => setNewTask(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="report">Hesabat Hazırlığı</SelectItem>
                    <SelectItem value="maintenance">Təmir və İnfrastruktur</SelectItem>
                    <SelectItem value="event">Tədbir Təşkili</SelectItem>
                    <SelectItem value="audit">Audit və Nəzarət</SelectItem>
                    <SelectItem value="instruction">Təlimat və Metodik</SelectItem>
                    <SelectItem value="other">Digər</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-priority">Prioritet</Label>
                <Select value={newTask.priority} onValueChange={(value: any) => setNewTask(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Aşağı</SelectItem>
                    <SelectItem value="medium">Orta</SelectItem>
                    <SelectItem value="high">Yüksək</SelectItem>
                    <SelectItem value="urgent">Təcili</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-deadline">Son Tarix</Label>
              <Input
                id="task-deadline"
                type="datetime-local"
                value={newTask.deadline}
                onChange={(e) => setNewTask(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-scope">Məkan</Label>
              <Select value={newTask.target_scope} onValueChange={(value: any) => setNewTask(prev => ({ ...prev, target_scope: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sectoral">Bu sektor</SelectItem>
                  <SelectItem value="specific">Xüsusi seçim</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="all">Hamısı</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTaskDialog(false)}>
              Ləğv et
            </Button>
            <Button 
              onClick={handleCreateTask}
              disabled={createTaskMutation.isPending || !newTask.title.trim()}
            >
              {createTaskMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Yarat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}