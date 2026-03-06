import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { Resource } from '@/types/resources';
import { FileText, Layers } from 'lucide-react';

interface DocumentFilterResultsSummaryProps {
  resources: Resource[];
  title?: string;
  totalCount?: number;
}

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  expired: 'Müddəti bitmiş',
  disabled: 'Deaktiv',
  archived: 'Arxiv',
  draft: 'Draft',
};

const accessLevelLabels: Record<string, string> = {
  public: 'Hamıya açıq',
  regional: 'Regional',
  sectoral: 'Sektor daxili',
  institution: 'Müəssisə daxili',
};

export function DocumentFilterResultsSummary({
  resources,
  title = 'Filtr nəticələri',
  totalCount,
}: DocumentFilterResultsSummaryProps) {
  const visibleCount = resources.length;
  const total = totalCount ?? visibleCount;

  const {
    statusCounts,
    accessCounts,
    formatCounts,
    totalDownloads,
  } = useMemo(() => {
    const statusMap = new Map<string, number>();
    const accessMap = new Map<string, number>();
    const formatMap = new Map<string, number>();
    let downloads = 0;

    resources.forEach((resource) => {
      const status = resource.status?.toLowerCase();
      if (status) {
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      }

      const accessLevel = resource.access_level?.toLowerCase();
      if (accessLevel) {
        accessMap.set(accessLevel, (accessMap.get(accessLevel) || 0) + 1);
      }

      const format = resource.file_extension?.toUpperCase()
        || resource.mime_type?.split('/').pop()?.toUpperCase();
      if (format) {
        formatMap.set(format, (formatMap.get(format) || 0) + 1);
      }

      downloads += resource.download_count || 0;
    });

    return {
      statusCounts: Array.from(statusMap.entries()),
      accessCounts: Array.from(accessMap.entries()),
      formatCounts: Array.from(formatMap.entries()),
      totalDownloads: downloads,
    };
  }, [resources]);

  const renderList = (items: Array<[string, number]>, labels?: Record<string, string>) => {
    if (!items.length) {
      return <p className="text-sm text-muted-foreground">Məlumat yoxdur</p>;
    }

    return (
      <div className="space-y-2">
        {items.slice(0, 4).map(([key, value]) => {
          const base = visibleCount || 1;
          const percentage = Math.round((value / base) * 100);
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{labels?.[key] || key}</span>
                <Badge variant="outline" className="text-xs">
                  {value}
                </Badge>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
      </div>
    );
  };

  const cardBaseClasses = "border border-border/60 bg-white/90 shadow-sm";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className={cardBaseClasses}>
        <CardHeader className="pb-3">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-bold">{total}</div>
          <p className="text-sm text-muted-foreground">
            Ümumi sənədlər {totalCount ? `(göstərilir ${visibleCount})` : ''}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            {totalDownloads} yükləmə
          </div>
        </CardContent>
      </Card>

      <Card className={cardBaseClasses}>
        <CardHeader className="flex items-center gap-2 pb-3">
          <Layers className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Status bölgüsü</CardTitle>
        </CardHeader>
        <CardContent>
          {renderList(statusCounts, statusLabels)}
        </CardContent>
      </Card>

      <Card className={cardBaseClasses}>
        <CardHeader className="flex items-center gap-2 pb-3">
          <Layers className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Giriş səviyyələri</CardTitle>
        </CardHeader>
        <CardContent>
          {renderList(accessCounts, accessLevelLabels)}
        </CardContent>
      </Card>

      <Card className={cardBaseClasses}>
        <CardHeader className="flex items-center gap-2 pb-3">
          <FileText className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Fayl formatları</CardTitle>
        </CardHeader>
        <CardContent>
          {renderList(formatCounts)}
        </CardContent>
      </Card>
    </div>
  );
}
