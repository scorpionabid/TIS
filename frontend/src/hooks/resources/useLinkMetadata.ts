import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Resource } from '@/types/resources';
import { institutionService } from '@/services/institutions';
import type { Institution } from '@/services/institutions';
import { userService } from '@/services/users';

type InstitutionOption = {
  id: number;
  name: string;
  utis_code?: string | null;
  level?: number | null;
  parent_id?: number | null;
};

type InstitutionFilterOption = {
  label: string;
  value: string;
  level?: number | null;
  parent_id?: number | null;
  utis_code?: string | null;
};

type CreatorOption = {
  label: string;
  value: string;
};

const flattenResponseArray = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
};

const normalizeInstitution = (
  input: Institution | { data?: Institution } | null | undefined
): Institution | undefined => {
  if (!input) {
    return undefined;
  }

  if (typeof input === 'object' && 'data' in input) {
    return (input as { data?: Institution }).data ?? undefined;
  }

  return input as Institution;
};

interface UseLinkMetadataOptions {
  linkData: Resource[];
  shouldLoadFilterSources: boolean;
  canLoadCreators: boolean;
  shouldRestrictByInstitution: boolean;
  accessibleInstitutionIds?: number[] | null;
  accessibleInstitutionSet?: Set<number>;
}

interface UseLinkMetadataResult {
  institutionFilterOptions?: InstitutionFilterOption[];
  availableCreators: CreatorOption[];
  institutionMetadata: Record<number, InstitutionOption>;
  institutionDirectory: Record<number, string>;
}

