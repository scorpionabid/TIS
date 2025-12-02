import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PermissionMetadata, PermissionModuleMeta, RolePermissionMatrixEntry } from '@/services/regionAdmin';
import { Sparkles, ShieldCheck, Search, ChevronDown, ChevronRight, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { EnhancedPermissionCheckbox } from '@/components/permissions/EnhancedPermissionCheckbox';
import { PermissionSource, UserPermissionsDetailed, PermissionWithMetadata } from '@/types/permissions';

interface PermissionAssignmentPanelProps {
  metadata?: PermissionMetadata | null;
  userPermissions?: UserPermissionsDetailed | null; // NEW: Detailed permissions
  roleName: string;
  value: string[];
  onChange: (next: string[]) => void;
  loading?: boolean;
  grantedPermissions?: string[];
  roleInfo?: RolePermissionMatrixEntry | null;
}

export function PermissionAssignmentPanel({
  metadata,
  userPermissions,
  roleName,
  value,
  onChange,
  loading = false,
  grantedPermissions = [],
  roleInfo = null,
}: PermissionAssignmentPanelProps) {
  // ✅ ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

  // Enrich permissions with metadata (source, readonly, etc.)
  const enrichedPermissions = useMemo((): PermissionWithMetadata[] => {
    if (!metadata) return [];

    return metadata.modules
      .filter(module => !module.roles || module.roles.length === 0 || module.roles.includes(roleName))
      .flatMap(module =>
        module.permissions.map(permission => {
          const isRoleBased = userPermissions?.via_roles?.includes(permission.key) ?? false;
          const isDirect = userPermissions?.direct?.includes(permission.key) ?? false;
          const isShareable = permission.shareable !== false;

          return {
            ...permission,
            source: isDirect
              ? PermissionSource.DIRECT
              : isRoleBased
                ? PermissionSource.ROLE
                : PermissionSource.INHERITED,
            readonly: !isShareable || (isRoleBased && !isDirect),
            shareable: isShareable,
          };
        })
      );
  }, [metadata, userPermissions, roleName]);

  const modules = useMemo(() => {
    if (!metadata) {
      return [];
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    return (metadata.modules || [])
      .filter((module) => {
        if (!module.roles || module.roles.length === 0) {
          return true;
        }
        return module.roles.includes(roleName);
      })
      .map((module) => {
        if (!normalizedSearch) {
          return module;
        }

        const filteredPermissions = module.permissions.filter((permission) =>
          permission.label.toLowerCase().includes(normalizedSearch) ||
          permission.description?.toLowerCase().includes(normalizedSearch)
        );

        return {
          ...module,
          permissions: filteredPermissions,
        };
      })
      .filter((module) => module.permissions.length > 0 || !normalizedSearch);
  }, [metadata, roleName, searchTerm]);

  const allowedPermissionKeys = useMemo(() => {
    return new Set(
      modules.flatMap((module) => module.permissions.map((permission) => permission.key))
    );
  }, [modules]);

  const shareablePermissionKeys = useMemo(() => {
    return new Set(
      modules.flatMap((module) =>
        module.permissions
          .filter((permission) => permission.shareable !== false)
          .map((permission) => permission.key)
      )
    );
  }, [modules]);

  const templates = useMemo(() => {
    if (!metadata) {
      return [];
    }

    return (metadata.templates || []).map((template) => {
      const filteredPermissions = template.permissions.filter((permission) =>
        allowedPermissionKeys.has(permission) && shareablePermissionKeys.has(permission)
      );

      return {
        ...template,
        permissions: filteredPermissions,
        disabled: filteredPermissions.length === 0,
      };
    });
  }, [metadata, allowedPermissionKeys, shareablePermissionKeys]);

  const moduleSummaries = useMemo(() => {
    return modules.map((module) => {
      const selectedCount = module.permissions.filter((permission) =>
        value.includes(permission.key)
      ).length;

      return {
        key: module.key,
        label: module.label,
        selectedCount,
        total: module.permissions.length,
      };
    });
  }, [modules, value]);

  const nonShareableSelections = useMemo(() => {
    if (!value?.length || shareablePermissionKeys.size === 0) {
      // If RegionAdmin has zero shareable permissions, treat all selections as non-shareable
      return value || [];
    }
    return value.filter((permission) => !shareablePermissionKeys.has(permission));
  }, [value, shareablePermissionKeys]);

  // Statistics (MUST BE BEFORE CONDITIONAL RETURNS)
  const stats = useMemo(() => {
    const directCount = enrichedPermissions.filter(p => p.source === PermissionSource.DIRECT).length;
    const roleCount = enrichedPermissions.filter(p => p.source === PermissionSource.ROLE).length;
    const selectedDirect = value.filter(key =>
      enrichedPermissions.find(p => p.key === key)?.source === PermissionSource.DIRECT
    ).length;

    return { directCount, roleCount, selectedDirect, total: enrichedPermissions.length };
  }, [enrichedPermissions, value]);

  const grantedPreview = useMemo(() => {
    if (!grantedPermissions?.length) {
      return [];
    }
    return grantedPermissions.slice(0, 6);
  }, [grantedPermissions]);

  const remainingGranted = Math.max(
    0,
    (grantedPermissions?.length ?? 0) - grantedPreview.length
  );

  // ✅ CONDITIONAL RETURNS AFTER ALL HOOKS
  if (loading) {
    return (
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Səlahiyyət seçimi yüklənir...
          </CardTitle>
          <CardDescription>RegionAdmin icazələri serverdən gətirilir.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!metadata) {
    return (
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Səlahiyyət məlumatı tapılmadı
          </CardTitle>
          <CardDescription>
            Serverdən səlahiyyət siyahısını almaq mümkün olmadı. Səhifəni yeniləməyə və ya şəbəkə bağlantınızı
            yoxlamağa çalışın.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (modules.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Mövcud səlahiyyət tapılmadı
          </CardTitle>
          <CardDescription>
            Bu rol üçün təyin oluna bilən xüsusi səlahiyyət yoxdur. Rolun default icazələri istifadə olunacaq.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const togglePermission = (permission: string, checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...value, permission])));
    } else {
      onChange(value.filter((item) => item !== permission));
    }
  };

  const applyTemplate = (templatePermissions: string[]) => {
    if (!templatePermissions?.length) {
      return;
    }
    const merged = Array.from(new Set([...value, ...templatePermissions]));
    onChange(merged);
  };

  const toggleModuleCollapse = (moduleKey: string) => {
    const next = new Set(collapsedModules);
    if (next.has(moduleKey)) {
      next.delete(moduleKey);
    } else {
      next.add(moduleKey);
    }
    setCollapsedModules(next);
  };

  return (
    <div className="space-y-4">
      {grantedPermissions && grantedPermissions.length > 0 && (
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Sizin aktiv icazələriniz ({grantedPermissions.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {grantedPreview.map((permission) => (
              <Badge key={permission} variant="secondary" className="text-xs">
                {permission}
              </Badge>
            ))}
            {remainingGranted > 0 && (
              <Badge variant="outline" className="text-xs">
                +{remainingGranted}
              </Badge>
            )}
          </div>
        </div>
      )}

      {roleInfo && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>İcazə verə biləcəklər: <strong>{roleInfo.allowed.length}</strong></span>
          {roleInfo.defaults.length > 0 && (
            <span>Default: <strong>{roleInfo.defaults.length}</strong></span>
          )}
          {roleInfo.required.length > 0 && (
            <span>Məcburi: <strong>{roleInfo.required.length}</strong></span>
          )}
        </div>
      )}

      {nonShareableSelections.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Sizin hesabınızda olmayan icazələr</AlertTitle>
          <AlertDescription className="text-xs mt-2 space-y-2">
            <p>
              Bu istifadəçidə {nonShareableSelections.length} icazə mövcuddur, lakin sizin RegionAdmin hesabınızda olmadığı üçün
              redaktə edilə bilmir. Bu icazələri təyin etmək üçün əvvəlcə SuperAdmin vasitəsilə öz hesabınıza əlavə edilməlidir.
            </p>
            <div className="flex flex-wrap gap-2">
              {nonShareableSelections.slice(0, 8).map((permission) => (
                <Badge key={permission} variant="outline" className="text-xs">
                  {permission}
                </Badge>
              ))}
              {nonShareableSelections.length > 8 && (
                <Badge variant="outline" className="text-xs">
                  +{nonShareableSelections.length - 8}
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats header */}
      {userPermissions && stats.roleCount > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            🔒 <strong>{stats.roleCount}</strong> səlahiyyət bu istifadəçinin <strong>{roleName}</strong> rolundan gəlir və
            dəyişdirilə bilməz (🔵 <strong>Role</strong> badge ilə göstərilir).
            Əlavə səlahiyyətlər direct təyin edə bilərsiniz (🟢 <strong>Direct</strong> badge ilə göstəriləcək).
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-dashed">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Səlahiyyət seçimi
              <Badge variant="secondary">{value.length}</Badge>
            </CardTitle>
            <CardDescription>
              {userPermissions ? (
                <div className="flex gap-4 mt-1 text-xs">
                  <span>📊 Cəmi: {stats.total}</span>
                  <span>🔵 Role: {stats.roleCount}</span>
                  <span>🟢 Direct: {stats.directCount}</span>
                  <span>✅ Seçilmiş: {value.length}</span>
                </div>
              ) : (
                `${roleName} rolu üçün əlavə icazələri təyin edin. Seçim etməsəniz rolun default icazələri tətbiq olunacaq.`
              )}
            </CardDescription>
          </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {templates.length > 0 && (
            <div className="space-y-2 md:space-y-0 md:flex md:items-center md:gap-2">
              <p className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Hazır şablonlar
              </p>
              <div className="flex flex-wrap gap-2">
                {templates.map((template) => (
                  <Button
                    key={template.key}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={template.disabled}
                    onClick={() => applyTemplate(template.permissions)}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Səlahiyyət axtarın..."
                className="pl-8"
                aria-label="Səlahiyyət axtarışı"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {moduleSummaries.map((summary) => (
            <div key={summary.key} className="flex items-center gap-1">
              <span className="font-semibold text-foreground">{summary.label}</span>
              <Badge variant="outline">
                {summary.selectedCount}/{summary.total}
              </Badge>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module: PermissionModuleMeta) => {
            const isCollapsed = collapsedModules.has(module.key);
            const selectedCount = module.permissions.filter((permission) =>
              value.includes(permission.key)
            ).length;

            return (
              <div key={module.key} className="rounded-lg border bg-background">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
                  onClick={() => toggleModuleCollapse(module.key)}
                  aria-expanded={!isCollapsed}
                >
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <span>{module.label}</span>
                      <Badge variant="secondary">
                        {selectedCount}/{module.permissions.length}
                      </Badge>
                    </div>
                    {module.description && (
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    )}
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {!isCollapsed && (
              <div className="space-y-2 p-4 border-t">
                {module.permissions.map((permission) => {
                  // Find enriched permission metadata
                  const enrichedPermission = enrichedPermissions.find(p => p.key === permission.key);

                  if (enrichedPermission) {
                    // Use EnhancedPermissionCheckbox with metadata
                    return (
                      <EnhancedPermissionCheckbox
                        key={permission.key}
                        permission={enrichedPermission}
                        checked={value.includes(permission.key)}
                        onChange={(checked) => togglePermission(permission.key, checked)}
                        disabled={permission.shareable === false}
                      />
                    );
                  }

                  // Fallback to regular checkbox if no enriched data
                      return (
                        <label
                          key={permission.key}
                          className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer"
                        >
                          <Checkbox
                            checked={value.includes(permission.key)}
                            onCheckedChange={(checked) =>
                              togglePermission(permission.key, checked === true)
                            }
                            aria-label={permission.label}
                          />
                          <div>
                            <p className="font-medium text-foreground text-sm">{permission.label}</p>
                            {permission.description && (
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
