import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AlertCircle,
  Building2,
  Loader2,
  Users,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
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

  // --- Early returns ---

  if (!selectedLink) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Paylaşılan müəssisələr</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>İlk olaraq link seçin.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Paylaşılan müəssisələr</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Məlumat yüklənir...
        </CardContent>
      </Card>
    );
  }

  if (!overview) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Paylaşılan müəssisələr</CardTitle>
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
              Məlumatı əldə etmək mümkün olmadı.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
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
      <Card>
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
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">Heç bir hədəf seçilməyib.</p>
            <p className="text-xs mt-1">
              Bu link nə müəssisə, nə də istifadəçi ilə paylaşılmayıb.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              {overview.link_title}
            </CardTitle>
            {selectedLink?.url && (
              <a
                href={selectedLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate"
              >
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{selectedLink.url}</span>
              </a>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className={
                  overview.share_scope === "specific_users"
                    ? "bg-violet-50 text-violet-700 border-violet-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }
              >
                {overview.share_scope === "specific_users" ? (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Xüsusi istifadəçilər
                  </span>
                ) : overview.share_scope === "institutional" ? (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Müəssisələr
                  </span>
                ) : (
                  overview.share_scope || "Paylaşım növü"
                )}
              </Badge>
              {selectedLink?.is_featured && (
                <Badge
                  variant="secondary"
                  className="bg-amber-50 text-amber-700 border-amber-200"
                >
                  ⭐ Seçilmiş
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <Tabs
            defaultValue={defaultTab}
            key={overview.link_id}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger
                value="institutions"
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                Müəssisələr
                {totalSchools > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {totalSchools}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                İstifadəçilər
                {hasUserTargets && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {overview.target_users?.length || 0}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="institutions" className="space-y-4 mt-0">
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
            </TabsContent>

            <TabsContent value="users" className="space-y-4 mt-0">
              <UsersTab overview={overview} hasUserTargets={hasUserTargets} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default LinkSharingOverviewCard;
