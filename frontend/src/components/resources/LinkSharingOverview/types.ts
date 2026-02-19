import type { Resource } from "@/types/resources";
import type { LinkSharingOverview } from "@/services/resources";
import type { Institution } from "@/services/institutions";

export interface SchoolWithAccess {
  id: number;
  name: string;
  utis_code?: string;
  institution_code?: string;
  has_accessed: boolean;
  access_count: number;
  last_accessed_at: string | null;
  first_accessed_at: string | null;
  link_url?: string | null;
}

export interface SectorWithAccess {
  id: number | null;
  name: string;
  region_id?: number;
  region_name?: string | null;
  is_full_coverage: boolean;
  school_count: number;
  schools: SchoolWithAccess[];
}

export interface LinkSharingOverviewWithAccess
  extends Omit<LinkSharingOverview, "sectors"> {
  sectors: SectorWithAccess[];
  accessed_count?: number;
  not_accessed_count?: number;
  access_rate?: number;
}

export interface ProvidedInstitutionMeta {
  id: number;
  name: string;
  utis_code?: string | null;
  level?: number | null;
  parent_id?: number | null;
}

export interface LinkSharingOverviewProps {
  selectedLink: Resource | null;
  overview: LinkSharingOverviewWithAccess | null | undefined;
  isLoading: boolean;
  onRetry?: () => void;
  institutionMetadata?: Record<number, ProvidedInstitutionMeta>;
  restrictedInstitutionIds?: number[] | null;
  onResourceAction?: (resource: Resource, action: "edit" | "delete") => void;
}

export type InstitutionMeta = {
  id: number;
  name: string;
  utis_code?: string | null;
  parent_id?: number | null;
  level?: number | null;
};

export interface NotAccessedInstitution {
  id: number;
  name: string;
  sector_id: number | null;
  sector_name: string;
}

export interface DerivedTotals {
  totalSectors: number;
  totalSchools: number;
  accessedCount: number;
  notAccessedCount: number;
  accessRate: number;
}

export const normalizeInstitution = (
  input: Institution | { data?: Institution } | null | undefined
): Institution | null => {
  if (!input) return null;
  if (typeof input === "object" && "data" in input) {
    return input.data ? (input.data as Institution) : null;
  }
  return input as Institution;
};
