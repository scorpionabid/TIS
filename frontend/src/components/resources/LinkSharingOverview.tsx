import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  School,
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import type { Resource } from '@/types/resources';
import type { LinkSharingOverview } from '@/services/resources';
import { useAuth } from '@/contexts/AuthContext';

interface SchoolWithAccess {
  id: number;
  name: string;
  utis_code?: string;
  institution_code?: string;
  has_accessed: boolean;
  access_count: number;
  last_accessed_at: string | null;
  first_accessed_at: string | null;
}

interface SectorWithAccess {
  id: number | null;
  name: string;
  region_id?: number;
  region_name?: string | null;
  is_full_coverage: boolean;
  school_count: number;
  schools: SchoolWithAccess[];
}

interface LinkSharingOverviewWithAccess extends Omit<LinkSharingOverview, 'sectors'> {
  sectors: SectorWithAccess[];
  accessed_count?: number;
  not_accessed_count?: number;
  access_rate?: number;
}

interface LinkSharingOverviewProps {
  selectedLink: Resource | null;
  overview: LinkSharingOverviewWithAccess | null | undefined;
  isLoading: boolean;
  onRetry?: () => void;
}

const LinkSharingOverviewCard: React.FC<LinkSharingOverviewProps> = ({
  selectedLink,
  overview,
  isLoading,
  onRetry,
}) => {
  const { currentUser } = useAuth();
  const [expandedSectors, setExpandedSectors] = useState<Set<number | 'ungrouped'>>(new Set());

  useEffect(() => {
    setExpandedSectors(new Set());
  }, [overview?.link_id]);

  const toggleSector = (sectorId: number | 'ungrouped') => {
    setExpandedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sectorId)) {
        next.delete(sectorId);
      } else {
        next.add(sectorId);
      }
      return next;
    });
  };

  // Get not accessed institutions filtered by user role
  const notAccessedInstitutions = useMemo(() => {
    if (!overview?.sectors) return [];

    const allNotAccessed: Array<{
      id: number;
      name: string;
      sector_id: number | null;
      sector_name: string;
    }> = [];

    overview.sectors.forEach(sector => {
      sector.schools.forEach(school => {
        if (!school.has_accessed) {
          allNotAccessed.push({
            id: school.id,
            name: school.name,
            sector_id: sector.id,
            sector_name: sector.name,
          });
        }
      });
    });

    // Role-based filtering
    // SektorAdmin only sees their sector's schools
    // RegionAdmin sees all
    const userRole = currentUser?.roles?.[0]?.name?.toLowerCase();
    const userInstitutionId = currentUser?.institution_id;

    if (userRole === 'sektoradmin' && userInstitutionId) {
      return allNotAccessed.filter(inst => inst.sector_id === userInstitutionId);
    }

    return allNotAccessed;
  }, [overview, currentUser]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('az-AZ', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (!selectedLink) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Paylaşılan müəssisələr</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>İlk olaraq link seçin.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Paylaşılan müəssisələr</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Məlumat yüklənir...
        </CardContent>
      </Card>
    );
  }

  if (!overview) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Paylaşılan müəssisələr</CardTitle>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Yenilə
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Məlumatı əldə etmək mümkün olmadı.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const hasUserTargets = (overview.target_users?.length ?? 0) > 0;
  const hasSectors = (overview.sectors?.length ?? 0) > 0;

  if (!hasSectors && !hasUserTargets) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Paylaşılan müəssisələr</CardTitle>
            <p className="text-sm text-muted-foreground">
              Seçilmiş link heç bir müəssisə ilə paylaşılmayıb.
            </p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Yenilə
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Building2 className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">Müəssisə qeyd olunmayıb.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <>
        <Card>
          <CardHeader className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle>Paylaşılan müəssisələr</CardTitle>
              <p className="text-sm text-muted-foreground">
                {overview.link_title} ({overview.share_scope || '—'})
              </p>
            </div>

            {/* Statistics Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                {overview.total_sectors} sektor
              </Badge>
              <Badge variant="secondary" className="bg-green-50 text-green-700">
                {overview.total_schools} məktəb
              </Badge>
              {overview.accessed_count !== undefined && (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {overview.accessed_count} açılıb
                </Badge>
              )}
              {overview.not_accessed_count !== undefined && overview.not_accessed_count > 0 && (
                <Badge variant="secondary" className="bg-red-50 text-red-700">
                  <XCircle className="h-3 w-3 mr-1" />
                  {overview.not_accessed_count} açılmayıb
                </Badge>
              )}
            </div>

            {/* Access Progress Bar */}
            {overview.access_rate !== undefined && overview.total_schools > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Açılma faizi</span>
                  <span className="font-medium">{overview.access_rate}%</span>
                </div>
                <Progress value={overview.access_rate} className="h-2" />
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {overview.sectors.map((sector) => {
              const sectorKey = sector.id ?? 'ungrouped';
              const isExpanded = expandedSectors.has(sectorKey);

              // Calculate sector access stats
              const sectorAccessedCount = sector.schools.filter(s => s.has_accessed).length;
              const sectorNotAccessedCount = sector.schools.length - sectorAccessedCount;

              return (
                <div key={sectorKey} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSector(sectorKey)}
                    className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition"
                  >
                    <div className="flex flex-col gap-1 text-left">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-semibold">{sector.name || 'Sektor müəyyən edilməyib'}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        {sector.region_name && <span>Region: {sector.region_name}</span>}
                        <span>
                          Status: {sector.is_full_coverage ? 'Bütün məktəblər' : 'Seçilmiş məktəblər'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sectorAccessedCount > 0 && (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          {sectorAccessedCount} ✓
                        </Badge>
                      )}
                      {sectorNotAccessedCount > 0 && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          {sectorNotAccessedCount} ✗
                        </Badge>
                      )}
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {sector.school_count} məktəb
                      </Badge>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="p-4">
                      {sector.schools.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Bu sektorda məktəb tapılmadı.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-muted-foreground">
                                <th className="pb-2 font-medium">Məktəb</th>
                                <th className="pb-2 font-medium">Link</th>
                                <th className="pb-2 font-medium">Linkə keçid</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sector.schools.map((school) => (
                                <tr key={school.id} className="border-t text-sm">
                                  <td className="py-2 flex items-center gap-2">
                                    <School className="h-3.5 w-3.5 text-muted-foreground" />
                                    {school.name}
                                  </td>
                                  <td className="py-2">{overview.link_title}</td>
                                  <td className="py-2">
                                    {selectedLink?.url ? (
                                      <div className="flex items-center gap-1">
                                        <a
                                          href={selectedLink.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`inline-flex items-center gap-1 hover:underline ${
                                            school.has_accessed
                                              ? 'text-green-600 hover:text-green-700'
                                              : 'text-red-600 hover:text-red-700'
                                          }`}
                                        >
                                          {school.has_accessed ? (
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                          ) : (
                                            <XCircle className="h-3.5 w-3.5" />
                                          )}
                                          {school.has_accessed ? 'Açılıb' : 'Açılmayıb'}
                                          <ExternalLink className="h-3 w-3 ml-0.5" />
                                        </a>
                                        {school.has_accessed && school.access_count > 0 && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button type="button" className="ml-1">
                                                <Info className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <div className="text-xs space-y-1">
                                                <p><strong>{school.access_count}</strong> dəfə açılıb</p>
                                                {school.first_accessed_at && (
                                                  <p>İlk: {formatDate(school.first_accessed_at)}</p>
                                                )}
                                                {school.last_accessed_at && (
                                                  <p>Son: {formatDate(school.last_accessed_at)}</p>
                                                )}
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">URL mövcud deyil</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Not Accessed Institutions Section */}
        {notAccessedInstitutions.length > 0 && (
          <Card className="mt-4 border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Açılmamış müəssisələr ({notAccessedInstitutions.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Bu müəssisələr hələ linki açmayıb
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {notAccessedInstitutions.map(inst => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between p-2 border rounded-lg bg-red-50/50"
                  >
                    <div className="flex items-center gap-2">
                      <School className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{inst.name}</p>
                        <p className="text-xs text-muted-foreground">{inst.sector_name}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                      <XCircle className="h-3 w-3 mr-1" />
                      Açılmayıb
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Target Users Section */}
        {hasUserTargets && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Birbaşa paylaşılan istifadəçilər</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.target_users?.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.username || user.email || `İstifadəçi #${user.id}`}
                    </p>
                  </div>
                  {user.roles && user.roles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role) => (
                        <Badge key={`${user.id}-${role}`} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </>
    </TooltipProvider>
  );
};

export default LinkSharingOverviewCard;
