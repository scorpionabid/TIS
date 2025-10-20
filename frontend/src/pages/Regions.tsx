import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, MapPin, Building, Users, Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import { institutionService } from "@/services/institutions";
import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLES } from "@/constants/roles";

interface Region {
  id: number;
  name: string;
  type: {
    id: number;
    name: string;
    key: string;
  };
  children_count: number;
  is_active: boolean;
  created_at: string;
}

interface RegionStats {
  departments: number;
  institutions: number;
  users: number;
  active_users?: number;
  total_institutions?: number;
}

export default function Regions() {
  const { currentUser } = useAuth();
  const [regionStats, setRegionStats] = useState<Record<number, RegionStats>>({});
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  // Check access permissions
  const hasAccess = currentUser && [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN].includes(currentUser.role);

  // Fetch regions from API with higher per_page to get all institutions - use enabled prop
  const { data: institutionsResponse, isLoading, error } = useQuery({
    queryKey: ['institutions', currentUser?.role, currentUser?.institution?.id],
    queryFn: () => institutionService.getAll({ per_page: 100 }),
    enabled: hasAccess,
  });

  // Filter regions (level 2) from all institutions
  const regions: Region[] = React.useMemo(() => {
    let institutionsData = null;
    if (institutionsResponse?.data?.data) {
      // Laravel pagination structure
      institutionsData = institutionsResponse.data.data;
    } else if (institutionsResponse?.data && Array.isArray(institutionsResponse.data)) {
      // Direct array structure
      institutionsData = institutionsResponse.data;
    } else if (Array.isArray(institutionsResponse)) {
      // Response is direct array
      institutionsData = institutionsResponse;
    } else {
      return [];
    }
    
    if (!institutionsData || !Array.isArray(institutionsData)) {
      return [];
    }
    
    const level2Institutions = institutionsData.filter((institution: any) => institution.level === 2);
    
    return level2Institutions.sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [institutionsResponse]);

  // Load aggregated statistics for all regions when they are available
  useEffect(() => {
    if (!hasAccess || regions.length === 0) return;

    let isCancelled = false;

    const fetchSummaries = async () => {
      setIsStatsLoading(true);
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
  }, [regions, hasAccess]);

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

  const getRegionDescription = (regionName: string): string => {
    if (regionName.includes('Bakı')) return 'Paytaxt regionu';
    if (regionName.includes('Gəncə')) return 'Qərb regionu';
    if (regionName.includes('Şəki')) return 'Şimal-qərb regionu';
    if (regionName.includes('Şamaxı')) return 'Cənub-şərq regionu';
    if (regionName.includes('Quba')) return 'Şimal regionu';
    return 'Regional təhsil idarəsi';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Regionlar</h1>
            <p className="text-muted-foreground">Regional strukturların idarə edilməsi</p>
          </div>
          {currentUser?.role === USER_ROLES.SUPERADMIN && (
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
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Regionlar</h1>
            <p className="text-muted-foreground">Regional strukturların idarə edilməsi</p>
          </div>
          {currentUser?.role === USER_ROLES.SUPERADMIN && (
            <Button className="flex items-center gap-2" disabled>
              <Plus className="h-4 w-4" />
              Yeni Region
            </Button>
          )}
        </div>

        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-destructive">Regionlar yüklənərkən xəta baş verdi</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Regionlar</h1>
          <p className="text-muted-foreground">Regional strukturların idarə edilməsi ({regions.length} region)</p>
        </div>
        {currentUser?.role === 'superadmin' && (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Yeni Region
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {regions.map((region) => {
          const stats = regionStats[region.id];
          const isLoadingRegionStats = isStatsLoading && !stats;

          return (
            <Card key={region.id} className={!region.is_active ? 'opacity-75' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{region.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant={region.is_active ? "default" : "secondary"} className="text-xs">
                      {region.is_active ? 'Aktiv' : 'Deaktiv'}
                    </Badge>
                  </div>
                </div>
                <CardDescription>{getRegionDescription(region.name)}</CardDescription>
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
                  disabled={isStatsLoading && !stats}
                >
                  {isLoadingRegionStats && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Ətraflı
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {currentUser?.role === USER_ROLES.SUPERADMIN && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-48">
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Yeni region əlavə et</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
