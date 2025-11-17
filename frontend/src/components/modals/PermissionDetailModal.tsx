import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Permission, permissionService } from "@/services/permissions";
import { Shield, Users, ShieldCheck, AlertTriangle, Edit, Loader2, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface PermissionDetailModalProps {
  open: boolean;
  permission: Permission | null;
  onClose: () => void;
}

interface DetailItemProps {
  label: string;
  value: string | number | boolean | null | undefined;
}

function DetailItem({ label, value }: DetailItemProps) {
  const displayValue = value === null || value === undefined
    ? 'N/A'
    : typeof value === 'boolean'
      ? (value ? 'Bəli' : 'Xeyr')
      : value.toString();

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium">{displayValue}</p>
    </div>
  );
}

function getScopeBadgeColor(scope: string) {
  switch (scope) {
    case 'global': return 'bg-red-100 text-red-800 border-red-300';
    case 'system': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'regional': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'sector': return 'bg-green-100 text-green-800 border-green-300';
    case 'institution': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'classroom': return 'bg-gray-100 text-gray-800 border-gray-300';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getScopeLabel(scope: string) {
  switch (scope) {
    case 'global': return 'Global';
    case 'system': return 'Sistem';
    case 'regional': return 'Regional';
    case 'sector': return 'Sektor';
    case 'institution': return 'Məktəb';
    case 'classroom': return 'Sinif';
    default: return scope;
  }
}

export function PermissionDetailModal({ open, permission, onClose }: PermissionDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load usage stats when modal opens
  const { data: usageStats, isLoading: statsLoading } = useQuery({
    queryKey: ['permission-usage', permission?.id],
    queryFn: () => permission ? permissionService.getUsageStats(permission.id) : null,
    enabled: open && !!permission,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { display_name?: string; description?: string } }) =>
      permissionService.update(id, data),
    onSuccess: () => {
      toast({
        title: "Uğurlu",
        description: "Səlahiyyət yeniləndi",
      });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission-usage', permission?.id] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Xəta",
        description: error.message || "Yeniləmə zamanı xəta baş verdi",
        variant: "destructive",
      });
    },
  });

  if (!permission) return null;

  const handleEdit = () => {
    setDisplayName(permission.display_name || '');
    setDescription(permission.description || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: permission.id,
      data: {
        display_name: displayName || undefined,
        description: description || undefined,
      },
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDisplayName('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {permission.display_name || permission.name}
          </DialogTitle>
          <DialogDescription>
            Səlahiyyət detalları və istifadə statistikası
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Ümumi</TabsTrigger>
            <TabsTrigger value="roles">Rollar ({usageStats?.roles_count || 0})</TabsTrigger>
            <TabsTrigger value="users">İstifadəçilər ({usageStats?.users_count || 0})</TabsTrigger>
            <TabsTrigger value="impact">Təsir Analizi</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {isEditing ? (
              <div className="space-y-4 p-4 border rounded-lg">
                <div>
                  <Label htmlFor="display_name">Göstəriş Adı</Label>
                  <Input
                    id="display_name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Məsələn: İstifadəçi yaratma"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Təsvir</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Səlahiyyətin təsvirini daxil edin..."
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Yadda saxla
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={updateMutation.isPending}>
                    İmtina
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Sistem Adı" value={permission.name} />
                  <DetailItem label="Göstəriş Adı" value={permission.display_name || permission.name} />
                  <DetailItem label="Kateqoriya" value={permission.category} />
                  <DetailItem label="Resource" value={permission.resource} />
                  <DetailItem label="Action" value={permission.action} />
                  <div>
                    <Label className="text-xs text-muted-foreground">Scope</Label>
                    <Badge className={`${getScopeBadgeColor(permission.scope)} border mt-1`}>
                      {getScopeLabel(permission.scope)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge variant={permission.is_active ? "default" : "secondary"} className="mt-1">
                      {permission.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
                    </Badge>
                  </div>
                  <DetailItem label="Guard" value={permission.guard_name} />
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Təsvir</Label>
                  <p className="text-sm mt-1">{permission.description || 'Təsvir əlavə edilməyib'}</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                {usageStats && usageStats.roles && usageStats.roles.length > 0 ? (
                  <div className="space-y-2">
                    {usageStats.roles.map((role: any) => (
                      <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{role.display_name}</p>
                            <p className="text-xs text-muted-foreground">{role.name}</p>
                          </div>
                        </div>
                        <Badge variant="outline">Level {role.level}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Bu səlahiyyət heç bir rola verilməyib</p>
                  </div>
                )}
              </ScrollArea>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertTitle>İstifadəçi Statistikası</AlertTitle>
                  <AlertDescription>
                    <p className="text-sm">
                      Cəmi <strong>{usageStats?.users_count || 0}</strong> istifadəçi bu səlahiyyətə sahibdir.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ({usageStats?.roles_count || 0} rol vasitəsilə)
                    </p>
                  </AlertDescription>
                </Alert>

                {usageStats?.recent_assignments && usageStats.recent_assignments.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2">Son Təyinatlar</Label>
                    <ScrollArea className="h-[200px] mt-2">
                      <div className="space-y-2">
                        {usageStats.recent_assignments.map((assignment: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2 border rounded text-sm">
                            <div>
                              <p className="font-medium">{assignment.user_name}</p>
                              <p className="text-xs text-muted-foreground">{assignment.role_name}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(assignment.assigned_at).toLocaleDateString('az-AZ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Impact Analysis Tab */}
          <TabsContent value="impact" className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Təsir Analizi</AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="text-sm">
                  Bu səlahiyyəti deaktiv etsəniz, aşağıdakı təsirlər olacaq:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                  <li><strong>{usageStats?.roles_count || 0}</strong> rol təsir olunacaq</li>
                  <li><strong>{usageStats?.users_count || 0}</strong> istifadəçi təsir olunacaq</li>
                  {usageStats?.users_count && usageStats.users_count > 50 && (
                    <li className="text-destructive">
                      <strong>Xəbərdarlıq:</strong> 50-dən çox istifadəçi təsir olunacaq!
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>

            {usageStats?.roles && usageStats.roles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Təsir Olunan Rollar</Label>
                <div className="grid grid-cols-2 gap-2">
                  {usageStats.roles.map((role: any) => (
                    <div key={role.id} className="flex items-center gap-2 p-2 border rounded text-sm">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>{role.display_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {permission.is_active && usageStats?.users_count && usageStats.users_count > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Bu səlahiyyət aktiv istifadədədir. Deaktiv etmək tövsiyə edilmir.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bağla
          </Button>
          {!isEditing && (
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Redaktə
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
