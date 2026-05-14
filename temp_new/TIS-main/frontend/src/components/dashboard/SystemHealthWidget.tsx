import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircleIcon, 
  AlertTriangleIcon,
  XCircleIcon,
  ServerIcon,
  DatabaseIcon,
  WifiIcon
} from "lucide-react";
import { memo } from "react";

interface SystemHealth {
  status: 'ok' | 'warning' | 'error';
  memoryUsage?: string;
  cpuUsage?: number;
  diskUsage?: number;
  activeConnections?: number;
  uptime?: string;
  lastBackup?: string;
  services?: {
    database: 'ok' | 'warning' | 'error';
    api: 'ok' | 'warning' | 'error';
    websocket: 'ok' | 'warning' | 'error';
  };
}

interface SystemHealthWidgetProps {
  health: SystemHealth;
}

const getStatusIcon = (status: SystemHealth['status']) => {
  switch (status) {
    case 'ok': return CheckCircleIcon;
    case 'warning': return AlertTriangleIcon;
    case 'error': return XCircleIcon;
    default: return CheckCircleIcon;
  }
};

const getStatusColor = (status: SystemHealth['status']) => {
  switch (status) {
    case 'ok': return 'text-green-600';
    case 'warning': return 'text-yellow-600';
    case 'error': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

const getStatusBadgeVariant = (status: SystemHealth['status']) => {
  switch (status) {
    case 'ok': return 'default';
    case 'warning': return 'secondary';
    case 'error': return 'destructive';
    default: return 'outline';
  }
};

const getStatusLabel = (status: SystemHealth['status']) => {
  switch (status) {
    case 'ok': return 'Sağlam';
    case 'warning': return 'Xəbərdarlıq';
    case 'error': return 'Xəta';
    default: return 'Naməlum';
  }
};

export const SystemHealthWidget = memo(({ health }: SystemHealthWidgetProps) => {
  const StatusIcon = getStatusIcon(health.status);
  const statusColor = getStatusColor(health.status);
  const statusLabel = getStatusLabel(health.status);
  const badgeVariant = getStatusBadgeVariant(health.status);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ServerIcon className="h-5 w-5" />
              Sistem Sağlamlığı
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Real-vaxt sistem monitorinqi
            </CardDescription>
          </div>
          <Badge variant={badgeVariant as any} className="w-fit">
            <StatusIcon className={`h-4 w-4 mr-1 ${statusColor}`} />
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* System Metrics */}
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">CPU İstifadəsi</span>
                <span className="font-medium">{health.cpuUsage || 'N/A'}%</span>
              </div>
              {health.cpuUsage && (
                <Progress value={health.cpuUsage} className="h-2" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Disk İstifadəsi</span>
                <span className="font-medium">{health.diskUsage || 'N/A'}%</span>
              </div>
              {health.diskUsage && (
                <Progress value={health.diskUsage} className="h-2" />
              )}
            </div>
          </div>

          {/* Memory Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Yaddaş İstifadəsi</span>
              <span className="font-medium">{health.memoryUsage || 'N/A'}</span>
            </div>
          </div>

          {/* Active Connections */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <WifiIcon className="h-3 w-3" />
              Aktiv Bağlantı
            </span>
            <span className="font-medium">{health.activeConnections || 0}</span>
          </div>

          {/* Services Status */}
          {health.services && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Xidmətlər</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <DatabaseIcon className="h-3 w-3" />
                    Database
                  </span>
                  <Badge variant={getStatusBadgeVariant(health.services.database) as any} className="text-xs">
                    {getStatusLabel(health.services.database)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ServerIcon className="h-3 w-3" />
                    API
                  </span>
                  <Badge variant={getStatusBadgeVariant(health.services.api) as any} className="text-xs">
                    {getStatusLabel(health.services.api)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <WifiIcon className="h-3 w-3" />
                    WebSocket
                  </span>
                  <Badge variant={getStatusBadgeVariant(health.services.websocket) as any} className="text-xs">
                    {getStatusLabel(health.services.websocket)}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* System Info */}
          <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
            {health.uptime && (
              <div className="flex justify-between">
                <span>İşləmə vaxtı:</span>
                <span>{health.uptime}</span>
              </div>
            )}
            {health.lastBackup && (
              <div className="flex justify-between">
                <span>Son yedəkləmə:</span>
                <span>{new Date(health.lastBackup).toLocaleDateString('az-AZ')}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SystemHealthWidget.displayName = 'SystemHealthWidget';

export default SystemHealthWidget;
