import type { LinkShare } from '@/services/links';
import type {
  Department,
  SectorOption,
  CreateLinkData,
  PaginatedResponse,
} from '@/services/linkDatabase';

export type ViewMode = 'table' | 'grid';
export type SortField = 'title' | 'created_at' | 'click_count' | 'expires_at';
export type SortDirection = 'asc' | 'desc';
export type LinkType = 'external' | 'video' | 'form' | 'document';
export type LinkStatus = 'active' | 'expired' | 'disabled';

export interface LinkDatabaseFiltersState {
  search: string;
  linkType: LinkType | 'all';
  status: LinkStatus | 'all';
  isFeatured: boolean | null;
  sortBy: SortField;
  sortDirection: SortDirection;
}

export interface LinkDatabaseStats {
  total: number;
  active: number;
  expired: number;
  featured: number;
}

// Re-exports for convenience
export type { LinkShare, Department, SectorOption, CreateLinkData, PaginatedResponse };
