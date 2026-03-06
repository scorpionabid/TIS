import { useMemo } from 'react';
import { Resource } from '@/types/resources';

export type GroupingMode = 'none' | 'sector' | 'title' | 'link_type' | 'date';

interface Institution {
  id: number;
  name: string;
  utis_code?: string | null;
  level?: number;
  parent_id?: number;
}

export interface GroupedResources {
  groupKey: string;
  groupLabel: string;
  resources: Resource[];
  count: number;
  metadata?: {
    institution?: Institution;
    letter?: string;
    linkType?: string;
    date?: string;
  };
}

/**
 * Hook for grouping resources by different criteria
 * Supports: sector, title (alphabet), link_type, date, none
 */
export function useResourceGrouping(
  resources: Resource[],
  institutions: Institution[] = [],
  mode: GroupingMode = 'none'
) {
  // Build institution map for quick lookup
  const institutionMap = useMemo(() => {
    const map = new Map<number, Institution>();
    institutions.forEach(inst => map.set(inst.id, inst));
    return map;
  }, [institutions]);

  // Group resources based on mode
  const groupedResources = useMemo(() => {
    if (!resources || resources.length === 0) {
      return [];
    }

    if (mode === 'none') {
      return [{
        groupKey: 'all',
        groupLabel: 'Hamısı',
        resources,
        count: resources.length
      }];
    }

    if (mode === 'sector') {
      return groupBySector(resources, institutionMap);
    }

    if (mode === 'title') {
      return groupByTitle(resources);
    }

    if (mode === 'link_type') {
      return groupByLinkType(resources);
    }

    if (mode === 'date') {
      return groupByDate(resources);
    }

    return [];
  }, [resources, institutionMap, mode]);

  return {
    groupedResources,
    totalGroups: groupedResources.length,
    totalResources: resources.length
  };
}

/**
 * Group resources by sector (institution hierarchy level 3)
 * FIXED: Check both institution_id and target_institutions array
 */
function groupBySector(
  resources: Resource[],
  institutionMap: Map<number, Institution>
): GroupedResources[] {
  const groups = new Map<number, Set<Resource>>();

  resources.forEach(resource => {
    const sectorIds = new Set<number>();

    // 1. Check creator's institution
    if (resource.institution_id) {
      const institution = institutionMap.get(resource.institution_id);
      const sectorId = findSectorId(institution, institutionMap);
      sectorIds.add(sectorId);
    }

    // 2. Check target institutions (where link is shared)
    if (resource.target_institutions && resource.target_institutions.length > 0) {
      resource.target_institutions.forEach(targetInstId => {
        const institution = institutionMap.get(targetInstId);
        const sectorId = findSectorId(institution, institutionMap);
        sectorIds.add(sectorId);
      });
    }

    // 3. If no sectors found, add to "Ümumi" (ID: 0)
    if (sectorIds.size === 0) {
      sectorIds.add(0);
    }

    // 4. Add resource to all relevant sector groups
    sectorIds.forEach(sectorId => {
      if (!groups.has(sectorId)) {
        groups.set(sectorId, new Set());
      }
      groups.get(sectorId)!.add(resource);
    });
  });

  // Convert to array and sort by sector name
  return Array.from(groups.entries())
    .map(([sectorId, resourceSet]) => {
      const institution = institutionMap.get(sectorId);
      const groupLabel = institution?.name || 'Ümumi';
      const resourcesArray = Array.from(resourceSet);

      // Use UTIS code for groupKey if available, otherwise use ID
      const groupKey = institution?.utis_code
        ? `sector-utis-${institution.utis_code}`
        : `sector-id-${sectorId}`;

      return {
        groupKey,
        groupLabel,
        resources: resourcesArray,
        count: resourcesArray.length,
        metadata: { institution }
      };
    })
    .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel, 'az'));
}

/**
 * Find sector ID (level 3) for an institution
 * - Level 3 (Sector) → return self
 * - Level 4 (School) → return parent (sector)
 * - Level 2 (Regional) → return self (treat as sector)
 * - Other → return 0 (Ümumi)
 */
function findSectorId(
  institution: Institution | undefined,
  institutionMap: Map<number, Institution>
): number {
  if (!institution) return 0;

  // Already a sector
  if (institution.level === 3) {
    return institution.id;
  }

  // School → find parent sector
  if (institution.level === 4 && institution.parent_id) {
    return institution.parent_id;
  }

  // Regional → treat as sector
  if (institution.level === 2) {
    return institution.id;
  }

  // Unknown level
  return 0;
}

/**
 * Group resources by title (Azerbaijani alphabet)
 */
function groupByTitle(resources: Resource[]): GroupedResources[] {
  // Azerbaijani alphabet order
  const azAlphabet = [
    'A', 'B', 'C', 'Ç', 'D', 'E', 'Ə', 'F', 'G', 'Ğ', 'H',
    'X', 'I', 'İ', 'J', 'K', 'Q', 'L', 'M', 'N', 'O', 'Ö',
    'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'
  ];

  const groups = new Map<string, Resource[]>();

  resources.forEach(resource => {
    const title = resource.title || '';
    const firstChar = title.charAt(0).toUpperCase();

    // Check if first char is in Azerbaijani alphabet
    const letter = azAlphabet.includes(firstChar) ? firstChar : '#';

    const existing = groups.get(letter) || [];
    groups.set(letter, [...existing, resource]);
  });

  // Sort within each group by title
  groups.forEach((resources) => {
    resources.sort((a, b) =>
      (a.title || '').localeCompare(b.title || '', 'az')
    );
  });

  // Return in alphabet order
  const orderedLetters = [...azAlphabet, '#'].filter(letter => groups.has(letter));

  return orderedLetters.map(letter => ({
    groupKey: `letter-${letter}`,
    groupLabel: letter,
    resources: groups.get(letter)!,
    count: groups.get(letter)!.length,
    metadata: { letter }
  }));
}

/**
 * Group resources by link type
 */
function groupByLinkType(resources: Resource[]): GroupedResources[] {
  const typeLabels: Record<string, string> = {
    external: 'Xarici Linklər',
    video: 'Video',
    form: 'Formalar',
    document: 'Sənədlər'
  };

  const groups = new Map<string, Resource[]>();

  resources.forEach(resource => {
    const type = resource.link_type || 'external';
    const existing = groups.get(type) || [];
    groups.set(type, [...existing, resource]);
  });

  return Array.from(groups.entries())
    .map(([type, resources]) => ({
      groupKey: `type-${type}`,
      groupLabel: typeLabels[type] || type,
      resources,
      count: resources.length,
      metadata: { linkType: type }
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
}

/**
 * Group resources by creation date (month)
 */
function groupByDate(resources: Resource[]): GroupedResources[] {
  const groups = new Map<string, Resource[]>();

  resources.forEach(resource => {
    const date = new Date(resource.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const existing = groups.get(monthKey) || [];
    groups.set(monthKey, [...existing, resource]);
  });

  return Array.from(groups.entries())
    .map(([dateKey, resources]) => {
      const date = new Date(dateKey + '-01');
      const groupLabel = date.toLocaleDateString('az-AZ', {
        year: 'numeric',
        month: 'long'
      });

      return {
        groupKey: `date-${dateKey}`,
        groupLabel,
        resources,
        count: resources.length,
        metadata: { date: dateKey }
      };
    })
    .sort((a, b) => b.groupKey.localeCompare(a.groupKey)); // Newest first
}
