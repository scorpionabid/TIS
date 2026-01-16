import React, { useEffect, useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ExternalLink,
  Edit,
  Users,
  Link as LinkIcon,
} from "lucide-react";
import type { Resource } from "@/types/resources";
import type { LinkSharingOverview } from "@/services/resources";
import { useAuth } from "@/contexts/AuthContext";
import { institutionService } from "@/services/institutions";
import type { Institution } from "@/services/institutions";

interface SchoolWithAccess {
  id: number;
  name: string;
  utis_code?: string;
  institution_code?: string;
  has_accessed: boolean;
  access_count: number;
  last_accessed_at: string | null;
  first_accessed_at: string | null;
  link_url?: string | null; // School-specific link URL
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

interface LinkSharingOverviewWithAccess
  extends Omit<LinkSharingOverview, "sectors"> {
  sectors: SectorWithAccess[];
  accessed_count?: number;
  not_accessed_count?: number;
  access_rate?: number;
}

interface ProvidedInstitutionMeta {
  id: number;
  name: string;
  utis_code?: string | null;
  level?: number | null;
  parent_id?: number | null;
}

interface LinkSharingOverviewProps {
  selectedLink: Resource | null;
  overview: LinkSharingOverviewWithAccess | null | undefined;
  isLoading: boolean;
  onRetry?: () => void;
  institutionMetadata?: Record<number, ProvidedInstitutionMeta>;
  restrictedInstitutionIds?: number[] | null;
  onResourceAction?: (resource: Resource, action: "edit" | "delete") => void;
}

type InstitutionMeta = {
  id: number;
  name: string;
  utis_code?: string | null;
  parent_id?: number | null;
  level?: number | null;
};

const normalizeInstitution = (
  input: Institution | { data?: Institution } | null | undefined
): Institution | null => {
  if (!input) return null;
  if (typeof input === "object" && "data" in input) {
    return input.data ? (input.data as Institution) : null;
  }
  return input as Institution;
};

const LinkSharingOverviewCard: React.FC<LinkSharingOverviewProps> = ({
  selectedLink,
  overview,
  isLoading,
  onRetry,
  institutionMetadata: providedInstitutionMetadata = {},
  restrictedInstitutionIds,
  onResourceAction,
}) => {
  const { currentUser } = useAuth();
  const [expandedSectors, setExpandedSectors] = useState<
    Set<number | "ungrouped">
  >(new Set());
  const [institutionMeta, setInstitutionMeta] = useState<
    Record<number, InstitutionMeta>
  >({});
  const institutionMetaRef = useRef<Record<number, InstitutionMeta>>({});
  const failedInstitutionIds = useRef<Set<number>>(new Set()); // Cache for 404 institution IDs to prevent infinite loops
  const restrictedInstitutionSet = useMemo(() => {
    if (!restrictedInstitutionIds || restrictedInstitutionIds.length === 0) {
      return null;
    }
    return new Set(restrictedInstitutionIds);
  }, [restrictedInstitutionIds]);

  useEffect(() => {
    institutionMetaRef.current = institutionMeta;
  }, [institutionMeta]);

  useEffect(() => {
    if (!providedInstitutionMetadata) return;
    setInstitutionMeta((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.values(providedInstitutionMetadata).forEach((meta) => {
        if (!meta?.id) return;
        const normalized: InstitutionMeta = {
          id: meta.id,
          name: meta.name,
          utis_code: meta.utis_code,
          level: meta.level ?? null,
          parent_id: meta.parent_id ?? null,
        };
        const existing = next[meta.id];
        if (
          !existing ||
          existing.name !== normalized.name ||
          existing.level !== normalized.level ||
          existing.parent_id !== normalized.parent_id ||
          existing.utis_code !== normalized.utis_code
        ) {
          next[meta.id] = normalized;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [providedInstitutionMetadata]);

  useEffect(() => {
    setExpandedSectors(new Set());
  }, [overview?.link_id]);

  const toggleSector = (sectorId: number | "ungrouped") => {
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

  useEffect(() => {
    if (!overview?.sectors || overview.sectors.length === 0) {
      return;
    }

    const ids = new Set<number>();
    overview.sectors.forEach((sector) => {
      if (typeof sector.id === "number") {
        ids.add(sector.id);
      }
      sector.schools.forEach((school) => {
        if (typeof school.id === "number") {
          ids.add(school.id);
        }
      });
    });

    if (ids.size === 0) {
      return;
    }

    const baseMeta: Record<number, InstitutionMeta> = {
      ...institutionMetaRef.current,
    };
    Object.values(providedInstitutionMetadata || {}).forEach((meta) => {
      if (!meta?.id) return;
      baseMeta[meta.id] = baseMeta[meta.id] || {
        id: meta.id,
        name: meta.name,
        utis_code: meta.utis_code,
        level: meta.level ?? null,
        parent_id: meta.parent_id ?? null,
      };
    });

    const missingIds = Array.from(ids).filter(
      (id) => !baseMeta[id] && !failedInstitutionIds.current.has(id) // Skip already failed IDs
    );
    if (missingIds.length === 0) {
      return;
    }

    let isCancelled = false;

    const fetchDetail = async (
      institutionId: number
    ): Promise<InstitutionMeta | null> => {
      // Skip if this institution ID has already failed (404) - prevent infinite retry loops
      if (failedInstitutionIds.current.has(institutionId)) {
        return {
          id: institutionId,
          name: `Müəssisə #${institutionId}`,
          level: null,
          parent_id: null,
        };
      }

      try {
        const detail = await institutionService.getById(institutionId);
        const normalized = normalizeInstitution(detail);
        if (!normalized) return null;
        return {
          id: institutionId,
          name:
            normalized.name ||
            normalized.short_name ||
            `Müəssisə #${institutionId}`,
          utis_code: normalized.utis_code,
          level: normalized.level ?? null,
          parent_id: normalized.parent_id ?? normalized.parent?.id ?? null,
        };
      } catch (error: any) {
        // Cache 404 errors to prevent retry loops
        if (error?.response?.status === 404 || error?.status === 404) {
          failedInstitutionIds.current.add(institutionId);
          console.warn(
            "Institution not found (404) - caching to prevent retries:",
            institutionId
          );
        } else {
          console.warn(
            "Failed to fetch institution detail for LinkSharingOverview",
            { institutionId, error }
          );
        }
        return {
          id: institutionId,
          name: `Müəssisə #${institutionId}`,
          level: null,
          parent_id: null,
        };
      }
    };

    (async () => {
      let summariesFailed = false;
      const entries: Record<number, InstitutionMeta> = {};

      try {
        const summaries = await institutionService.getSummaries(missingIds);
        Object.entries(summaries || {}).forEach(([key, summary]) => {
          const numericId = Number(key);
          if (Number.isNaN(numericId)) return;
          entries[numericId] = {
            id: numericId,
            name:
              summary?.name || summary?.short_name || `Müəssisə #${numericId}`,
            utis_code: summary?.utis_code,
            level: summary?.level ?? null,
            parent_id: summary?.parent_id ?? summary?.parentId ?? null,
          };
        });

        const detailFetchIds = Object.values(entries)
          .filter(
            (entry) => entry.level === null || entry.parent_id === undefined
          )
          .map((entry) => entry.id);

        if (detailFetchIds.length > 0) {
          const detailedEntries = await Promise.all(
            detailFetchIds.map(fetchDetail)
          );
          detailedEntries.forEach((detail) => {
            if (!detail) return;
            entries[detail.id] = { ...entries[detail.id], ...detail };
          });
        }

        const pendingParents = new Set<number>();
        Object.values(entries).forEach((entry) => {
          if (
            entry.parent_id &&
            !entries[entry.parent_id] &&
            !failedInstitutionIds.current.has(entry.parent_id)
          ) {
            pendingParents.add(entry.parent_id);
          }
        });

        if (pendingParents.size > 0) {
          const parentDetails = await Promise.all(
            Array.from(pendingParents).map(fetchDetail)
          );
          parentDetails.forEach((detail) => {
            if (!detail) return;
            entries[detail.id] = detail;
          });
        }
      } catch (error) {
        console.error(
          "Failed to load institution metadata for link sharing overview",
          error
        );
        summariesFailed = true;
      }

      if (summariesFailed) {
        const detailedEntries = await Promise.all(missingIds.map(fetchDetail));
        detailedEntries.forEach((entry) => {
          if (!entry) return;
          entries[entry.id] = entry;
        });
      }

      if (!isCancelled) {
        setInstitutionMeta((prev) => {
          const next = { ...prev };
          let changed = false;
          Object.values(entries).forEach((entry) => {
            if (!entry) return;
            const existing = next[entry.id];
            if (
              !existing ||
              existing.name !== entry.name ||
              existing.level !== entry.level ||
              existing.parent_id !== entry.parent_id ||
              existing.utis_code !== entry.utis_code
            ) {
              next[entry.id] = entry;
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [overview?.link_id, overview?.sectors, providedInstitutionMetadata]);

  const { sectorsToRender, derivedTotals } = useMemo(() => {
    if (!overview?.sectors) {
      return {
        sectorsToRender: [],
        derivedTotals: {
          totalSectors: 0,
          totalSchools: 0,
          accessedCount: 0,
          notAccessedCount: 0,
          accessRate: 0,
        },
      };
    }

    type NormalizedSector = SectorWithAccess;
    const sectorMap = new Map<number | "ungrouped", NormalizedSector>();

    overview.sectors.forEach((sector) => {
      const fallbackSectorId = sector.id ?? null;
      sector.schools.forEach((school) => {
        const schoolMeta = school.id ? institutionMeta[school.id] : undefined;
        const actualSectorId = schoolMeta?.parent_id ?? fallbackSectorId;
        const key = actualSectorId ?? "ungrouped";
        const numericSchoolId =
          typeof school.id === "number" ? school.id : Number(school.id);
        const sectorAllowed =
          !restrictedInstitutionSet ||
          (typeof actualSectorId === "number" &&
            restrictedInstitutionSet.has(actualSectorId));
        const schoolAllowed =
          !restrictedInstitutionSet ||
          (typeof numericSchoolId === "number" &&
            !Number.isNaN(numericSchoolId) &&
            restrictedInstitutionSet.has(numericSchoolId));

        if (restrictedInstitutionSet && !sectorAllowed && !schoolAllowed) {
          return;
        }

        let targetSector = sectorMap.get(key);
        if (!targetSector) {
          const sectorMeta =
            typeof actualSectorId === "number"
              ? institutionMeta[actualSectorId]
              : undefined;
          const regionMeta = sectorMeta?.parent_id
            ? institutionMeta[sectorMeta.parent_id]
            : undefined;
          targetSector = {
            id: typeof actualSectorId === "number" ? actualSectorId : null,
            name:
              sectorMeta?.name ||
              (typeof actualSectorId === "number"
                ? sector.name
                : "Sektor müəyyən edilməyib"),
            region_id: regionMeta?.id ?? sector.region_id ?? null,
            region_name: regionMeta?.name || sector.region_name || null,
            is_full_coverage: sector.is_full_coverage,
            school_count: 0,
            schools: [],
          };
          sectorMap.set(key, targetSector);
        }

        targetSector.schools.push(school);
        targetSector.school_count = targetSector.schools.length;
      });
    });

    const normalized = Array.from(sectorMap.values())
      .filter((sector) => sector.school_count > 0)
      .sort((a, b) => {
        const regionComparison = (a.region_name || "").localeCompare(
          b.region_name || "",
          "az"
        );
        if (regionComparison !== 0) {
          return regionComparison;
        }
        return (a.name || "").localeCompare(b.name || "", "az");
      });

    const totalSchools = normalized.reduce(
      (sum, sector) => sum + sector.school_count,
      0
    );
    const accessedCount = normalized.reduce(
      (sum, sector) =>
        sum + sector.schools.filter((school) => school.has_accessed).length,
      0
    );
    const notAccessedCount = totalSchools - accessedCount;
    const accessRate =
      totalSchools > 0
        ? Number(((accessedCount / totalSchools) * 100).toFixed(1))
        : 0;

    return {
      sectorsToRender: normalized,
      derivedTotals: {
        totalSectors: normalized.length,
        totalSchools,
        accessedCount,
        notAccessedCount,
        accessRate,
      },
    };
  }, [overview?.sectors, institutionMeta, restrictedInstitutionSet]);

  // Get not accessed institutions filtered by user role
  const notAccessedInstitutions = useMemo(() => {
    const sourceSectors = restrictedInstitutionSet
      ? sectorsToRender
      : sectorsToRender.length > 0
      ? sectorsToRender
      : overview?.sectors || [];

    const allNotAccessed: Array<{
      id: number;
      name: string;
      sector_id: number | null;
      sector_name: string;
    }> = [];

    sourceSectors.forEach((sector) => {
      sector.schools.forEach((school) => {
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

    if (restrictedInstitutionSet) {
      return allNotAccessed.filter((inst) => {
        if (restrictedInstitutionSet.has(inst.id)) {
          return true;
        }
        if (inst.sector_id && restrictedInstitutionSet.has(inst.sector_id)) {
          return true;
        }
        return false;
      });
    }

    const userRole = currentUser?.roles?.[0]?.name?.toLowerCase();
    const userInstitutionId = currentUser?.institution_id;

    if (userRole === "sektoradmin" && userInstitutionId) {
      return allNotAccessed.filter(
        (inst) => inst.sector_id === userInstitutionId
      );
    }

    return allNotAccessed;
  }, [
    sectorsToRender,
    overview?.sectors,
    currentUser,
    restrictedInstitutionSet,
  ]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("az-AZ", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
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
            <AlertDescription>
              Məlumatı əldə etmək mümkün olmadı.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const hasUserTargets = (overview.target_users?.length ?? 0) > 0;
  const hasSectors = (overview.sectors?.length ?? 0) > 0;

  // Determine default tab based on what's available
  // If only users are targeted (no institutions), show users tab by default
  const defaultTab = hasUserTargets && !hasSectors ? 'users' : 'institutions';
  const preferDerived = Boolean(
    restrictedInstitutionSet || sectorsToRender.length > 0
  );
  const totalSectors = preferDerived
    ? derivedTotals.totalSectors
    : derivedTotals.totalSectors || overview.total_sectors || 0;
  const totalSchools = preferDerived
    ? derivedTotals.totalSchools
    : derivedTotals.totalSchools || overview.total_schools || 0;
  const accessedCount = preferDerived
    ? derivedTotals.accessedCount
    : derivedTotals.accessedCount ?? overview.accessed_count;
  const notAccessedCount = preferDerived
    ? derivedTotals.notAccessedCount
    : derivedTotals.notAccessedCount ?? overview.not_accessed_count;
  const accessRate = preferDerived
    ? derivedTotals.accessRate
    : derivedTotals.accessRate || overview.access_rate || 0;
  const sectorsForDisplay = restrictedInstitutionSet
    ? sectorsToRender
    : sectorsToRender.length > 0
    ? sectorsToRender
    : overview.sectors || [];

  if (!hasSectors && !hasUserTargets) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Paylaşım məlumatları</CardTitle>
            <p className="text-sm text-muted-foreground">
              {overview.link_title}
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
            <AlertCircle className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">Heç bir hədəf seçilməyib.</p>
            <p className="text-xs mt-1">Bu link nə müəssisə, nə də istifadəçi ilə paylaşılmayıb.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              {overview.link_title}
            </CardTitle>
            {/* Link URL */}
            {selectedLink?.url && (
              <a
                href={selectedLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate"
              >
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{selectedLink.url}</span>
              </a>
            )}
            {/* Share scope badge */}
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className={
                  overview.share_scope === 'specific_users'
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }
              >
                {overview.share_scope === 'specific_users' ? (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Xüsusi istifadəçilər
                  </span>
                ) : overview.share_scope === 'institutional' ? (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Müəssisələr
                  </span>
                ) : (
                  overview.share_scope || 'Paylaşım növü'
                )}
              </Badge>
              {selectedLink?.is_featured && (
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                  ⭐ Seçilmiş
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/*
           * ═══════════════════════════════════════════════════════════════════════════
           * TABS: Müəssisələr və İstifadəçilər ayrı tab-larda göstərilir
           * ═══════════════════════════════════════════════════════════════════════════
           */}
          <Tabs defaultValue={defaultTab} key={overview.link_id} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="institutions" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Müəssisələr
                {totalSchools > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {totalSchools}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                İstifadəçilər
                {hasUserTargets && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {overview.target_users?.length || 0}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ═══════════════ INSTITUTIONS TAB ═══════════════ */}
            <TabsContent value="institutions" className="space-y-4 mt-0">
              {/* Statistics Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                  {totalSectors} sektor
                </Badge>
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  {totalSchools} məktəb
                </Badge>
                {accessedCount !== undefined && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-50 text-emerald-700"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {accessedCount} açılıb
                  </Badge>
                )}
                {notAccessedCount !== undefined && notAccessedCount > 0 && (
                  <Badge variant="secondary" className="bg-red-50 text-red-700">
                    <XCircle className="h-3 w-3 mr-1" />
                    {notAccessedCount} açılmayıb
                  </Badge>
                )}
              </div>

              {/* Access Progress Bar */}
              {accessRate !== undefined && totalSchools > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Açılma faizi</span>
                    <span className="font-medium">{accessRate}%</span>
                  </div>
                  <Progress value={accessRate} className="h-2" />
                </div>
              )}

              {/* Sectors List */}
              {!hasSectors ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Building2 className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">
                    {hasUserTargets
                      ? 'Bu link müəssisələrlə deyil, xüsusi istifadəçilərlə paylaşılıb.'
                      : 'Heç bir müəssisə ilə paylaşılmayıb.'}
                  </p>
                  {hasUserTargets && (
                    <p className="text-xs mt-2 text-violet-600">
                      İstifadəçilər tabına keçin
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
            {sectorsForDisplay.map((sector) => {
              const sectorKey = sector.id ?? "ungrouped";
              const isExpanded = expandedSectors.has(sectorKey);

              // Calculate sector access stats
              const sectorAccessedCount = sector.schools.filter(
                (s) => s.has_accessed
              ).length;
              const sectorNotAccessedCount =
                sector.schools.length - sectorAccessedCount;

              return (
                <div
                  key={sectorKey}
                  className="border rounded-lg overflow-hidden"
                >
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
                        <span className="font-semibold">
                          {sector.name || "Sektor müəyyən edilməyib"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        {sector.region_name && (
                          <span>Region: {sector.region_name}</span>
                        )}
                        <span>
                          Status:{" "}
                          {sector.is_full_coverage
                            ? "Bütün məktəblər"
                            : "Seçilmiş məktəblər"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sectorAccessedCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          {sectorAccessedCount} ✓
                        </Badge>
                      )}
                      {sectorNotAccessedCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-red-50 text-red-700 border-red-200"
                        >
                          {sectorNotAccessedCount} ✗
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary"
                      >
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
                                <th className="pb-2 font-medium">
                                  Linkə keçid
                                </th>
                                {onResourceAction && selectedLink && (
                                  <th className="pb-2 font-medium text-right">
                                    Düzəliş
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {sector.schools.map((school) => (
                                <tr
                                  key={school.id}
                                  className="border-t text-sm"
                                >
                                  <td className="py-2 flex items-center gap-2">
                                    <School className="h-3.5 w-3.5 text-muted-foreground" />
                                    {school.name}
                                  </td>
                                  <td className="py-2">
                                    {overview.link_title}
                                  </td>
                                  <td className="py-2">
                                    {school.link_url || selectedLink?.url ? (
                                      <div className="flex items-center gap-1">
                                        <a
                                          href={
                                            school.link_url || selectedLink.url
                                          }
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`inline-flex items-center gap-1 hover:underline ${
                                            school.has_accessed
                                              ? "text-green-600 hover:text-green-700"
                                              : "text-red-600 hover:text-red-700"
                                          }`}
                                        >
                                          {school.has_accessed ? (
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                          ) : (
                                            <XCircle className="h-3.5 w-3.5" />
                                          )}
                                          {school.has_accessed
                                            ? "Açılıb"
                                            : "Açılmayıb"}
                                          <ExternalLink className="h-3 w-3 ml-0.5" />
                                        </a>
                                        {school.has_accessed &&
                                          school.access_count > 0 && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <button
                                                  type="button"
                                                  className="ml-1"
                                                >
                                                  <Info className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                </button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <div className="text-xs space-y-1">
                                                  <p>
                                                    <strong>
                                                      {school.access_count}
                                                    </strong>{" "}
                                                    dəfə açılıb
                                                  </p>
                                                  {school.first_accessed_at && (
                                                    <p>
                                                      İlk:{" "}
                                                      {formatDate(
                                                        school.first_accessed_at
                                                      )}
                                                    </p>
                                                  )}
                                                  {school.last_accessed_at && (
                                                    <p>
                                                      Son:{" "}
                                                      {formatDate(
                                                        school.last_accessed_at
                                                      )}
                                                    </p>
                                                  )}
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        URL mövcud deyil
                                      </span>
                                    )}
                                  </td>
                                  {onResourceAction && selectedLink && (
                                    <td className="py-2 text-right">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                              onResourceAction(
                                                selectedLink,
                                                "edit"
                                              )
                                            }
                                            className="h-7 w-7 text-primary hover:text-primary"
                                          >
                                            <Edit className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Düzəliş et
                                        </TooltipContent>
                                      </Tooltip>
                                    </td>
                                  )}
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
                </div>
              )}

              {/* Not Accessed Institutions - inside Institutions Tab */}
              {notAccessedInstitutions.length > 0 && (
                <div className="mt-4 border border-red-200 rounded-lg">
                  <div className="p-3 border-b border-red-200 bg-red-50/30">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Açılmamış müəssisələr ({notAccessedInstitutions.length})
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bu müəssisələr hələ linki açmayıb
                    </p>
                  </div>
                  <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                    {notAccessedInstitutions.map((inst) => (
                      <div
                        key={inst.id}
                        className="flex items-center justify-between p-2 border rounded-lg bg-red-50/50"
                      >
                        <div className="flex items-center gap-2">
                          <School className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{inst.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {inst.sector_name}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-red-600 border-red-200 bg-red-50"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Açılmayıb
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ═══════════════ USERS TAB ═══════════════ */}
            <TabsContent value="users" className="space-y-4 mt-0">
              {!hasUserTargets ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">Heç bir istifadəçi ilə paylaşılmayıb.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Users className="h-4 w-4" />
                    <span>Birbaşa paylaşılan istifadəçilər</span>
                    <Badge variant="secondary">{overview.target_users?.length || 0}</Badge>
                  </div>
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
                            <Badge
                              key={`${user.id}-${role}`}
                              variant="outline"
                              className="text-xs"
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default LinkSharingOverviewCard;
