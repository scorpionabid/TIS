import { useEffect, useState, useMemo, useRef } from "react";
import { institutionService } from "@/services/institutions";
import type {
  InstitutionMeta,
  ProvidedInstitutionMeta,
  SectorWithAccess,
  LinkSharingOverviewWithAccess,
  NotAccessedInstitution,
  DerivedTotals,
} from "./types";
import { normalizeInstitution } from "./types";

interface UseInstitutionMetadataProps {
  overview: LinkSharingOverviewWithAccess | null | undefined;
  providedInstitutionMetadata: Record<number, ProvidedInstitutionMeta>;
  restrictedInstitutionIds?: number[] | null;
  currentUser: {
    roles?: Array<{ name?: string }>;
    institution_id?: number;
  } | null;
}

export const useInstitutionMetadata = ({
  overview,
  providedInstitutionMetadata,
  restrictedInstitutionIds,
  currentUser,
}: UseInstitutionMetadataProps) => {
  const [expandedSectors, setExpandedSectors] = useState<
    Set<number | "ungrouped">
  >(new Set());
  const [institutionMeta, setInstitutionMeta] = useState<
    Record<number, InstitutionMeta>
  >({});
  const institutionMetaRef = useRef<Record<number, InstitutionMeta>>({});
  const failedInstitutionIds = useRef<Set<number>>(new Set());

  const restrictedInstitutionSet = useMemo(() => {
    if (!restrictedInstitutionIds || restrictedInstitutionIds.length === 0) {
      return null;
    }
    return new Set(restrictedInstitutionIds);
  }, [restrictedInstitutionIds]);

  // Ref sync
  useEffect(() => {
    institutionMetaRef.current = institutionMeta;
  }, [institutionMeta]);

  // Merge provided metadata
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

  // Reset expanded sectors on link change
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

  // Async institution metadata fetching
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
      (id) => !baseMeta[id] && !failedInstitutionIds.current.has(id)
    );
    if (missingIds.length === 0) {
      return;
    }

    let isCancelled = false;

    const fetchDetail = async (
      institutionId: number
    ): Promise<InstitutionMeta | null> => {
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
      } catch (error: unknown) {
        const err = error as { response?: { status?: number }; status?: number };
        if (err?.response?.status === 404 || err?.status === 404) {
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

  // Sector normalization + derived totals
  const { sectorsToRender, derivedTotals } = useMemo(() => {
    if (!overview?.sectors) {
      return {
        sectorsToRender: [] as SectorWithAccess[],
        derivedTotals: {
          totalSectors: 0,
          totalSchools: 0,
          accessedCount: 0,
          notAccessedCount: 0,
          accessRate: 0,
        } as DerivedTotals,
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

  // Not accessed institutions filtered by user role
  const notAccessedInstitutions = useMemo((): NotAccessedInstitution[] => {
    const sourceSectors = restrictedInstitutionSet
      ? sectorsToRender
      : sectorsToRender.length > 0
        ? sectorsToRender
        : overview?.sectors || [];

    const allNotAccessed: NotAccessedInstitution[] = [];

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

  return {
    expandedSectors,
    toggleSector,
    institutionMeta,
    sectorsToRender,
    derivedTotals,
    notAccessedInstitutions,
    restrictedInstitutionSet,
    formatDate,
  };
};
