import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Loader2, Shield, Lock } from "lucide-react";
import { Role, CreateRoleData, Permission } from "@/services/roles";

interface RoleModalProps {
  open: boolean;
  onClose: () => void;
  role?: Role | null;
  onSave: (data: CreateRoleData) => Promise<void>;
  permissions: Permission[];
}

export function RoleModal({ open, onClose, role, onSave, permissions }: RoleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateRoleData>({
    name: '',
    display_name: '',
    description: '',
    level: 1,
    permissions: [],
  });

  const isEditMode = !!role;
  const isSystemRole = role?.role_category === 'system';

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        display_name: role.display_name || '',
        description: role.description || '',
        level: role.level,
        permissions: role.permissions,
      });
    } else {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        level: 1,
        permissions: [],
      });
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (permissionName: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions!, permissionName]
        : prev.permissions!.filter(p => p !== permissionName)
    }));
  };

  // Group permissions by scope for better UX
  const groupedPermissions = permissions.reduce((groups, permission) => {
    const scope = permission.scope || 'other';
    if (!groups[scope]) {
      groups[scope] = [];
    }
    groups[scope].push(permission);
    return groups;
  }, {} as Record<string, Permission[]>);

  const scopeLabels = {
    system: 'Sistem İcazələri',
    global: 'Qlobal İcazələr',
    regional: 'Regional İcazələr',
    sector: 'Sektor İcazələri',
    institution: 'Müəssisə İcazələri',
    classroom: 'Sinif İcazələri',
    other: 'Digər İcazələr'
  };

  const levelLabels = {
    1: 'Səviyyə 1 - Sistem Administratoru',
    2: 'Səviyyə 2 - Sistem Operatoru', 
    3: 'Səviyyə 3 - Regional Administrator',
    4: 'Səviyyə 4 - Regional Operator',
    5: 'Səviyyə 5 - Sektor Administratoru',
    6: 'Səviyyə 6 - Sektor Operatoru',
    7: 'Səviyyə 7 - Müəssisə Administratoru',
    8: 'Səviyyə 8 - Müəssisə Müavini',
    9: 'Səviyyə 9 - Personalın Nəzarətçisi',
    10: 'Səviyyə 10 - Personal Üzvü'
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isEditMode ? `${role?.name} rolunu redaktə et` : 'Yeni rol yarat'}
            {isSystemRole && (
              <Badge variant="secondary" className="ml-2">
                <Lock className="h-3 w-3 mr-1" />
                Sistem rolu
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Rol adı *
                {isSystemRole && <span className="text-xs text-muted-foreground ml-1">(dəyişdirilə bilməz)</span>}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="rol-adi"
                required
                disabled={isSystemRole}
                className={isSystemRole ? "bg-muted" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Rol adı sistem daxilində unikal olmalıdır
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display_name">Göstəriş adı</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="Rol Göstəriş Adı"
              />
              <p className="text-xs text-muted-foreground">
                İstifadəçilərə göstəriləcək ad
              </p>
            </div>
          </div>

          {/* Role Level */}
          <div className="space-y-2">
            <Label htmlFor="level">
              Rol səviyyəsi *
              {isSystemRole && <span className="text-xs text-muted-foreground ml-1">(dəyişdirilə bilməz)</span>}
            </Label>
            <Select
              value={formData.level.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, level: parseInt(value) }))}
              disabled={isSystemRole}
            >
              <SelectTrigger className={isSystemRole ? "bg-muted" : ""}>
                <SelectValue placeholder="Səviyyə seçin" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(levelLabels).map(([level, label]) => (
                  <SelectItem key={level} value={level}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Yüksək səviyyəli rollar aşağı səviyyəli rolları idarə edə bilər
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Təsvir</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Rolun təsvirini daxil edin..."
              rows={3}
            />
          </div>

          {/* Permissions */}
          {!isSystemRole && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">İcazələr</Label>
              <p className="text-sm text-muted-foreground">
                Bu rola verilməli olan icazələri seçin. Seçilmiş icazələr: {formData.permissions?.length || 0}
              </p>

              <div className="space-y-6 max-h-96 overflow-y-auto border rounded-lg p-4">
                {Object.entries(groupedPermissions).map(([scope, scopePermissions]) => (
                  <div key={scope} className="space-y-3">
                    <h4 className="font-medium text-sm text-primary">
                      {scopeLabels[scope as keyof typeof scopeLabels] || scope}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {scopePermissions.map((permission) => (
                        <div key={permission.name} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission.name}
                            checked={formData.permissions?.includes(permission.name) || false}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(permission.name, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={permission.name}
                            className="text-sm font-normal cursor-pointer"
                            title={permission.name}
                          >
                            {permission.name.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Role Info */}
          {isSystemRole && (
            <div className="bg-muted/50 border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm mb-1">Sistem rolu</h4>
                  <p className="text-sm text-muted-foreground">
                    Bu rol sistem tərəfindən müəyyən edilmişdir. Yalnız göstəriş adı və təsviri dəyişdirilə bilər. 
                    İcazələr və səviyyə sistem tərəfindən idarə olunur.
                  </p>
                  {role?.permissions && role.permissions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium mb-2">Mövcud icazələr ({role.permissions.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 10).map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                        {role.permissions.length > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 10} daha
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Yenilə' : 'Yarat'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}