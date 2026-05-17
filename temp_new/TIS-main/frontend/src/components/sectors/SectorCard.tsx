import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, User, Eye, Activity, AlertTriangle } from "lucide-react";
import { Sector } from "@/services/sectors";
import { getSectorTypeIcon, getSectorTypeLabel, getPerformanceBadge } from "./SectorUtils";

interface SectorCardProps {
  sector: Sector;
  onViewDetails: (sector: Sector) => void;
  onToggleStatus: (id: number) => void;
  isToggling: boolean;
}

export const SectorCard = ({ 
  sector, 
  onViewDetails, 
  onToggleStatus, 
  isToggling 
}: SectorCardProps) => {
  return (
    <Card className={`hover:shadow-md transition-shadow ${sector.is_active ? '' : 'opacity-75'}`}>
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
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {sector.region_name}
            </div>
            <Badge variant="outline" className="text-xs">
              {getSectorTypeLabel(sector.type)}
            </Badge>
          </div>
        </div>
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
            disabled={isToggling}
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
  );
};