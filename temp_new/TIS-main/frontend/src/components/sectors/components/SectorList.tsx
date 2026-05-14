import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Activity, MapPin, User, AlertTriangle, Building, Loader2 } from 'lucide-react';
import { Sector } from '@/services/sectors';

interface SectorListProps {
  sectors: Sector[];
  isLoading: boolean;
  onViewDetails: (sector: Sector) => void;
  onToggleStatus: (sectorId: number) => void;
  onCreateSector: () => void;
  onResetFilters: () => void;
  getSectorTypeIcon: (type: string) => React.ReactNode;
  getSectorTypeLabel: (type: string) => string;
  getPerformanceBadge: (rate: number) => React.ReactNode;
  isToggleLoading: boolean;
}

export function SectorList({
  sectors,
  isLoading,
  onViewDetails,
  onToggleStatus,
  onCreateSector,
  onResetFilters,
  getSectorTypeIcon,
  getSectorTypeLabel,
  getPerformanceBadge,
  isToggleLoading,
}: SectorListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 bg-secondary rounded"></div>
                <div className="h-4 w-32 bg-secondary rounded"></div>
              </div>
              <div className="h-3 w-24 bg-secondary rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 w-full bg-secondary rounded"></div>
                <div className="h-3 w-3/4 bg-secondary rounded"></div>
              </div>
              <div className="h-8 w-full bg-secondary rounded mt-4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (sectors.length === 0) {
    return (
      <div className="col-span-full text-center py-12">
        <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">Sektor tapılmadı</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Seçilmiş filterlərə uyğun sektor yoxdur
        </p>
        <Button onClick={onResetFilters}>
          Filterləri sıfırla
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sectors.map((sector) => (
        <Card key={sector.id} className={`hover:shadow-md transition-shadow ${sector.is_active ? '' : 'opacity-75'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getSectorTypeIcon(sector.type)}
                <CardTitle className="text-base">{sector.name}</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={sector.is_active ? 'default' : 'secondary'} className="text-xs">
                  {sector.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
                </Badge>
              </div>
            </div>
            <CardDescription>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {sector.region_name}
                </div>
                <Badge variant="outline" className="text-xs">
                  {getSectorTypeLabel(sector.type)}
                </Badge>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span>Müəssisələr:</span>
                <span className="font-medium">{sector.statistics.total_institutions}</span>
              </div>
              <div className="flex justify-between">
                <span>Şagirdlər:</span>
                <span className="font-medium">{sector.statistics.total_students.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Müəllimlər:</span>
                <span className="font-medium">{sector.statistics.total_teachers}</span>
              </div>
              {sector.statistics.pending_tasks > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Gözləyən tapşırıqlar:</span>
                  <span className="font-medium">{sector.statistics.pending_tasks}</span>
                </div>
              )}
            </div>
            
            {/* Performance Metrics */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Performans</span>
                {getPerformanceBadge(sector.performance_metrics.response_rate)}
              </div>
            </div>

            {/* Manager Info */}
            {sector.manager ? (
              <div className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>
                  {(() => {
                    const displayName = (sector.manager.first_name && sector.manager.last_name) 
                      ? `${sector.manager.first_name} ${sector.manager.last_name}`
                      : sector.manager.username || sector.manager.email?.split('@')[0] || 'Admin';
                    return displayName;
                  })()}
                </span>
              </div>
            ) : (
              <div className="text-xs text-amber-600 mb-4 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Menecer təyin edilməyib</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => onViewDetails(sector)}
              >
                <Eye className="h-3 w-3 mr-1" />
                Ətraflı
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onToggleStatus(sector.id)}
                disabled={isToggleLoading}
              >
                {sector.is_active ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <Activity className="h-3 w-3" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add New Sector Card */}
      <Card className="border-dashed hover:bg-accent/50 transition-colors cursor-pointer" onClick={onCreateSector}>
        <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px]">
          <Plus className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Yeni sektor əlavə et</p>
        </CardContent>
      </Card>
    </div>
  );
}