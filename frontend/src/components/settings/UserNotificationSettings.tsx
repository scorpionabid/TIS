/**
 * UserNotificationSettings Component
 *
 * Allows users to manage their notification preferences
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  userNotificationPreferencesService,
  UserNotificationPreferences,
} from "@/services/userNotificationPreferences";
import {
  Bell,
  Mail,
  Clock,
  CheckCircle,
  AlertTriangle,
  AtSign,
  MessageSquare,
  ListTodo,
  Moon,
  Save,
  RotateCcw,
  Loader2,
} from "lucide-react";

interface UserNotificationSettingsProps {
  className?: string;
}

export function UserNotificationSettings({
  className,
}: UserNotificationSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<UserNotificationPreferences | null>(null);

  // Fetch preferences
  const { data, isLoading, error } = useQuery({
    queryKey: ["user-notification-preferences"],
    queryFn: () => userNotificationPreferencesService.getPreferences(),
  });

  const preferences = localPrefs || data?.data || userNotificationPreferencesService.getDefaultPreferences();

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (prefs: Partial<UserNotificationPreferences>) =>
      userNotificationPreferencesService.updatePreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notification-preferences"] });
      setHasChanges(false);
      setLocalPrefs(null);
      toast({
        title: "Uğurlu",
        description: "Bildiriş tənzimləmələri yadda saxlanıldı",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Tənzimləmələr yadda saxlanılarkən xəta baş verdi",
        variant: "destructive",
      });
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: () => userNotificationPreferencesService.resetPreferences(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notification-preferences"] });
      setHasChanges(false);
      setLocalPrefs(null);
      toast({
        title: "Sıfırlandı",
        description: "Tənzimləmələr ilkin vəziyyətə qaytarıldı",
      });
    },
  });

  const updatePreference = <K extends keyof UserNotificationPreferences>(
    key: K,
    value: UserNotificationPreferences[K]
  ) => {
    const updated = { ...preferences, [key]: value };
    setLocalPrefs(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (localPrefs) {
      updateMutation.mutate(localPrefs);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>Tənzimləmələr yüklənərkən xəta baş verdi</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Bildiriş Tənzimləmələri
            </CardTitle>
            <CardDescription>
              Hansı bildirişləri almaq istədiyinizi tənzimləyin
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Sıfırla
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Yadda saxla
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Bildirişləri
          </h3>
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email bildirişlərini aktiv et</Label>
                <p className="text-sm text-muted-foreground">
                  Bütün email bildirişlərini idarə edir
                </p>
              </div>
              <Switch
                checked={preferences.email_enabled}
                onCheckedChange={(checked) =>
                  updatePreference("email_enabled", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Gündəlik xülasə</Label>
                <p className="text-sm text-muted-foreground">
                  Günün sonunda bildirişlərin xülasəsini al
                </p>
              </div>
              <Switch
                checked={preferences.email_daily_digest}
                disabled={!preferences.email_enabled}
                onCheckedChange={(checked) =>
                  updatePreference("email_daily_digest", checked)
                }
              />
            </div>

            {preferences.email_daily_digest && preferences.email_enabled && (
              <div className="flex items-center gap-4">
                <Label className="min-w-[120px]">Xülasə vaxtı</Label>
                <Input
                  type="time"
                  value={preferences.email_digest_time}
                  onChange={(e) =>
                    updatePreference("email_digest_time", e.target.value)
                  }
                  className="w-32"
                />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Task Notifications */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Tapşırıq Bildirişləri
          </h3>
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Deadline xatırlatmaları
                </Label>
                <p className="text-sm text-muted-foreground">
                  Yaxınlaşan deadline-lar haqqında xəbərdar ol
                </p>
              </div>
              <Switch
                checked={preferences.task_deadline_reminder}
                onCheckedChange={(checked) =>
                  updatePreference("task_deadline_reminder", checked)
                }
              />
            </div>

            {preferences.task_deadline_reminder && (
              <div className="flex items-center gap-4 pl-6">
                <Label className="min-w-[180px]">Neçə gün əvvəl xatırlat</Label>
                <Select
                  value={preferences.task_reminder_days.toString()}
                  onValueChange={(value) =>
                    updatePreference("task_reminder_days", parseInt(value))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 gün</SelectItem>
                    <SelectItem value="2">2 gün</SelectItem>
                    <SelectItem value="3">3 gün</SelectItem>
                    <SelectItem value="5">5 gün</SelectItem>
                    <SelectItem value="7">1 həftə</SelectItem>
                    <SelectItem value="14">2 həftə</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Tapşırıq təyinatları
                </Label>
                <p className="text-sm text-muted-foreground">
                  Mənə tapşırıq təyin edildikdə bildir
                </p>
              </div>
              <Switch
                checked={preferences.task_assigned_notification}
                onCheckedChange={(checked) =>
                  updatePreference("task_assigned_notification", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Status dəyişiklikləri</Label>
                <p className="text-sm text-muted-foreground">
                  Tapşırıq statusu dəyişdikdə bildir
                </p>
              </div>
              <Switch
                checked={preferences.task_status_change_notification}
                onCheckedChange={(checked) =>
                  updatePreference("task_status_change_notification", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Şərhlər
                </Label>
                <p className="text-sm text-muted-foreground">
                  Tapşırıqlara şərh əlavə edildikdə bildir
                </p>
              </div>
              <Switch
                checked={preferences.task_comment_notification}
                onCheckedChange={(checked) =>
                  updatePreference("task_comment_notification", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <AtSign className="h-4 w-4" />
                  @Mention-lər
                </Label>
                <p className="text-sm text-muted-foreground">
                  Şərhlərdə mention edildikdə bildir
                </p>
              </div>
              <Switch
                checked={preferences.task_mention_notification}
                onCheckedChange={(checked) =>
                  updatePreference("task_mention_notification", checked)
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* In-App Notifications */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Tətbiq Daxili Bildirişlər
          </h3>
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tətbiq daxili bildirişlər</Label>
                <p className="text-sm text-muted-foreground">
                  Sistem daxilində bildiriş göstər
                </p>
              </div>
              <Switch
                checked={preferences.in_app_enabled}
                onCheckedChange={(checked) =>
                  updatePreference("in_app_enabled", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Brauzer bildirişləri</Label>
                <p className="text-sm text-muted-foreground">
                  Brauzer push bildirişlərini aktivləşdir
                </p>
              </div>
              <Switch
                checked={preferences.browser_push_enabled}
                onCheckedChange={(checked) =>
                  updatePreference("browser_push_enabled", checked)
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Quiet Hours */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Sakit Saatlar
          </h3>
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sakit saatları aktivləşdir</Label>
                <p className="text-sm text-muted-foreground">
                  Müəyyən saatlarda bildiriş göndərmə
                </p>
              </div>
              <Switch
                checked={preferences.quiet_hours_enabled}
                onCheckedChange={(checked) =>
                  updatePreference("quiet_hours_enabled", checked)
                }
              />
            </div>

            {preferences.quiet_hours_enabled && (
              <div className="flex items-center gap-4">
                <Label className="min-w-[80px]">Başlanğıc</Label>
                <Input
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) =>
                    updatePreference("quiet_hours_start", e.target.value)
                  }
                  className="w-32"
                />
                <Label className="min-w-[40px]">Son</Label>
                <Input
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) =>
                    updatePreference("quiet_hours_end", e.target.value)
                  }
                  className="w-32"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
