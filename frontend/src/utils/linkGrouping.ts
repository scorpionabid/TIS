/**
 * Link Grouping Utilities
 *
 * Utilities for grouping links by title and filtering grouped links.
 * This helps consolidate multiple links with the same title (e.g., "Məktəb pasportu")
 * into a single expandable row instead of showing 300+ separate rows.
 */

import type { Resource } from '@/types/resources';

/**
 * Grouped link structure representing multiple links with the same title
 */
export interface GroupedLink {
  title: string;
  description: string | null;
  link_type: string;
  share_scope: string;
  links: Resource[];
  total_count: number;
  unique_urls: number;
  latest_created_at: string;
  earliest_created_at: string;

  // Aggregated institution info
  institutions: Array<{
    id: number;
    name: string;
    url: string;
    link_id: number;
    created_at: string;
  }>;
}

/**
 * Filter options for grouped links
 */
export interface LinkGroupFilters {
  title_search?: string;
  description_search?: string;
  link_type?: string;
  share_scope?: string;
  status?: string;
  has_description?: boolean;
  date_from?: string;
  date_to?: string;
}

/**
 * Groups links by their title (case-insensitive)
 *
 * @param links - Array of Resource objects
 * @returns Array of GroupedLink objects sorted by total_count descending
 */
export function groupLinksByTitle(links: Resource[]): GroupedLink[] {
  const groups = new Map<string, GroupedLink>();

  links.forEach(link => {
    const key = link.title.toLowerCase().trim();

    if (!groups.has(key)) {
      groups.set(key, {
        title: link.title,
        description: link.description || null,
        link_type: link.link_type || 'external',
        share_scope: link.share_scope || 'institutional',
        links: [],
        total_count: 0,
        unique_urls: 0,
        latest_created_at: link.created_at || '',
        earliest_created_at: link.created_at || '',
        institutions: []
      });
    }

    const group = groups.get(key)!;
    group.links.push(link);
    group.total_count++;

    // Update description if current one is empty and this link has one
    if (!group.description && link.description) {
      group.description = link.description;
    }

    // Update dates
    if (link.created_at) {
      if (link.created_at > group.latest_created_at) {
        group.latest_created_at = link.created_at;
      }
      if (!group.earliest_created_at || link.created_at < group.earliest_created_at) {
        group.earliest_created_at = link.created_at;
      }
    }

    // Add institution info
    if (link.institution) {
      group.institutions.push({
        id: link.institution.id,
        name: link.institution.name,
        url: link.url || '',
        link_id: link.id,
        created_at: link.created_at || ''
      });
    } else if (link.url) {
      // If no institution but has URL, still track it
      group.institutions.push({
        id: 0,
        name: 'Bilinməyən',
        url: link.url,
        link_id: link.id,
        created_at: link.created_at || ''
      });
    }
  });

  // Calculate unique URLs and sort institutions
  groups.forEach(group => {
    const uniqueUrls = new Set(group.links.map(l => l.url).filter(Boolean));
    group.unique_urls = uniqueUrls.size;

    // Sort institutions by name
    group.institutions.sort((a, b) => a.name.localeCompare(b.name, 'az'));
  });

  // Sort by total_count descending, then by title
  return Array.from(groups.values())
    .sort((a, b) => {
      if (b.total_count !== a.total_count) {
        return b.total_count - a.total_count;
      }
      return a.title.localeCompare(b.title, 'az');
    });
}

/**
 * Filters grouped links based on filter criteria
 *
 * @param groups - Array of GroupedLink objects
 * @param filters - Filter criteria
 * @returns Filtered array of GroupedLink objects
 */
export function filterGroupedLinks(
  groups: GroupedLink[],
  filters: LinkGroupFilters
): GroupedLink[] {
  return groups.filter(group => {
    // Title search
    if (filters.title_search) {
      const search = filters.title_search.toLowerCase().trim();
      if (!group.title.toLowerCase().includes(search)) {
        return false;
      }
    }

    // Description search
    if (filters.description_search) {
      const search = filters.description_search.toLowerCase().trim();
      if (!group.description?.toLowerCase().includes(search)) {
        return false;
      }
    }

    // Link type filter
    if (filters.link_type && filters.link_type !== 'all') {
      if (group.link_type !== filters.link_type) {
        return false;
      }
    }

    // Share scope filter
    if (filters.share_scope && filters.share_scope !== 'all') {
      if (group.share_scope !== filters.share_scope) {
        return false;
      }
    }

    if (filters.status && filters.status !== 'all') {
      const hasStatus = group.links.some((link) => (link.status || 'active') === filters.status);
      if (!hasStatus) {
        return false;
      }
    }

    // Has description filter
    if (filters.has_description !== undefined) {
      const hasDesc = Boolean(group.description && group.description.trim());
      if (filters.has_description !== hasDesc) {
        return false;
      }
    }

    // Date range filter
    if (filters.date_from) {
      if (group.latest_created_at < filters.date_from) {
        return false;
      }
    }

    if (filters.date_to) {
      if (group.earliest_created_at > filters.date_to) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get statistics about grouped links
 */
export function getGroupedLinksStats(groups: GroupedLink[]) {
  const totalLinks = groups.reduce((sum, g) => sum + g.total_count, 0);
  const totalGroups = groups.length;
  const withDescription = groups.filter(g => g.description).length;
  const withoutDescription = totalGroups - withDescription;

  const byType: Record<string, number> = {};
  const byScope: Record<string, number> = {};

  groups.forEach(group => {
    byType[group.link_type] = (byType[group.link_type] || 0) + group.total_count;
    byScope[group.share_scope] = (byScope[group.share_scope] || 0) + group.total_count;
  });

  return {
    totalLinks,
    totalGroups,
    withDescription,
    withoutDescription,
    byType,
    byScope
  };
}

/**
 * Format date for display
 */
export function formatLinkDate(dateString: string): string {
  if (!dateString) return '—';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return dateString;
  }
}

/**
 * Get link type display label
 */
export function getLinkTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    external: 'Xarici link',
    video: 'Video',
    form: 'Forma',
    document: 'Sənəd'
  };
  return labels[type] || type;
}

/**
 * Get share scope display label
 */
export function getShareScopeLabel(scope: string): string {
  const labels: Record<string, string> = {
    public: 'Açıq',
    regional: 'Regional',
    sectoral: 'Sektoral',
    institutional: 'İnstitusional',
    specific_users: 'Xüsusi istifadəçilər'
  };
  return labels[scope] || scope;
}

/**
 * Get badge color class for link type
 */
export function getLinkTypeBadgeClass(type: string): string {
  const classes: Record<string, string> = {
    external: 'bg-blue-100 text-blue-800 border-blue-200',
    video: 'bg-red-100 text-red-800 border-red-200',
    form: 'bg-green-100 text-green-800 border-green-200',
    document: 'bg-purple-100 text-purple-800 border-purple-200'
  };
  return classes[type] || 'bg-gray-100 text-gray-800 border-gray-200';
}

/**
 * Get badge color class for share scope
 */
export function getShareScopeBadgeClass(scope: string): string {
  const classes: Record<string, string> = {
    public: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    regional: 'bg-blue-100 text-blue-800 border-blue-200',
    sectoral: 'bg-amber-100 text-amber-800 border-amber-200',
    institutional: 'bg-violet-100 text-violet-800 border-violet-200',
    specific_users: 'bg-pink-100 text-pink-800 border-pink-200'
  };
  return classes[scope] || 'bg-gray-100 text-gray-800 border-gray-200';
}
