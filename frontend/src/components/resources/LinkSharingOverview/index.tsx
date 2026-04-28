import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AlertCircle,
  Loader2,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { LinkSharingOverviewProps } from "./types";
import { useInstitutionMetadata } from "./useInstitutionMetadata";
import { InstitutionsTab } from "./InstitutionsTab";
import { UsersTab } from "./UsersTab";

const LinkSharingOverviewCard: React.FC<LinkSharingOverviewProps> = ({
  selectedLink,
  overview,
  isLoading,
  onRetry,
  institutionMetadata: providedInstitutionMetadata = {},
  restrictedInstitutionIds,
  onResourceAction,
  hideUsersTab = false,
  variant = 'card',
}) => {
  const { currentUser } = useAuth();

  const {
    expandedSectors,
    toggleSector,
    sectorsToRender,
    derivedTotals,
    notAccessedInstitutions,
    restrictedInstitutionSet,
    formatDate,
  } = useInstitutionMetadata({
    overview,
    providedInstitutionMetadata,
    restrictedInstitutionIds,
    currentUser,
  });

  // --- Helper to wrap content based on variant ---
  const ContentWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    if (variant === 'ghost') {
      return <div className={className}>{children}</div>;
    }
    return <Card className={className}>{children}</Card>;
  };

  // --- Early returns ---

  if (!selectedLink) {
    return (
      <ContentWrapper>
        <CardHeader>
          <CardTitle className="text-gray-400">Paylaşılan müəssisələr</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-50 border-blue-100 text-blue-700">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription>İlk olaraq soldakı siyahıdan bir link seçin.</AlertDescription>
          </Alert>
        </CardContent>
      </ContentWrapper>
    );
  }

  if (isLoading) {
    return (
      <ContentWrapper>
        <CardHeader>
          <CardTitle>Yüklənir...</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium animate-pulse">Paylaşım məlumatları əldə edilir...</p>
        </CardContent>
      </ContentWrapper>
    );
  }

  if (!overview) {
    return (
      <ContentWrapper>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Xəta baş verdi</CardTitle>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Yenilə
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Məlumatı əldə etmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.
            </AlertDescription>
          </Alert>
        </CardContent>
      </ContentWrapper>
    );
  }

  const hasUserTargets = (overview.target_users?.length ?? 0) > 0;
  const hasSectors = (overview.sectors?.length ?? 0) > 0;
  const defaultTab = hasUserTargets && !hasSectors ? "users" : "institutions";

  const preferDerived = Boolean(
    restrictedInstitutionSet || sectorsToRender.length > 0
  );
  const totalSectors = preferDerived
    ? derivedTotals.totalSectors
    : derivedTotals.totalSectors || overview.total_sectors || 0;
  const totalSchools = preferDerived
    ? derivedTotals.totalSchools
    : derivedTotals.totalSchools || overview.total_schools || 0;
  const accessedCount = preferDerived
    ? derivedTotals.accessedCount
    : derivedTotals.accessedCount ?? overview.accessed_count;
  const notAccessedCount = preferDerived
    ? derivedTotals.notAccessedCount
    : derivedTotals.notAccessedCount ?? overview.not_accessed_count;
  const accessRate = preferDerived
    ? derivedTotals.accessRate
    : derivedTotals.accessRate || overview.access_rate || 0;
  const sectorsForDisplay = restrictedInstitutionSet
    ? sectorsToRender
    : sectorsToRender.length > 0
      ? sectorsToRender
      : overview.sectors || [];

  if (!hasSectors && !hasUserTargets) {
    return (
      <ContentWrapper>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Paylaşım məlumatları</CardTitle>
            <p className="text-sm text-muted-foreground">
              {overview.link_title}
            </p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Yenilə
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <AlertCircle className="h-10 w-10 text-gray-400" />
            </div>
            <p className="text-base font-bold text-gray-500">Heç bir hədəf seçilməyib</p>
            <p className="text-sm mt-1 max-w-[300px] text-center">
              Bu link nə müəssisə, nə də istifadəçi ilə paylaşılmayıb.
            </p>
          </div>
        </CardContent>
      </ContentWrapper>
    );
  }

  return (
    <TooltipProvider>
      <ContentWrapper className={cn(variant === 'ghost' ? 'border-none shadow-none bg-transparent' : 'border-border/60')}>
        <CardHeader className={cn(
          'pb-4 border-b border-border/60',
          variant === 'ghost' ? 'px-0 pt-0' : 'px-6 pt-6'
        )}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/8 rounded-lg shrink-0 mt-0.5">
              <LinkIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-semibold text-foreground truncate">
                {overview.link_title}
              </CardTitle>
              {selectedLink?.url && (
                <a
                  href={selectedLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1 text-xs text-muted-foreground hover:text-primary transition-colors group/link"
                >
                  <ExternalLink className="h-3 w-3 shrink-0 group-hover/link:text-primary" />
                  <span className="truncate max-w-[400px]">{selectedLink.url}</span>
                </a>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className={cn(variant === 'ghost' ? 'px-0 pt-4' : 'px-6 pt-4')}>
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <InstitutionsTab
              sectorsForDisplay={sectorsForDisplay}
              derivedTotals={derivedTotals}
              totalSectors={totalSectors}
              totalSchools={totalSchools}
              accessedCount={accessedCount}
              notAccessedCount={notAccessedCount}
              accessRate={accessRate}
              expandedSectors={expandedSectors}
              toggleSector={toggleSector}
              formatDate={formatDate}
              overview={overview}
              selectedLink={selectedLink}
              onResourceAction={onResourceAction}
              notAccessedInstitutions={notAccessedInstitutions}
              hasSectors={hasSectors}
              hasUserTargets={hasUserTargets}
            />
          </div>
        </CardContent>
      </ContentWrapper>
    </TooltipProvider>
  );
};

export default LinkSharingOverviewCard;
