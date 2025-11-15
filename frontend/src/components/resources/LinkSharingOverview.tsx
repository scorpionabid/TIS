import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Building2, ChevronDown, ChevronRight, Loader2, School } from 'lucide-react';
import type { Resource } from '@/types/resources';
import type { LinkSharingOverview } from '@/services/resources';

interface LinkSharingOverviewProps {
  selectedLink: Resource | null;
  overview: LinkSharingOverview | null | undefined;
  isLoading: boolean;
  onRetry?: () => void;
}

const LinkSharingOverviewCard: React.FC<LinkSharingOverviewProps> = ({
  selectedLink,
  overview,
  isLoading,
  onRetry,
}) => {
  const [expandedSectors, setExpandedSectors] = useState<Set<number | 'ungrouped'>>(new Set());

  useEffect(() => {
    setExpandedSectors(new Set());
  }, [overview?.link_id]);

  const toggleSector = (sectorId: number | 'ungrouped') => {
    setExpandedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sectorId)) {
        next.delete(sectorId);
      } else {
        next.add(sectorId);
      }
      return next;
    });
  };

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
            <AlertDescription>Məlumatı əldə etmək mümkün olmadı.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const hasUserTargets = (overview.target_users?.length ?? 0) > 0;
  const hasSectors = (overview.sectors?.length ?? 0) > 0;

  if (!hasSectors && !hasUserTargets) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Paylaşılan müəssisələr</CardTitle>
            <p className="text-sm text-muted-foreground">
              Seçilmiş link heç bir müəssisə ilə paylaşılmayıb.
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
            <Building2 className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">Müəssisə qeyd olunmayıb.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Paylaşılan müəssisələr</CardTitle>
          <p className="text-sm text-muted-foreground">
            {overview.link_title} ({overview.share_scope || '—'})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            {overview.total_sectors} sektor
          </Badge>
          <Badge variant="secondary" className="bg-green-50 text-green-700">
            {overview.total_schools} məktəb
          </Badge>
          {overview.target_counts?.schools ? (
            <Badge variant="outline">
              Seçilmiş məktəblər: {overview.target_counts.schools}
            </Badge>
          ) : null}
          {overview.target_counts?.users ? (
            <Badge variant="secondary" className="bg-purple-50 text-purple-700">
              {overview.target_counts.users} istifadəçi
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {overview.sectors.map((sector) => {
          const sectorKey = sector.id ?? 'ungrouped';
          const isExpanded = expandedSectors.has(sectorKey);

          return (
            <div key={sectorKey} className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSector(sectorKey)}
                className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition"
              >
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold">{sector.name || 'Sektor müəyyən edilməyib'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                    {sector.region_name && <span>Region: {sector.region_name}</span>}
                    <span>
                      Status: {sector.is_full_coverage ? 'Bütün məktəblər' : 'Seçilmiş məktəblər'}
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {sector.school_count} məktəb
                </Badge>
              </button>
              {isExpanded && (
                <div className="p-4">
                  {sector.schools.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Bu sektorda məktəb tapılmadı.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="pb-2 font-medium">Məktəb</th>
                            <th className="pb-2 font-medium">Link</th>
                            <th className="pb-2 font-medium">Linkə keçid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sector.schools.map((school) => (
                            <tr key={school.id} className="border-t text-sm">
                              <td className="py-2 flex items-center gap-2">
                                <School className="h-3.5 w-3.5 text-muted-foreground" />
                                {school.name}
                              </td>
                              <td className="py-2">{overview.link_title}</td>
                              <td className="py-2">
                                {selectedLink?.url ? (
                                  <a
                                    href={selectedLink.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Linkə bax
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">URL mövcud deyil</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        </CardContent>
      </Card>
      {hasUserTargets && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Birbaşa paylaşılan istifadəçilər</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.target_users?.map((user) => (
              <div
                key={user.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-lg px-3 py-2"
              >
                <div>
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.username || user.email || `İstifadəçi #${user.id}`}
                  </p>
                </div>
                {user.roles && user.roles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {user.roles.map((role) => (
                      <Badge key={`${user.id}-${role}`} variant="outline" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default LinkSharingOverviewCard;
