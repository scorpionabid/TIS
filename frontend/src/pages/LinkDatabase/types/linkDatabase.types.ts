/**
 * LinkDatabase module types
 */

export interface LinkDatabaseFiltersState {
  departmentId: string;
  search: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  linkType: string;
  status: string;
  isFeatured?: boolean;
}

export interface LinkStats {
  total: number;
  active: number;
  expired: number;
  featured: number;
}

export interface LinkItem {
  id: number;
  title: string;
  url: string;
  status: string;
  is_featured: boolean;
  link_type?: string;
  description?: string;
  expires_at?: string;
}