export function useLinkMetadata({
  linkData,
  shouldLoadFilterSources,
  canLoadCreators,
  shouldRestrictByInstitution,
  accessibleInstitutionIds,
  accessibleInstitutionSet,
}: UseLinkMetadataOptions): UseLinkMetadataResult {
  const [institutionDirectory, setInstitutionDirectory] = useState<Record<number, string>>({});
  const [institutionMetadata, setInstitutionMetadata] = useState<Record<number, InstitutionOption>>({});

  const { data: remoteInstitutionOptions } = useQuery({
    queryKey: ['resource-filter-institutions'],
    queryFn: async () => {
      const response = await institutionService.getAll({
        per_page: 200,
        level: 'all',
      });
      return flattenResponseArray(response);
    },
    enabled: shouldLoadFilterSources,
    staleTime: 10 * 60 * 1000,
  });

  const scopedRemoteInstitutionOptions = useMemo(() => {
    if (!remoteInstitutionOptions) {
      return remoteInstitutionOptions;
    }
    if (!shouldRestrictByInstitution) {
      return remoteInstitutionOptions;
    }
    if (!accessibleInstitutionIds) {
      return undefined;
    }
    const allowed = accessibleInstitutionSet ?? new Set<number>();
    return remoteInstitutionOptions.filter((institution: any) => {
      if (!institution?.id) {
        return false;
      }
      return allowed.has(institution.id);
    });
  }, [remoteInstitutionOptions, shouldRestrictByInstitution, accessibleInstitutionIds, accessibleInstitutionSet]);

  const fallbackInstitutionOptions = useMemo(() => {
    const unique = new Map<number, InstitutionOption>();
    linkData.forEach((resource) => {
      if (resource.institution?.id) {
        unique.set(resource.institution.id, {
          id: resource.institution.id,
          name: resource.institution.name,
          utis_code: resource.institution.utis_code,
        });
      }
    });
    Object.values(institutionMetadata).forEach((meta) => {
      if (!meta?.id) return;
      const existing = unique.get(meta.id);
      unique.set(meta.id, {
        id: meta.id,
        name: meta.name || existing?.name || `Müəssisə #${meta.id}`,
        utis_code: meta.utis_code ?? existing?.utis_code,
        level: meta.level ?? existing?.level,
        parent_id: meta.parent_id ?? existing?.parent_id,
      });
    });
    return Array.from(unique.values());
  }, [linkData, institutionMetadata]);

  const availableInstitutions = useMemo(() => {
    const map = new Map<number, InstitutionOption>();
    (scopedRemoteInstitutionOptions ?? []).forEach((institution: InstitutionOption) => {
      if (!institution?.id) return;
      map.set(institution.id, institution);
    });
    Object.values(institutionMetadata).forEach((meta) => {
      if (!meta?.id) return;
      const existing = map.get(meta.id);
      map.set(meta.id, {
        id: meta.id,
        name: meta.name || existing?.name || `Müəssisə #${meta.id}`,
        utis_code: meta.utis_code ?? existing?.utis_code,
        level: meta.level ?? existing?.level,
        parent_id: meta.parent_id ?? existing?.parent_id,
      });
    });
    fallbackInstitutionOptions.forEach((institution) => {
      if (!institution?.id || map.has(institution.id)) return;
      map.set(institution.id, institution);
    });
    return Array.from(map.values());
  }, [scopedRemoteInstitutionOptions, institutionMetadata, fallbackInstitutionOptions]);

  const institutionFilterOptions = useMemo(() => {
    if (!availableInstitutions) {
      return undefined;
    }
    return availableInstitutions.map((institution) => ({
      label: institution.name,
      value: String(institution.id),
      level: institution?.level,
      parent_id: institution?.parent_id,
      utis_code: institution?.utis_code,
    }));
  }, [availableInstitutions]);

  const resourceInstitutionIds = useMemo(() => {
    const ids = new Set<number>();
    linkData.forEach((resource) => {
      const institutionId =
        resource.institution?.id ??
        (resource as { institution_id?: number }).institution_id;
      if (institutionId) {
        ids.add(institutionId);
      }
      (resource.target_institutions || []).forEach((target) => {
        const numericId = typeof target === 'string' ? Number(target) : target;
        if (typeof numericId === 'number' && !Number.isNaN(numericId)) {
          ids.add(numericId);
        }
      });
    });
    return Array.from(ids);
  }, [linkData]);

  useEffect(() => {
    if (!resourceInstitutionIds.length) {
      return;
    }

    let isCancelled = false;

    (async () => {
      const resolvedEntries: Record<number, InstitutionOption> = {};
      const pendingParentIds = new Set<number>();

      const fetchDetails = resourceInstitutionIds.filter((id) => {
        if (!id) return false;
        if (institutionMetadata[id]) return false;
        pendingParentIds.add(institutionMetadata[id]?.parent_id ?? 0);
        return true;
      });

      if (fetchDetails.length > 0) {
        const fetched = await Promise.all(
          fetchDetails.map(async (institutionId) => {
            try {
              const detail = await institutionService.getById(institutionId);
              const normalized = normalizeInstitution(detail);
              if (!normalized) return undefined;
              if (normalized.parent_id) {
                pendingParentIds.add(normalized.parent_id);
              }
              return {
                id: institutionId,
                name: normalized.name || normalized.short_name || `Müəssisə #${institutionId}`,
                utis_code: normalized.utis_code,
                level: normalized.level ?? null,
                parent_id: normalized.parent_id ?? normalized.parent?.id ?? null,
              } as InstitutionOption;
            } catch (error) {
              console.warn('Failed to fetch institution detail', { institutionId, error });
              return {
                id: institutionId,
                name: `Müəssisə #${institutionId}`,
                level: null,
                parent_id: null,
              } as InstitutionOption;
            }
          })
        );

        fetched.filter(Boolean).forEach((detail) => {
          resolvedEntries[(detail as InstitutionOption).id] = detail as InstitutionOption;
        });
      }

      const missingParents = Array.from(pendingParentIds).filter((parentId) => {
        if (!parentId) return false;
        return !resolvedEntries[parentId] && !institutionMetadata[parentId];
      });

      if (missingParents.length > 0) {
        try {
          const parentDetails = await Promise.all(
            missingParents.map(async (parentId) => {
              try {
                const parent = await institutionService.getById(parentId);
                const normalizedParent = normalizeInstitution(parent);
                return {
                  id: parentId,
                  name:
                    normalizedParent?.name ||
                    normalizedParent?.short_name ||
                    `Müəssisə #${parentId}`,
                  utis_code: normalizedParent?.utis_code,
                  level: normalizedParent?.level ?? null,
                  parent_id: normalizedParent?.parent_id ?? normalizedParent?.parent?.id ?? null,
                } as InstitutionOption;
              } catch (error: any) {
                const is404 =
                  error?.response?.status === 404 || error?.status === 404 || error?.isCached;
                if (!is404) {
                  console.warn('Failed to fetch parent institution detail', { parentId, error });
                }
                return {
                  id: parentId,
                  name: `Müəssisə #${parentId}`,
                  level: null,
                  parent_id: null,
                } as InstitutionOption;
              }
            })
          );

          parentDetails.forEach((entry) => {
            if (entry?.id) {
              resolvedEntries[entry.id] = entry;
            }
          });
        } catch (error) {
          console.error('Failed to fetch parent institutions', error);
        }
      }

      if (isCancelled) return;

      setInstitutionDirectory((prev) => {
        const next = { ...prev };
        Object.values(resolvedEntries).forEach((entry) => {
          if (entry?.id && entry?.name && !next[entry.id]) {
            next[entry.id] = entry.name;
          }
        });
        return next;
      });

      setInstitutionMetadata((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.values(resolvedEntries).forEach((entry) => {
          if (!entry?.id) return;
          const existing = next[entry.id];
          if (
            !existing ||
            existing.name !== entry.name ||
            existing.utis_code !== entry.utis_code ||
            existing.level !== entry.level ||
            existing.parent_id !== entry.parent_id
          ) {
            next[entry.id] = {
              id: entry.id,
              name: entry.name,
              utis_code: entry.utis_code ?? existing?.utis_code,
              level: entry.level ?? existing?.level ?? null,
              parent_id: entry.parent_id ?? existing?.parent_id ?? null,
            };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    })();

    return () => {
      isCancelled = true;
    };
  }, [resourceInstitutionIds, institutionMetadata]);

  const { data: remoteCreatorOptions } = useQuery({
    queryKey: ['resource-filter-creators'],
    queryFn: async () => {
      const response = await userService.getUsers({ per_page: 100 });
      return (response?.data || []).map((user) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
      }));
    },
    enabled: shouldLoadFilterSources && canLoadCreators,
    staleTime: 5 * 60 * 1000,
  });

  const fallbackCreatorOptions = useMemo(() => {
    const map = new Map<number, { id: number; label: string }>();
    linkData.forEach((resource) => {
      const creatorId = resource.creator?.id;
      if (!creatorId || map.has(creatorId)) {
        return;
      }
      const label =
        resource.creator?.first_name || resource.creator?.last_name
          ? `${resource.creator?.first_name || ''} ${resource.creator?.last_name || ''}`.trim()
          : resource.creator?.username || `İstifadəçi #${creatorId}`;
      map.set(creatorId, { id: creatorId, label });
    });
    return Array.from(map.values());
  }, [linkData]);

  const availableCreators = useMemo<CreatorOption[]>(() => {
    if (remoteCreatorOptions && remoteCreatorOptions.length > 0) {
      return remoteCreatorOptions.map((creator) => ({
        label: `${creator.first_name} ${creator.last_name}`.trim() || `İstifadəçi #${creator.id}`,
        value: String(creator.id),
      }));
    }
    return fallbackCreatorOptions.map((creator) => ({
      label: creator.label,
      value: String(creator.id),
    }));
  }, [remoteCreatorOptions, fallbackCreatorOptions]);

  return {
    institutionFilterOptions,
    availableCreators,
    institutionMetadata,
    institutionDirectory,
  };
}
