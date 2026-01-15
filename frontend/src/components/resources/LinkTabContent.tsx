import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { SimpleLinkList, type StatusTab, type LinkAction } from "@/components/resources/SimpleLinkList";
import LinkSharingOverview from "@/components/resources/LinkSharingOverview";
import { LinkSharingOverview as LinkSharingOverviewType } from "@/services/resources";
import type { Resource } from "@/types/resources";

interface InstitutionMeta {
  id: number;
  name: string;
  utis_code?: string | null;
  level?: number | null;
  parent_id?: number | null;
}

interface LinkTabContentProps {
  error: unknown;
  linkData: Resource[];
  filteredLinkCount: number;
  isRefreshing: boolean;
  isLinkLoading: boolean;
  onResourceAction: (
    resource: Resource,
    action: LinkAction
  ) => Promise<void> | void;
  selectedLink: Resource | null;
  onSelectLink: (link: Resource) => void;
  linkSharingOverview: LinkSharingOverviewType | null | undefined;
  sharingOverviewLoading: boolean;
  onRetrySharingOverview: () => void;
  institutionMetadata: Record<number, InstitutionMeta>;
  onRetryLinks?: () => void;
  restrictedInstitutionIds?: number[] | null;
  statusTab?: StatusTab;
}

export const LinkTabContent: React.FC<LinkTabContentProps> = ({
  error,
  linkData,
  filteredLinkCount,
  isRefreshing,
  isLinkLoading,
  onResourceAction,
  selectedLink,
  onSelectLink,
  linkSharingOverview,
  sharingOverviewLoading,
  onRetrySharingOverview,
  institutionMetadata,
  onRetryLinks,
  restrictedInstitutionIds,
  statusTab = 'active',
}) => {
  return (
    <>
      {error && (
        <Alert variant="destructive">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Linklər yüklənə bilmədi</AlertTitle>
            </div>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : "Link məlumatlarını yükləyərkən gözlənilməz xəta baş verdi."}
            </AlertDescription>
            {onRetryLinks && (
              <div>
                <Button variant="outline" size="sm" onClick={onRetryLinks}>
                  <Loader2 className="mr-2 h-4 w-4" />
                  Yenidən cəhd et
                </Button>
              </div>
            )}
          </div>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{filteredLinkCount} link mövcuddur</span>
          {isRefreshing && (
            <span className="inline-flex items-center gap-1 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              Yenilənir…
            </span>
          )}
        </div>
        <SimpleLinkList
          links={linkData}
          selectedLink={selectedLink}
          onSelect={onSelectLink}
          isLoading={isLinkLoading}
          statusTab={statusTab}
          onAction={onResourceAction}
        />
        <LinkSharingOverview
          selectedLink={selectedLink}
          overview={linkSharingOverview}
          isLoading={sharingOverviewLoading}
          onRetry={onRetrySharingOverview}
          institutionMetadata={institutionMetadata}
          restrictedInstitutionIds={restrictedInstitutionIds}
          onResourceAction={onResourceAction}
        />
      </div>
    </>
  );
};

export default LinkTabContent;
