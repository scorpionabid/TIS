import type { Resource } from '@/types/resources';
import type { StatusTab } from '../hooks/useLinkState';
import type { LinkAction } from '../hooks/useLinkActions';

export interface LinkStatusTabsProps {
  statusTab: StatusTab;
  setStatusTab: (tab: StatusTab) => void;
}

export interface LinkPageProps {
  error: unknown;
  linkData: Resource[];
  filteredLinkCount: number;
  isRefreshing: boolean;
  isLinkLoading: boolean;
  onResourceAction: (resource: Resource, action: LinkAction) => Promise<void> | void;
  selectedLink: Resource | null;
  onSelectLink: (link: Resource) => void;
  linkSharingOverview: any;
  sharingOverviewLoading: boolean;
  onRetrySharingOverview: () => void;
  institutionMetadata: Record<number, any>;
  onRetryLinks?: () => void;
  restrictedInstitutionIds?: number[] | null;
}
