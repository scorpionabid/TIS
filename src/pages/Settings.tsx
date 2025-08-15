import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Save, Database, Mail, Shield, Bell } from "lucide-react";

export default function Settings() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sistem Parametrləri</h1>
          <p className="text-muted-foreground">Sistem ayarları və konfiqurasiya</p>
        </div>
        <Button className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Dəyişiklikləri Yadda Saxla
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Ümumi</TabsTrigger>
          <TabsTrigger value="database">Verilənlər Bazası</TabsTrigger>
          <TabsTrigger value="mail">Email</TabsTrigger>
          <TabsTrigger value="security">Təhlükəsizlik</TabsTrigger>
          <TabsTrigger value="notifications">Bildirişlər</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Ümumi Parametrlər
              </CardTitle>
              <CardDescription>Sistemin əsas konfiqurasiya ayarları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="app-name">Tətbiq Adı</Label>
                  <Input id="app-name" defaultValue="ATİS - Təhsil İdarəetmə Sistemi" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-url">Tətbiq URL-i</Label>
                  <Input id="app-url" defaultValue="https://atis.edu.az" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Vaxt Zonası</Label>
                  <Select defaultValue="asia_baku">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asia_baku">Asia/Baku (GMT+4)</SelectItem>
                      <SelectItem value="utc">UTC (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Dil</Label>
                  <Select defaultValue="az">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="az">Azərbaycan dili</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Debug rejimi</Label>
                    <p className="text-sm text-muted-foreground">Tərtibatçı məlumatlarını göstər</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Avtomatik backup</Label>
                    <p className="text-sm text-muted-foreground">Gündəlik avtomatik backup</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sistem monitorinqi</Label>
                    <p className="text-sm text-muted-foreground">Performans izləməsi</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Verilənlər Bazası Parametrləri
              </CardTitle>
              <CardDescription>Verilənlər bazası bağlantı ayarları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="db-host">Host</Label>
                  <Input id="db-host" defaultValue="localhost" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-port">Port</Label>
                  <Input id="db-port" defaultValue="5432" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-name">Verilənlər Bazası Adı</Label>
                  <Input id="db-name" defaultValue="atis_db" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-user">İstifadəçi Adı</Label>
                  <Input id="db-user" defaultValue="atis_user" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Bağlantı Statusu</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Bağlantı uğurludur</span>
                  </div>
                </div>
                <Button variant="outline">
                  Bağlantını Test Et
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mail">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Parametrləri
              </CardTitle>
              <CardDescription>SMTP və email ayarları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input id="smtp-host" defaultValue="smtp.gmail.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input id="smtp-port" defaultValue="587" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mail-from">Göndəricinin Email-i</Label>
                  <Input id="mail-from" defaultValue="noreply@atis.edu.az" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mail-name">Göndəricinin Adı</Label>
                  <Input id="mail-name" defaultValue="ATİS Sistemi" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email bildirişləri</Label>
                    <p className="text-sm text-muted-foreground">Sistem email-ləri göndər</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Button variant="outline">
                  Test Email Göndər
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Təhlükəsizlik Parametrləri
              </CardTitle>
              <CardDescription>Sistem təhlükəsizlik ayarları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (dəqiqə)</Label>
                  <Input id="session-timeout" defaultValue="120" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-login-attempts">Maksimum Giriş Cəhdi</Label>
                  <Input id="max-login-attempts" defaultValue="5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-min-length">Minimum Parol Uzunluğu</Label>
                  <Input id="password-min-length" defaultValue="8" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockout-duration">Bloklanma Müddəti (dəqiqə)</Label>
                  <Input id="lockout-duration" defaultValue="30" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>İki faktorlu doğrulama</Label>
                    <p className="text-sm text-muted-foreground">2FA məcburi et</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Güclü parol tələbi</Label>
                    <p className="text-sm text-muted-foreground">Rəqəm, hərf və simvol tələbi</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IP ünvan məhdudiyyəti</Label>
                    <p className="text-sm text-muted-foreground">Müəyyən IP-lərdən giriş</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Bildiriş Parametrləri
              </CardTitle>
              <CardDescription>Sistem bildiriş ayarları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email bildirişləri</Label>
                    <p className="text-sm text-muted-foreground">İstifadəçilərə email göndər</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sistem xəbərdarlıqları</Label>
                    <p className="text-sm text-muted-foreground">Kritik sistem hadisələri</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sorğu bildirişləri</Label>
                    <p className="text-sm text-muted-foreground">Yeni sorğu bildirişləri</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tapşırıq bildirişləri</Label>
                    <p className="text-sm text-muted-foreground">Yeni tapşırıq bildirişləri</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Performans xəbərdarlıqları</Label>
                    <p className="text-sm text-muted-foreground">Sistem performans problemləri</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="notification-frequency">Bildiriş Tezliyi</Label>
                  <Select defaultValue="immediate">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Dərhal</SelectItem>
                      <SelectItem value="daily">Gündəlik</SelectItem>
                      <SelectItem value="weekly">Həftəlik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-time">Bildiriş Vaxtı</Label>
                  <Input id="notification-time" type="time" defaultValue="09:00" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}