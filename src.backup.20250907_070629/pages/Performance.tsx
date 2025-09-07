import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonitorIcon, Activity, Cpu, HardDrive, Wifi, AlertTriangle, TrendingUp, Database, Server } from "lucide-react";

export default function Performance() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performans Monitorinqi</h1>
          <p className="text-muted-foreground">Sistem performansının real vaxt izlənməsi</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="realtime">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Canlı</SelectItem>
              <SelectItem value="1h">Son 1 saat</SelectItem>
              <SelectItem value="24h">Son 24 saat</SelectItem>
              <SelectItem value="7d">Son 7 gün</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            Hesabat Al
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sistem Statusu</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Əlçatan</span>
                </div>
              </div>
              <Server className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response vaxtı</p>
                <p className="text-2xl font-bold">145ms</p>
                <p className="text-xs text-green-500">Əla</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv bağlantılar</p>
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-xs text-blue-500">Normal</p>
              </div>
              <Wifi className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Xəta sayı</p>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-orange-500">Az</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              CPU İstifadəsi
            </CardTitle>
            <CardDescription>Prozessor yükü monitorinqi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">CPU 1</span>
                <span className="text-sm text-muted-foreground">45%</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">CPU 2</span>
                <span className="text-sm text-muted-foreground">62%</span>
              </div>
              <Progress value={62} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">CPU 3</span>
                <span className="text-sm text-muted-foreground">38%</span>
              </div>
              <Progress value={38} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">CPU 4</span>
                <span className="text-sm text-muted-foreground">51%</span>
              </div>
              <Progress value={51} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Yaddaş İstifadəsi
            </CardTitle>
            <CardDescription>RAM və disk istifadəsi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">RAM</span>
                <span className="text-sm text-muted-foreground">6.4GB / 16GB (40%)</span>
              </div>
              <Progress value={40} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Disk (C:)</span>
                <span className="text-sm text-muted-foreground">120GB / 500GB (24%)</span>
              </div>
              <Progress value={24} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Database</span>
                <span className="text-sm text-muted-foreground">2.4GB / 20GB (12%)</span>
              </div>
              <Progress value={12} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Backup</span>
                <span className="text-sm text-muted-foreground">45GB / 100GB (45%)</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performans Məlumatları
          </CardTitle>
          <CardDescription>Detallı performans göstəriciləri</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">API Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Orta response vaxtı</span>
                  <Badge variant="outline">145ms</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">95%-ile</span>
                  <Badge variant="outline">300ms</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Uğur dərəcəsi</span>
                  <Badge className="bg-green-500">99.8%</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Database Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Query vaxtı</span>
                  <Badge variant="outline">23ms</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Aktiv bağlantılar</span>
                  <Badge variant="outline">15</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Slow queries</span>
                  <Badge className="bg-orange-500">2</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Cache Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Hit rate</span>
                  <Badge className="bg-green-500">94.2%</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cached items</span>
                  <Badge variant="outline">1,247</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cache size</span>
                  <Badge variant="outline">256MB</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Son Performans Xəbərdarlıqları
          </CardTitle>
          <CardDescription>Performansla bağlı son xəbərdarlıqlar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                type: 'warning',
                message: 'Yüksək CPU istifadəsi aşkarlandı (85%)',
                time: '5 dəqiqə əvvəl',
                resolved: false
              },
              {
                type: 'info',
                message: 'Cache təmizləndi - performans yaxşılaşdı',
                time: '15 dəqiqə əvvəl',
                resolved: true
              },
              {
                type: 'success',
                message: 'Database backup uğurla tamamlandı',
                time: '1 saat əvvəl',
                resolved: true
              },
              {
                type: 'warning',
                message: 'Disk sahəsi 80%-ə çatdı',
                time: '2 saat əvvəl',
                resolved: false
              }
            ].map((alert, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                {alert.type === 'info' && <Activity className="h-4 w-4 text-blue-500" />}
                {alert.type === 'success' && <TrendingUp className="h-4 w-4 text-green-500" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{alert.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{alert.time}</span>
                  {alert.resolved ? (
                    <Badge className="bg-green-500">Həll olundu</Badge>
                  ) : (
                    <Badge className="bg-orange-500">Aktiv</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}