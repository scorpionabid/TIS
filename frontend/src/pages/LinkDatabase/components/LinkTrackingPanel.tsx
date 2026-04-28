import { useMemo } from 'react';
import { 
  Building2, 
  ChevronRight, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ExternalLink,
  Loader2,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useLinkSharingOverview } from '@/hooks/resources/useLinkSharingOverview';
import type { LinkShare } from '../types/linkDatabase.types';

interface LinkTrackingPanelProps {
  link: LinkShare;
  onClose: () => void;
}

export function LinkTrackingPanel({ link, onClose }: LinkTrackingPanelProps) {
  const { data: overview, isLoading, isError, refetch } = useLinkSharingOverview(
    link as any,
    true,
    false // single link overview for now
  );

  const stats = useMemo(() => {
    if (!overview) return null;
    const total = overview.total_count || 0;
    const opened = overview.opened_count || 0;
    const unopened = overview.unopened_count || 0;
    const percentage = total > 0 ? Math.round((opened / total) * 100) : 0;

    return { total, opened, unopened, percentage };
  }, [overview]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground text-center">
          Məlumatlar yüklənir...
        </p>
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-6 text-center">
        <div className="p-3 bg-destructive/10 rounded-full">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h3 className="font-medium">Xəta baş verdi</h3>
          <p className="text-sm text-muted-foreground">
            İcmal məlumatlarını yükləmək mümkün olmadı.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Yenidən cəhd et
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <ExternalLink className="h-5 w-5 text-primary" />
          </div>
          <div className="overflow-hidden">
            <h3 className="font-semibold text-sm truncate" title={link.title}>
              {link.title}
            </h3>
            <p className="text-xs text-muted-foreground truncate">Keçid İcmalı</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-background space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Açıb
              </div>
              <p className="text-xl font-bold">{stats?.opened}</p>
            </div>
            <div className="p-3 rounded-lg border bg-background space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                Açmayıb
              </div>
              <p className="text-xl font-bold">{stats?.unopened}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Ümumi irəliləyiş</span>
              <span className="font-medium">{stats?.percentage}%</span>
            </div>
            <Progress value={stats?.percentage} className="h-2" />
          </div>

          {/* Sektoral İcmal */}
          {overview.sectors && overview.sectors.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Sektoral İcmal
              </h4>
              <div className="space-y-2">
                {overview.sectors.map((sector: any) => (
                  <div key={sector.id} className="p-3 rounded-lg border bg-background group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{sector.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {sector.total_schools} məktəb
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(sector.opened_count / sector.total_schools) * 100} 
                        className="h-1.5 flex-1" 
                      />
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {sector.opened_count} / {sector.total_schools}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Açılmamış Müəssisələr */}
          {overview.unopened_institutions && overview.unopened_institutions.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Açılmamış Müəssisələr
                </h4>
                <Badge variant="destructive" className="text-[10px] h-4">
                  {overview.unopened_count}
                </Badge>
              </div>
              <div className="space-y-2">
                {overview.unopened_institutions.map((inst: any) => (
                  <div key={inst.id} className="p-3 rounded-lg border bg-destructive/5 border-destructive/20 flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-medium leading-tight">{inst.name}</p>
                      {inst.sector_name && (
                        <p className="text-[10px] text-muted-foreground mt-1">{inst.sector_name}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5 border-destructive/30 text-destructive bg-background shrink-0">
                      <Clock className="h-3 w-3 mr-1" />
                      Açılmayıb
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
