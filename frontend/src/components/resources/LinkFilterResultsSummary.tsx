import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Resource } from '@/types/resources';
import { Building2, Layers, Target } from 'lucide-react';

interface LinkFilterResultsSummaryProps {
  resources: Resource[];
  title?: string;
}

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  expired: 'Müddəti bitmiş',
  disabled: 'Deaktiv',
  draft: 'Draft',
  archived: 'Arxiv',
};

const shareScopeLabels: Record<string, string> = {
  public: 'Açıq',
  regional: 'Regional',
  sectoral: 'Sektor daxili',
  institutional: 'Müəssisə',
  specific_users: 'Xüsusi istifadəçi',
};

const linkTypeLabels: Record<string, string> = {
  external: 'Xarici',
  video: 'Video',
  form: 'Form',
  document: 'Sənəd',
};

export function LinkFilterResultsSummary({ resources, title = 'Filtr nəticələri' }: LinkFilterResultsSummaryProps) {
  const total = resources.length;

  const { statusCounts, shareScopeCounts, typeCounts, uniqueTargetCount } = useMemo(() => {
    const statusMap = new Map<string, number>();
    const scopeMap = new Map<string, number>();
    const typeMap = new Map<string, number>();
    const institutionSet = new Set<number>();

    resources.forEach((resource) => {
      const status = resource.status?.toLowerCase();
      if (status) {
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      }

      const linkType = resource.link_type;
      if (linkType) {
        typeMap.set(linkType, (typeMap.get(linkType) || 0) + 1);
      }

      if (resource.share_scope) {
        scopeMap.set(resource.share_scope, (scopeMap.get(resource.share_scope) || 0) + 1);
      }

      if (resource.institution?.id) {
        institutionSet.add(resource.institution.id);
      }

      (resource.target_institutions || []).forEach((id) => {
        if (typeof id === 'number') {
          institutionSet.add(id);
        }
      });
    });

    return {
      statusCounts: Array.from(statusMap.entries()),
      shareScopeCounts: Array.from(scopeMap.entries()),
      typeCounts: Array.from(typeMap.entries()),
      uniqueTargetCount: institutionSet.size,
    };
  }, [resources]);

  if (!total) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Filtrə uyğun link yoxdur.</p>
        </CardContent>
      </Card>
    );
  }

  const renderList = (items: Array<[string, number]>, labels: Record<string, string>) => {
    if (!items.length) {
      return <p className="text-sm text-muted-foreground">Məlumat yoxdur</p>;
    }

    return (
      <div className="space-y-2">
        {items.slice(0, 4).map(([key, value]) => {
          const percentage = Math.round((value / total) * 100);
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{labels[key] || key}</span>
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-bold">{total}</div>
          <p className="text-sm text-muted-foreground">Ümumi linklər</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            {uniqueTargetCount} hədəf müəssisə
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Status bölgüsü</CardTitle>
        </CardHeader>
        <CardContent>
          {renderList(statusCounts, statusLabels)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Paylaşma səviyyəsi</CardTitle>
        </CardHeader>
        <CardContent>
          {renderList(shareScopeCounts, shareScopeLabels)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Link növləri</CardTitle>
        </CardHeader>
        <CardContent>
          {renderList(typeCounts, linkTypeLabels)}
        </CardContent>
      </Card>
    </div>
  );
}
