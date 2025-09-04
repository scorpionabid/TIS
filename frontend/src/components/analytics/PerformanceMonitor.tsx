import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  Server,
  Database,
  Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  score: number;
  services: {
    database: 'healthy' | 'warning' | 'down';
    api: 'healthy' | 'warning' | 'down';
    websocket: 'healthy' | 'warning' | 'down';
  };
}

interface PerformanceMonitorProps {
  className?: string;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ className }) => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 'healthy',
    score: 95,
    services: {
      database: 'healthy',
      api: 'healthy',
      websocket: 'healthy'
    }
  });

  const [webVitals, setWebVitals] = useState({
    lcp: 1.2, // Largest Contentful Paint
    fid: 50,   // First Input Delay
    cls: 0.05  // Cumulative Layout Shift
  });

  useEffect(() => {
    // Collect Web Vitals
    const collectWebVitals = async () => {
      try {
        // Use web-vitals library if available
        if (typeof window !== 'undefined') {
          // Mock data for now
          setWebVitals({
            lcp: Math.random() * 2 + 0.5,
            fid: Math.random() * 100 + 10,
            cls: Math.random() * 0.1
          });
        }
      } catch (error) {
        console.warn('Web Vitals collection failed:', error);
      }
    };

    collectWebVitals();
    const interval = setInterval(collectWebVitals, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'down': case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'down': case 'critical': return AlertTriangle;
      default: return Clock;
    }
  };

  const getVitalStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.warning) return 'warning';
    return 'poor';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Sistem Sağlamlığı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Overall Health */}
            <div className="text-center">
              <div className={cn(
                "text-2xl font-bold",
                getStatusColor(systemHealth.overall)
              )}>
                {systemHealth.score}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Ümumi Performans
              </div>
              <Progress value={systemHealth.score} className="mt-2" />
            </div>

            {/* Services Status */}
            <div className="md:col-span-2 space-y-2">
              {Object.entries(systemHealth.services).map(([service, status]) => {
                const Icon = service === 'database' ? Database :
                           service === 'websocket' ? Wifi : Server;
                const StatusIcon = getStatusIcon(status);
                
                return (
                  <div key={service} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="capitalize">
                        {service === 'api' ? 'API' :
                         service === 'websocket' ? 'WebSocket' :
                         service === 'database' ? 'Database' : service}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={cn("h-4 w-4", getStatusColor(status))} />
                      <Badge variant={
                        status === 'healthy' ? 'success' :
                        status === 'warning' ? 'warning' : 'destructive'
                      }>
                        {status === 'healthy' ? 'Sağlam' :
                         status === 'warning' ? 'Xəbərdarlıq' : 'Problem'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Web Vitals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Web Vitals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Largest Contentful Paint */}
            <div className="text-center">
              <div className={cn(
                "text-xl font-bold",
                getVitalStatus(webVitals.lcp, { good: 2.5, warning: 4 }) === 'good' ? 'text-green-600' :
                getVitalStatus(webVitals.lcp, { good: 2.5, warning: 4 }) === 'warning' ? 'text-yellow-600' : 'text-red-600'
              )}>
                {webVitals.lcp.toFixed(1)}s
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                LCP (Largest Contentful Paint)
              </div>
            </div>

            {/* First Input Delay */}
            <div className="text-center">
              <div className={cn(
                "text-xl font-bold",
                getVitalStatus(webVitals.fid, { good: 100, warning: 300 }) === 'good' ? 'text-green-600' :
                getVitalStatus(webVitals.fid, { good: 100, warning: 300 }) === 'warning' ? 'text-yellow-600' : 'text-red-600'
              )}>
                {Math.round(webVitals.fid)}ms
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                FID (First Input Delay)
              </div>
            </div>

            {/* Cumulative Layout Shift */}
            <div className="text-center">
              <div className={cn(
                "text-xl font-bold",
                getVitalStatus(webVitals.cls, { good: 0.1, warning: 0.25 }) === 'good' ? 'text-green-600' :
                getVitalStatus(webVitals.cls, { good: 0.1, warning: 0.25 }) === 'warning' ? 'text-yellow-600' : 'text-red-600'
              )}>
                {webVitals.cls.toFixed(3)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                CLS (Cumulative Layout Shift)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitor;