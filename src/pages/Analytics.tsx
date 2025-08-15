import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Users, Activity, Database, Server, Clock, AlertTriangle } from "lucide-react";

export default function Analytics() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sistem Statistikası</h1>
          <p className="text-muted-foreground">Sistem performansı və istifadə statistikaları</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="7d">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Müddət seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Son 1 gün</SelectItem>
              <SelectItem value="7d">Son 7 gün</SelectItem>
              <SelectItem value="30d">Son 30 gün</SelectItem>
              <SelectItem value="90d">Son 90 gün</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            Hesabat Yarat
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv istifadəçilər</p>
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-xs text-green-500">+12% bu həftə</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sistem yükü</p>
                <p className="text-2xl font-bold">68%</p>
                <p className="text-xs text-orange-500">Orta səviyyə</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verilənlər bazası</p>
                <p className="text-2xl font-bold">2.4GB</p>
                <p className="text-xs text-blue-500">85% doluluk</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Server statusu</p>
                <p className="text-2xl font-bold">99.9%</p>
                <p className="text-xs text-green-500">Əlçatan</p>
              </div>
              <Server className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              İstifadəçi Aktivliyi
            </CardTitle>
            <CardDescription>Son 7 günün istifadəçi aktivlik trendi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <p className="text-muted-foreground">Qrafik yüklənir...</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performans Məlumatları
            </CardTitle>
            <CardDescription>Sistem performans göstəriciləri</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">CPU İstifadəsi</span>
                <span className="text-sm text-muted-foreground">45%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">RAM İstifadəsi</span>
                <span className="text-sm text-muted-foreground">72%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '72%' }}></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Disk İstifadəsi</span>
                <span className="text-sm text-muted-foreground">58%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '58%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Son Sistem Hadisələri
          </CardTitle>
          <CardDescription>Sistem logları və hadisələr</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { type: 'info', message: 'Sistem normal işləyir', time: '2 dəqiqə əvvəl' },
              { type: 'warning', message: 'Yüksək yaddaş istifadəsi aşkarlandı', time: '15 dəqiqə əvvəl' },
              { type: 'success', message: 'Backup uğurla tamamlandı', time: '1 saat əvvəl' },
              { type: 'error', message: 'Verilənlər bazası bağlantısı kəsildi', time: '2 saat əvvəl' },
            ].map((event, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                {event.type === 'info' && <Activity className="h-4 w-4 text-blue-500" />}
                {event.type === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                {event.type === 'success' && <TrendingUp className="h-4 w-4 text-green-500" />}
                {event.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{event.message}</p>
                </div>
                <span className="text-xs text-muted-foreground">{event.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}