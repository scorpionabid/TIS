import { useQuery } from '@tanstack/react-query';
import { resourceService, LinkSharingOverview } from '@/services/resources';
import type { Resource } from '@/types/resources';

export function useLinkSharingOverview(
  selectedLink: Resource | null,
  enabled: boolean,
  useGrouped: boolean = false
) {
  return useQuery({
    queryKey: useGrouped
      ? ['link-sharing-overview-grouped', selectedLink?.title]
      : ['link-sharing-overview', selectedLink?.id],
    queryFn: async () => {
      if (!selectedLink) return null;

      if (useGrouped && selectedLink.title) {
        // Use grouped overview for links with same title
        return await resourceService.getGroupedLinkSharingOverview(selectedLink.title);
      } else {
        // Use single link overview
        return await resourceService.getLinkSharingOverview(selectedLink.id);
      }
    },
    enabled: Boolean(selectedLink && enabled),
    staleTime: 2 * 60 * 1000,
  });
}
