import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MapPin, Loader2, AlertCircle, AlertTriangle, Search, RefreshCw, MoreHorizontal, Edit3, Trash2, Eye } from "lucide-react";
import { institutionService, CreateInstitutionData, Institution } from "@/services/institutions";
import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLES } from "@/constants/roles";
import { InstitutionModalStandardized } from "@/components/modals/InstitutionModalStandardized";
import { InstitutionDetailsModal } from "@/components/modals/InstitutionDetailsModal";
import { EnhancedDeleteModal } from "@/components/institutions/EnhancedDeleteModal";
import { useToast } from "@/hooks/use-toast";

type Region = Institution;

interface RegionStats {
  departments: number;
  institutions: number;
  users: number;
  active_users?: number;
  total_institutions?: number;
}

export default function Regions() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [regionStats, setRegionStats] = useState<Record<number, RegionStats>>({});
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [statsRefreshToken, setStatsRefreshToken] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalContext, setModalContext] = useState<{ mode: 'create' | 'edit'; region: Region | null } | null>(null);
  const [detailsRegion, setDetailsRegion] = useState<Region | null>(null);
  const [deleteRegion, setDeleteRegion] = useState<Region | null>(null);

  // Check access permissions
  const queryClient = useQueryClient();
  const hasAccess = currentUser && [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN].includes(currentUser.role);
  const canCreateRegions = currentUser?.role === USER_ROLES.SUPERADMIN;
  const canDeleteRegions = currentUser?.role === USER_ROLES.SUPERADMIN;

  const fetchAllRegions = async (): Promise<Region[]> => {
    if (!hasAccess) {
      return [];
    }
    return institutionService.getAllByLevel(2, { level: 2 });
  };

  const { data: regions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['regions', currentUser?.role, currentUser?.institution?.id],
    queryFn: fetchAllRegions,
    enabled: hasAccess,
  });

  const refreshRegions = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['regions'], exact: false });
    await queryClient.invalidateQueries({ queryKey: ['institutions'], exact: false });
    await refetch();
  }, [queryClient, refetch]);

  const handleRefreshStats = useCallback(() => {
    setStatsRefreshToken((prev) => prev + 1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
  }, []);

  const filteredRegions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('az');

    return regions.filter((region) => {
      const regionName = region?.name || '';
      const matchesSearch = !normalizedQuery || regionName.toLocaleLowerCase('az').includes(normalizedQuery);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && region.is_active) ||
        (statusFilter === 'inactive' && !region.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [regions, searchQuery, statusFilter]);

  const summaryStats = useMemo(() => {
    const totals = {
      total: filteredRegions.length,
      active: 0,
      inactive: 0,
      totalInstitutions: 0,
      totalUsers: 0,
    };

    filteredRegions.forEach((region) => {
      if (region.is_active) {
        totals.active += 1;
      } else {
        totals.inactive += 1;
      }

      const stats = regionStats[region.id];
      if (stats) {
        totals.totalInstitutions += stats.institutions || 0;
        totals.totalUsers += stats.users || 0;
      }
    });

    return totals;
  }, [filteredRegions, regionStats]);

  const statsWarningVisible = statsError && !isStatsLoading && regions.length > 0;

  const openCreateModal = useCallback(() => {
    setModalContext({ mode: 'create', region: null });
  }, []);

  const openEditModal = useCallback((region: Region) => {
    setModalContext({ mode: 'edit', region });
  }, []);

  const handleSaveRegion = useCallback(async (payload: CreateInstitutionData) => {
    if (!modalContext) {
      return;
    }
    try {
      if (modalContext.mode === 'edit' && modalContext.region) {
        await institutionService.update(modalContext.region.id, payload);
        toast({
          title: "Region yeniləndi",
          description: `${modalContext.region.name} məlumatları yeniləndi.`,
        });
      } else {
        await institutionService.create(payload);
        toast({
          title: "Yeni region yaradıldı",
          description: "Regional struktur uğurla əlavə edildi.",
        });
      }
      await refreshRegions();
      setModalContext(null);
    } catch (createError: any) {
      console.error('Region əməliyyatı uğursuz oldu', createError);
      toast({
        title: "Əməliyyat mümkün olmadı",
        description: createError instanceof Error ? createError.message : "Zəhmət olmasa yenidən cəhd edin.",
        variant: "destructive",
      });
      throw createError;
    }
  }, [modalContext, refreshRegions, toast]);

  const handleDeleteSuccess = useCallback(async () => {
    await refreshRegions();
    setDeleteRegion(null);
  }, [refreshRegions]);

  const formatDate = useCallback((value?: string) => {
    if (!value) {
      return '—';
    }

    try {
      return new Intl.DateTimeFormat('az-AZ', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value));
    } catch (err) {
      return value;
    }
  }, []);

  // Load aggregated statistics for all regions when they are available
  useEffect(() => {
    if (!hasAccess || regions.length === 0) return;

    let isCancelled = false;

    const fetchSummaries = async () => {
      if (isCancelled) return;
      setIsStatsLoading(true);
      setStatsError(false);
      try {
        const regionIds = regions.map((region) => region.id);
        const summaries = await institutionService.getSummaries(regionIds);

        if (isCancelled) return;

        const nextStats: Record<number, RegionStats> = {};
        regions.forEach((region) => {
          const summary = summaries?.[region.id] ?? summaries?.[String(region.id)] ?? {};
          nextStats[region.id] = {
            departments: Number(summary?.departments ?? 0),
            institutions: Number(summary?.institutions ?? 0),
            users: Number(summary?.users ?? 0),
            active_users: summary?.active_users !== undefined ? Number(summary.active_users) : undefined,
            total_institutions: summary?.total_institutions !== undefined ? Number(summary.total_institutions) : undefined,
          };
        });

        setRegionStats(nextStats);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Region summaries fetch failed:', error);
        }
        setRegionStats({});
        setStatsError(true);
      } finally {
        if (!isCancelled) {
          setIsStatsLoading(false);
        }
      }
    };

    fetchSummaries();

    return () => {
      isCancelled = true;
    };
  }, [regions, hasAccess, statsRefreshToken]);

  // Security check - only SuperAdmin and RegionAdmin can access regional management
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız SuperAdmin və RegionAdmin istifadəçiləri daxil ola bilər
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Sizin rolunuz: {currentUser?.role || 'Tanınmır'}
          </p>
        </div>
      </div>
    );
  }

  const statusOptions: Array<{ key: 'all' | 'active' | 'inactive'; label: string }> = [
    { key: 'all', label: 'Hamısı' },
    { key: 'active', label: 'Aktiv' },
    { key: 'inactive', label: 'Deaktiv' },
  ];

  const showResetFilters = searchQuery.trim().length > 0 || statusFilter !== 'all';
  const showEmptyState = !isLoading && filteredRegions.length === 0;
  const emptyStateMessage = searchQuery.trim().length > 0 ? 'Axtarışa uyğun region tapılmadı' : 'Heç bir region tapılmadı';
  const emptyStateDescription = searchQuery.trim().length > 0
    ? 'Fərqli açar söz yoxlayın və ya filtrləri sıfırlayın.'
    : canCreateRegions
      ? 'İdarəetməni başlamaq üçün yeni region əlavə edin.'
      : 'Hazırda region məlumatı mövcud deyil.';

  const getRegionDescription = (region: Region): string => {
    if (region?.type && typeof region.type === 'object' && region.type?.name) {
      return region.type.name;
    }

    if (typeof region?.type === 'string') {
      return region.type;
    }

    const regionName = region?.name || '';
    if (regionName.includes('Bakı')) return 'Paytaxt regionu';
    if (regionName.includes('Gəncə')) return 'Qərb regionu';
    if (regionName.includes('Şəki')) return 'Şimal-qərb regionu';
    if (regionName.includes('Şamaxı')) return 'Cənub-şərq regionu';
    if (regionName.includes('Quba')) return 'Şimal regionu';
    return 'Regional təhsil idarəsi';
  };

  if (isLoading) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Regionlar</h1>
            <p className="text-muted-foreground">Regional strukturların idarə edilməsi</p>
          </div>
          {canCreateRegions && (
            <Button className="flex items-center gap-2" disabled>
              <Plus className="h-4 w-4" />
              Yeni Region
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-8 w-full mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Regionlar</h1>
            <p className="text-muted-foreground">Regional strukturların idarə edilməsi</p>
          </div>
          {canCreateRegions && (
            <Button className="flex items-center gap-2" disabled>
              <Plus className="h-4 w-4" />
              Yeni Region
            </Button>
          )}
        </div>

        <Alert variant="destructive" className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <AlertDescription className="space-y-2">
            <p>Regionlar yüklənərkən xəta baş verdi. İnternet bağlantısını və ya icazələri yoxlayın.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Yenidən cəhd et
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Regionlar</h1>
              <p className="text-muted-foreground">
                Regional strukturların idarə edilməsi ({regions.length} region)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  void refreshRegions();
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Yenilə
              </Button>
              {canCreateRegions && (
                <Button type="button" className="flex items-center gap-2" onClick={openCreateModal}>
                  <Plus className="h-4 w-4" />
                  Yeni Region
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-3">
            <div className="relative w-full xl:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Region adı ilə axtar"
                className="pl-9"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option.key}
                  variant={statusFilter === option.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(option.key)}
                  className="rounded-full"
                >
                  {option.label}
                </Button>
              ))}
              {showResetFilters && (
                <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-muted-foreground">
                  Filtrləri sıfırla
                </Button>
              )}
              {regions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleRefreshStats}
                  disabled={isStatsLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isStatsLoading ? 'animate-spin' : ''}`} />
                  Statistikanı yenilə
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
            <Badge variant="secondary" className="px-3 py-1">Cəmi: {summaryStats.total}</Badge>
            <Badge variant="outline" className="px-3 py-1">Aktiv: {summaryStats.active}</Badge>
            <Badge variant="outline" className="px-3 py-1">Deaktiv: {summaryStats.inactive}</Badge>
            <Badge variant="outline" className="px-3 py-1">Müəssisələr: {summaryStats.totalInstitutions}</Badge>
            <Badge variant="outline" className="px-3 py-1">İstifadəçilər: {summaryStats.totalUsers}</Badge>
          </div>

          {statsWarningVisible && (
            <Alert variant="destructive" className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5" />
              <AlertDescription className="space-y-2">
                Region statistikası yenilənə bilmədi. Zəhmət olmasa yenidən cəhd edin.
                <Button variant="outline" size="sm" onClick={handleRefreshStats}>
                  Yenidən cəhd et
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRegions.map((region) => {
          const stats = regionStats[region.id];
          const isLoadingRegionStats = isStatsLoading && !stats;

          return (
            <Card key={region.id} className={!region.is_active ? 'opacity-75' : ''}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <CardTitle className="text-base">{region.name}</CardTitle>
                      <CardDescription>{getRegionDescription(region)}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={region.is_active ? "default" : "secondary"} className="text-xs">
                      {region.is_active ? 'Aktiv' : 'Deaktiv'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => setDetailsRegion(region)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Detallar
                        </DropdownMenuItem>
                        {hasAccess && (
                          <DropdownMenuItem onSelect={() => openEditModal(region)}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Redaktə et
                          </DropdownMenuItem>
                        )}
                        {canDeleteRegions && (
                          <DropdownMenuItem
                            onSelect={() => setDeleteRegion(region)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Sil
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Yaradılıb: {formatDate(region.created_at)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span>Sektorlar:</span>
                    {isLoadingRegionStats ? (
                      <Skeleton className="h-4 w-8" />
                    ) : (
                      <span className="font-medium">{stats?.departments || 0}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Müəssisələr:</span>
                    {isLoadingRegionStats ? (
                      <Skeleton className="h-4 w-8" />
                    ) : (
                      <span className="font-medium">{stats?.institutions || 0}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>İstifadəçilər:</span>
                    {isLoadingRegionStats ? (
                      <Skeleton className="h-4 w-8" />
                    ) : (
                      <span className="font-medium">
                        {stats?.users || 0}
                        {stats?.active_users !== undefined && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({stats.active_users} aktiv)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => setDetailsRegion(region)}
                  disabled={isLoadingRegionStats && !stats}
                >
                  {isLoadingRegionStats && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Detallar
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {showEmptyState && (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center text-center gap-3 py-10">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-lg font-medium">{emptyStateMessage}</p>
              <p className="text-sm text-muted-foreground">{emptyStateDescription}</p>
              <div className="flex flex-wrap gap-2">
                {showResetFilters && (
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    Filtrləri sıfırla
                  </Button>
                )}
                {canCreateRegions && (
                  <Button size="sm" onClick={openCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni region əlavə et
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {canCreateRegions && (
          <Card
            className="border-dashed cursor-pointer hover:border-primary transition-colors"
            role="button"
            tabIndex={0}
            onClick={openCreateModal}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                openCreateModal();
              }
            }}
          >
            <CardContent className="flex flex-col items-center justify-center h-48 text-center gap-2">
              <Plus className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Yeni region əlavə et</p>
              <p className="text-xs text-muted-foreground max-w-[220px]">
                Regional strukturu genişləndirmək üçün sürətli yaradılma forması
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
      {modalContext && (
        <InstitutionModalStandardized
          key={`region-modal-${modalContext.region?.id ?? 'new'}`}
          open={!!modalContext}
          onClose={() => setModalContext(null)}
          institution={modalContext.mode === 'edit' ? modalContext.region : null}
          onSave={handleSaveRegion}
        />
      )}
      {detailsRegion && (
        <InstitutionDetailsModal
          open={!!detailsRegion}
          onClose={() => setDetailsRegion(null)}
          institution={detailsRegion}
        />
      )}
      {deleteRegion && (
        <EnhancedDeleteModal
          open={!!deleteRegion}
          onClose={() => setDeleteRegion(null)}
          institution={deleteRegion}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}
