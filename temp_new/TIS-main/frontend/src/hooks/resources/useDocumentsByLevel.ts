import { useMemo } from 'react';
import { Resource } from '@/types/resources';
import { GroupedResources } from '@/hooks/useResourceGrouping';

export type DocumentLevelTab = 'region' | 'sektor' | 'school';

/** School groups nested under their parent sector */
export interface SectorWithSchools {
  sectorId: number;
  sectorName: string;
  schools: GroupedResources[];
  totalCount: number;
}

export interface DocumentsByLevel {
  region: GroupedResources[];
  sektor: GroupedResources[];
  school: GroupedResources[];
  /** School groups organized by parent sector (for 2-level hierarchy display) */
  schoolsBySector: SectorWithSchools[];
  tabCounts: { region: number; sektor: number; school: number };
}

interface InstitutionOption {
  id: number;
  name: string;
  level?: number | null;
  parent_id?: number | null;
}

/**
 * Hook for grouping documents by uploader's institution level.
 * - Region (level 2): Documents uploaded by regional office users
 * - Sektor (level 3): Documents uploaded by sector users
 * - School (level 4): Documents uploaded by school users
 *
 * Within each level, documents are grouped by institution name.
 * School tab also provides 2-level grouping: Sector -> Schools
 */
export function useDocumentsByLevel(
  documents: Resource[],
  institutionMetadata: Record<number, InstitutionOption> = {}
): DocumentsByLevel {
  return useMemo(() => {
    const regionGroups = new Map<number, { label: string; docs: Resource[] }>();
    const sektorGroups = new Map<number, { label: string; docs: Resource[] }>();
    const schoolGroups = new Map<number, { label: string; parentId: number | null; docs: Resource[] }>();

    // Track sector names for schoolsBySector grouping
    const sektorNames = new Map<number, string>();

    documents.forEach((doc) => {
      const uploaderInst = doc.uploader?.institution;
      const docInst = doc.institution;

      const instId = uploaderInst?.id ?? docInst?.id;
      const instLevel = uploaderInst?.level ?? docInst?.level
        ?? (instId ? institutionMetadata[instId]?.level : undefined);
      const instName = uploaderInst?.name ?? docInst?.name
        ?? (instId ? institutionMetadata[instId]?.name : undefined)
        ?? `Muessise #${instId}`;
      const parentId = uploaderInst?.parent_id ?? docInst?.parent_id
        ?? (instId ? institutionMetadata[instId]?.parent_id : undefined)
        ?? null;

      if (!instId || !instLevel) return;

      if (instLevel === 2) {
        if (!regionGroups.has(instId)) {
          regionGroups.set(instId, { label: instName, docs: [] });
        }
        regionGroups.get(instId)!.docs.push(doc);
      } else if (instLevel === 3) {
        sektorNames.set(instId, instName);
        if (!sektorGroups.has(instId)) {
          sektorGroups.set(instId, { label: instName, docs: [] });
        }
        sektorGroups.get(instId)!.docs.push(doc);
      } else if (instLevel === 4) {
        if (!schoolGroups.has(instId)) {
          schoolGroups.set(instId, { label: instName, parentId, docs: [] });
        }
        schoolGroups.get(instId)!.docs.push(doc);
        // Also register parent sector name from metadata if available
        if (parentId && !sektorNames.has(parentId)) {
          const parentMeta = institutionMetadata[parentId];
          if (parentMeta?.name) {
            sektorNames.set(parentId, parentMeta.name);
          }
        }
      }
    });

    const toGroupArray = (
      map: Map<number, { label: string; docs: Resource[] }>,
      level: number
    ): GroupedResources[] =>
      Array.from(map.entries())
        .map(([id, { label, docs }]) => ({
          groupKey: `level-${level}-inst-${id}`,
          groupLabel: label,
          resources: docs,
          count: docs.length,
          metadata: {
            institution: { id, name: label, level },
          },
        }))
        .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel, 'az'));

    const region = toGroupArray(regionGroups, 2);
    const sektor = toGroupArray(sektorGroups, 3);

    // Flat school groups
    const school: GroupedResources[] = Array.from(schoolGroups.entries())
      .map(([id, { label, docs }]) => ({
        groupKey: `level-4-inst-${id}`,
        groupLabel: label,
        resources: docs,
        count: docs.length,
        metadata: {
          institution: { id, name: label, level: 4 },
        },
      }))
      .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel, 'az'));

    // Build 2-level hierarchy: Sector -> Schools
    const sectorSchoolMap = new Map<number, GroupedResources[]>();
    const unassignedSchools: GroupedResources[] = [];

    schoolGroups.forEach(({ label, parentId, docs }, instId) => {
      const schoolGroup: GroupedResources = {
        groupKey: `level-4-inst-${instId}`,
        groupLabel: label,
        resources: docs,
        count: docs.length,
        metadata: { institution: { id: instId, name: label, level: 4 } },
      };

      if (parentId) {
        if (!sectorSchoolMap.has(parentId)) {
          sectorSchoolMap.set(parentId, []);
        }
        sectorSchoolMap.get(parentId)!.push(schoolGroup);
      } else {
        unassignedSchools.push(schoolGroup);
      }
    });

    const schoolsBySector: SectorWithSchools[] = Array.from(sectorSchoolMap.entries())
      .map(([sectorId, schools]) => {
        const sortedSchools = schools.sort((a, b) =>
          a.groupLabel.localeCompare(b.groupLabel, 'az')
        );
        return {
          sectorId,
          sectorName: sektorNames.get(sectorId) || `Sektor #${sectorId}`,
          schools: sortedSchools,
          totalCount: sortedSchools.reduce((sum, s) => sum + s.count, 0),
        };
      })
      .sort((a, b) => a.sectorName.localeCompare(b.sectorName, 'az'));

    // Add unassigned schools as "Digər" group
    if (unassignedSchools.length > 0) {
      schoolsBySector.push({
        sectorId: 0,
        sectorName: 'Diger',
        schools: unassignedSchools.sort((a, b) =>
          a.groupLabel.localeCompare(b.groupLabel, 'az')
        ),
        totalCount: unassignedSchools.reduce((sum, s) => sum + s.count, 0),
      });
    }

    return {
      region,
      sektor,
      school,
      schoolsBySector,
      tabCounts: {
        region: region.reduce((sum, g) => sum + g.count, 0),
        sektor: sektor.reduce((sum, g) => sum + g.count, 0),
        school: school.reduce((sum, g) => sum + g.count, 0),
      },
    };
  }, [documents, institutionMetadata]);
}
