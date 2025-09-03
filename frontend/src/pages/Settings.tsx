import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Save, Database, Mail, Shield, Bell, AlertCircle, CheckCircle, Loader2, Activity } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService, SettingsUpdateData } from "@/services/settings";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load settings data
  const { data: systemSettings, isLoading: systemLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => settingsService.getSystemSettings(),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  const { data: databaseSettings, isLoading: databaseLoading } = useQuery({
    queryKey: ['database-settings'],
    queryFn: () => settingsService.getDatabaseSettings(),
    staleTime: 1000 * 60 * 10,
  });

  const { data: mailSettings, isLoading: mailLoading } = useQuery({
    queryKey: ['mail-settings'],
    queryFn: () => settingsService.getMailSettings(),
    staleTime: 1000 * 60 * 10,
  });

  const { data: securitySettings, isLoading: securityLoading } = useQuery({
    queryKey: ['security-settings'],
    queryFn: () => settingsService.getSecuritySettings(),
    staleTime: 1000 * 60 * 10,
  });

  const { data: notificationSettings, isLoading: notificationLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => settingsService.getNotificationSettings(),
    staleTime: 1000 * 60 * 10,
  });

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => settingsService.getSystemHealth(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Use real data or fallback to mock data
  const system = systemSettings?.data || settingsService.getMockSystemSettings();
  const database = databaseSettings?.data || settingsService.getMockDatabaseSettings();
  const mail = mailSettings?.data || settingsService.getMockMailSettings();
  const security = securitySettings?.data || settingsService.getMockSecuritySettings();
  const notifications = notificationSettings?.data || settingsService.getMockNotificationSettings();
  const health = healthData?.data || settingsService.getMockSystemHealth() || {
    database: { status: 'unknown', response_time: 0 },
    cache: { status: 'unknown', hit_rate: 0 },
    mail: { status: 'unknown', queue_size: 0, failed_jobs: 0 },
    storage: { status: 'unknown', disk_usage: { used_gb: 0, total_gb: 0, percentage: 0 }},
    performance: { avg_response_time: 0, memory_usage_percentage: 0, cpu_usage_percentage: 0, uptime_hours: 0 }
  };

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (data: SettingsUpdateData) => settingsService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['database-settings'] });
      queryClient.invalidateQueries({ queryKey: ['mail-settings'] });
      queryClient.invalidateQueries({ queryKey: ['security-settings'] });
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      queryClient.invalidateQueries({ queryKey: ['system-health'] });
      setHasChanges(false);
      toast({
        title: "Uğurlu",
        description: "Sistem ayarları yeniləndi.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Sistem ayarları yenilənərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const testDbMutation = useMutation({
    mutationFn: () => settingsService.testDatabaseConnection(),
    onSuccess: (response) => {
      toast({
        title: response.data.status === 'connected' ? "Uğurlu" : "Xəta",
        description: response.data.status === 'connected' 
          ? `Bağlantı uğurludur. Cavab vaxtı: ${response.data.response_time}ms`
          : response.data.error || "Bağlantı uğursuz oldu.",
        variant: response.data.status === 'connected' ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Bağlantı test edilərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const testEmailMutation = useMutation({
    mutationFn: () => settingsService.testEmailConfiguration(),
    onSuccess: (response) => {
      toast({
        title: response.data.status === 'sent' ? "Uğurlu" : "Xəta",
        description: response.data.message,
        variant: response.data.status === 'sent' ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Test email göndərilərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Sağlam</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertCircle className="w-3 h-3 mr-1" />Xəbərdarlıq</Badge>;
      case 'critical':
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Kritik</Badge>;
      default:
        return <Badge variant="outline">Naməlum</Badge>;
    }
  };

  const isLoading = systemLoading || databaseLoading || mailLoading || securityLoading || notificationLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sistem Parametrləri</h1>
          <p className="text-muted-foreground">Sistem ayarları və konfiqurasiya</p>
        </div>
        <div className="flex items-center gap-3">
          {health && health.database && (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              {getStatusBadge(health.database.status)}
            </div>
          )}
          <Button 
            className="flex items-center gap-2" 
            onClick={() => updateSettingsMutation.mutate({})}
            disabled={!hasChanges || updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Dəyişiklikləri Yadda Saxla
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                  <Input 
                    id="app-name" 
                    defaultValue={system.app_name}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-url">Tətbiq URL-i</Label>
                  <Input 
                    id="app-url" 
                    defaultValue={system.app_url}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Vaxt Zonası</Label>
                  <Select 
                    defaultValue={system.timezone === 'Asia/Baku' ? 'asia_baku' : 'utc'}
                    onValueChange={() => setHasChanges(true)}
                  >
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
                  <Select 
                    defaultValue={system.language}
                    onValueChange={() => setHasChanges(true)}
                  >
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
                  <Switch 
                    checked={system.debug_mode}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Avtomatik backup</Label>
                    <p className="text-sm text-muted-foreground">Gündəlik avtomatik backup</p>
                  </div>
                  <Switch 
                    checked={system.auto_backup}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sistem monitorinqi</Label>
                    <p className="text-sm text-muted-foreground">Performans izləməsi</p>
                  </div>
                  <Switch 
                    checked={system.system_monitoring}
                    onCheckedChange={() => setHasChanges(true)}
                  />
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
                  <Input 
                    id="db-host" 
                    defaultValue={database.host}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-port">Port</Label>
                  <Input 
                    id="db-port" 
                    defaultValue={database.port.toString()}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-name">Verilənlər Bazası Adı</Label>
                  <Input 
                    id="db-name" 
                    defaultValue={database.database}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-user">İstifadəçi Adı</Label>
                  <Input 
                    id="db-user" 
                    defaultValue={database.username}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Bağlantı Statusu</Label>
                  <div className="flex items-center gap-2">
                    {healthLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      getStatusBadge(database.connection_status)
                    )}
                    {health && health.database && health.database.response_time && (
                      <span className="text-sm text-muted-foreground">
                        Cavab vaxtı: {health.database.response_time}ms
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => testDbMutation.mutate()}
                  disabled={testDbMutation.isPending}
                >
                  {testDbMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
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
                  <Input 
                    id="smtp-host" 
                    defaultValue={mail.host}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input 
                    id="smtp-port" 
                    defaultValue={mail.port.toString()}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mail-from">Göndəricinin Email-i</Label>
                  <Input 
                    id="mail-from" 
                    defaultValue={mail.from_address}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mail-name">Göndəricinin Adı</Label>
                  <Input 
                    id="mail-name" 
                    defaultValue={mail.from_name}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email bildirişləri</Label>
                    <p className="text-sm text-muted-foreground">Sistem email-ləri göndər</p>
                  </div>
                  <Switch 
                    checked={notifications.email_notifications}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <Button 
                  variant="outline"
                  onClick={() => testEmailMutation.mutate()}
                  disabled={testEmailMutation.isPending}
                >
                  {testEmailMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
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
                  <Input 
                    id="session-timeout" 
                    defaultValue={security.session_timeout.toString()}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-login-attempts">Maksimum Giriş Cəhdi</Label>
                  <Input 
                    id="max-login-attempts" 
                    defaultValue={security.max_login_attempts.toString()}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-min-length">Minimum Parol Uzunluğu</Label>
                  <Input 
                    id="password-min-length" 
                    defaultValue={security.password_min_length.toString()}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockout-duration">Bloklanma Müddəti (dəqiqə)</Label>
                  <Input 
                    id="lockout-duration" 
                    defaultValue={security.lockout_duration.toString()}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>İki faktorlu doğrulama</Label>
                    <p className="text-sm text-muted-foreground">2FA məcburi et</p>
                  </div>
                  <Switch 
                    checked={security.two_factor_enabled}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Güclü parol tələbi</Label>
                    <p className="text-sm text-muted-foreground">Rəqəm, hərf və simvol tələbi</p>
                  </div>
                  <Switch 
                    checked={security.password_require_uppercase && security.password_require_numbers}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IP ünvan məhdudiyyəti</Label>
                    <p className="text-sm text-muted-foreground">Müəyyən IP-lərdən giriş</p>
                  </div>
                  <Switch 
                    checked={security.ip_whitelist_enabled}
                    onCheckedChange={() => setHasChanges(true)}
                  />
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
                  <Switch 
                    checked={mail.email_notifications_enabled}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sistem xəbərdarlıqları</Label>
                    <p className="text-sm text-muted-foreground">Kritik sistem hadisələri</p>
                  </div>
                  <Switch 
                    checked={notifications.email_notifications}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sorğu bildirişləri</Label>
                    <p className="text-sm text-muted-foreground">Yeni sorğu bildirişləri</p>
                  </div>
                  <Switch 
                    checked={notifications.email_notifications}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tapşırıq bildirişləri</Label>
                    <p className="text-sm text-muted-foreground">Yeni tapşırıq bildirişləri</p>
                  </div>
                  <Switch 
                    checked={notifications.email_notifications}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Performans xəbərdarlıqları</Label>
                    <p className="text-sm text-muted-foreground">Sistem performans problemləri</p>
                  </div>
                  <Switch 
                    checked={notifications.email_notifications}
                    onCheckedChange={() => setHasChanges(true)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="notification-frequency">Bildiriş Tezliyi</Label>
                  <Select 
                    defaultValue={notifications.notification_frequency}
                    onValueChange={() => setHasChanges(true)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Dərhal</SelectItem>
                      <SelectItem value="hourly">Saatlıq</SelectItem>
                      <SelectItem value="daily">Gündəlik</SelectItem>
                      <SelectItem value="weekly">Həftəlik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-time">Bildiriş Vaxtı</Label>
                  <Input 
                    id="notification-time" 
                    type="time" 
                    defaultValue={notifications.notification_time}
                    onChange={() => setHasChanges(true)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}