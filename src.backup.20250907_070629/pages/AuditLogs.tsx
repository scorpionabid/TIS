import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ClipboardIcon, Search, Filter, Download, Eye, Calendar, User, Activity } from "lucide-react";

export default function AuditLogs() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logları</h1>
          <p className="text-muted-foreground">Sistem fəaliyyət qeydləri və audit izləməsi</p>
        </div>
        <Button className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Log Eksport
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bu gün</p>
                <p className="text-2xl font-bold">234</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bu həftə</p>
                <p className="text-2xl font-bold">1,847</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv istifadəçilər</p>
                <p className="text-2xl font-bold">89</p>
              </div>
              <User className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Xəta logları</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <ClipboardIcon className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtrləmə və Axtarış
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Axtarış..."
                className="pl-10"
              />
            </div>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Fəaliyyət növü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün fəaliyyətlər</SelectItem>
                <SelectItem value="login">Giriş</SelectItem>
                <SelectItem value="logout">Çıxış</SelectItem>
                <SelectItem value="create">Yaratma</SelectItem>
                <SelectItem value="update">Yeniləmə</SelectItem>
                <SelectItem value="delete">Silmə</SelectItem>
                <SelectItem value="view">Baxış</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="İstifadəçi rolu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün rollar</SelectItem>
                <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
                <SelectItem value="RegionAdmin">RegionAdmin</SelectItem>
                <SelectItem value="SektorAdmin">SektorAdmin</SelectItem>
                <SelectItem value="SchoolAdmin">SchoolAdmin</SelectItem>
                <SelectItem value="Teacher">Teacher</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Vaxt aralığı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Bu gün</SelectItem>
                <SelectItem value="week">Bu həftə</SelectItem>
                <SelectItem value="month">Bu ay</SelectItem>
                <SelectItem value="quarter">Bu rüb</SelectItem>
                <SelectItem value="year">Bu il</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardIcon className="h-5 w-5" />
            Audit Log Qeydləri
          </CardTitle>
          <CardDescription>Son sistem fəaliyyət qeydləri</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                id: 1,
                user: "Əli Məmmədov",
                role: "SuperAdmin",
                action: "Yeni istifadəçi yaratdı",
                resource: "İstifadəçi İdarəetməsi",
                ip: "192.168.1.10",
                time: "2024-01-15 14:30:25",
                status: "success"
              },
              {
                id: 2,
                user: "Leyla Həsənova",
                role: "RegionAdmin",
                action: "Sorğu nəticələrinə baxdı",
                resource: "Sorğu İdarəetməsi",
                ip: "10.0.0.15",
                time: "2024-01-15 14:25:10",
                status: "success"
              },
              {
                id: 3,
                user: "Sistem",
                role: "System",
                action: "Avtomatik backup başladı",
                resource: "Sistem",
                ip: "localhost",
                time: "2024-01-15 14:00:00",
                status: "info"
              },
              {
                id: 4,
                user: "Rəşad Əliyev",
                role: "SchoolAdmin",
                action: "Uğursuz giriş cəhdi",
                resource: "Autentifikasiya",
                ip: "203.45.67.89",
                time: "2024-01-15 13:45:33",
                status: "warning"
              },
              {
                id: 5,
                user: "Nigar Qarayeva",
                role: "Teacher",
                action: "Sənəd yüklədi",
                resource: "Sənəd İdarəetməsi",
                ip: "172.16.0.25",
                time: "2024-01-15 13:20:15",
                status: "success"
              }
            ].map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-surface/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-foreground">{log.action}</h3>
                    <Badge 
                      variant={
                        log.status === 'success' ? 'default' :
                        log.status === 'warning' ? 'destructive' :
                        log.status === 'info' ? 'secondary' : 'outline'
                      }
                    >
                      {log.status === 'success' ? 'Uğurlu' :
                       log.status === 'warning' ? 'Xəbərdarlıq' :
                       log.status === 'info' ? 'İnfo' : log.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">{log.user}</span> ({log.role}) - {log.resource}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>IP: {log.ip}</span>
                    <span>{log.time}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-center">
            <div className="text-sm text-muted-foreground">
              5 / 1,847 log göstərilir
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}