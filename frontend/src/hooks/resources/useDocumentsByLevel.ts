import { useMemo } from 'react';
import { Resource } from '@/types/resources';
import { GroupedResources } from '@/hooks/useResourceGrouping';

export type DocumentLevelTab = 'region' | 'sektor' | 'school';

export interface DocumentsByLevel {
  region: GroupedResources[];
  sektor: GroupedResources[];
  school: GroupedResources[];
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
 */
export function useDocumentsByLevel(
  documents: Resource[],
  institutionMetadata: Record<number, InstitutionOption> = {}
): DocumentsByLevel {
  return useMemo(() => {
    const regionGroups = new Map<number, { label: string; docs: Resource[] }>();
    const sektorGroups = new Map<number, { label: string; docs: Resource[] }>();
    const schoolGroups = new Map<number, { label: string; docs: Resource[] }>();

    documents.forEach((doc) => {
      // Determine institution level from uploader or document institution
      const uploaderInst = doc.uploader?.institution;
      const docInst = doc.institution;

      // Priority: uploader.institution > document.institution > institutionMetadata
      const instId = uploaderInst?.id ?? docInst?.id;
      const instLevel = uploaderInst?.level ?? docInst?.level
        ?? (instId ? institutionMetadata[instId]?.level : undefined);
      const instName = uploaderInst?.name ?? docInst?.name
        ?? (instId ? institutionMetadata[instId]?.name : undefined)
        ?? `Muessise #${instId}`;

      if (!instId || !instLevel) return;

      let targetMap: typeof regionGroups;
      if (instLevel === 2) targetMap = regionGroups;
      else if (instLevel === 3) targetMap = sektorGroups;
      else if (instLevel === 4) targetMap = schoolGroups;
      else return;

      if (!targetMap.has(instId)) {
        targetMap.set(instId, { label: instName, docs: [] });
      }
      targetMap.get(instId)!.docs.push(doc);
    });

    const toGroupArray = (
      map: typeof regionGroups,
      level: number
    ): GroupedResources[] =>
      Array.from(map.entries())
        .map(([id, { label, docs }]) => ({
          groupKey: `level-${level}-inst-${id}`,
          groupLabel: label,
          resources: docs,
          count: docs.length,
          metadata: {
            institution: {
              id,
              name: label,
              level,
            },
          },
        }))
        .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel, 'az'));

    const region = toGroupArray(regionGroups, 2);
    const sektor = toGroupArray(sektorGroups, 3);
    const school = toGroupArray(schoolGroups, 4);

    return {
      region,
      sektor,
      school,
      tabCounts: {
        region: region.reduce((sum, g) => sum + g.count, 0),
        sektor: sektor.reduce((sum, g) => sum + g.count, 0),
        school: school.reduce((sum, g) => sum + g.count, 0),
      },
    };
  }, [documents, institutionMetadata]);
}
