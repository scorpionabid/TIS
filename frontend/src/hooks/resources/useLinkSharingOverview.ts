import { useQuery } from '@tanstack/react-query';
import { resourceService, LinkSharingOverview } from '@/services/resources';
import type { Resource } from '@/types/resources';

export function useLinkSharingOverview(selectedLink: Resource | null, enabled: boolean) {
  return useQuery({
    queryKey: ['link-sharing-overview', selectedLink?.id],
    queryFn: () => selectedLink ? resourceService.getLinkSharingOverview(selectedLink.id) : null,
    enabled: Boolean(selectedLink && enabled),
    staleTime: 2 * 60 * 1000,
  });
}
