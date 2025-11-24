import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PermissionMetadata, PermissionModuleMeta } from '@/services/regionAdmin';
import { Sparkles, ShieldCheck, Search, ChevronDown, ChevronRight } from 'lucide-react';

interface PermissionAssignmentPanelProps {
  metadata?: PermissionMetadata | null;
  roleName: string;
  value: string[];
  onChange: (next: string[]) => void;
  loading?: boolean;
}

export function PermissionAssignmentPanel({
  metadata,
  roleName,
  value,
  onChange,
  loading = false,
}: PermissionAssignmentPanelProps) {
  // ✅ ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

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

  const templates = useMemo(() => {
    if (!metadata) {
      return [];
    }

    const allowedPermissionSet = new Set(
      modules.flatMap((module) => module.permissions.map((permission) => permission.key))
    );

    return (metadata.templates || []).map((template) => {
      const filteredPermissions = template.permissions.filter((permission) =>
        allowedPermissionSet.has(permission)
      );

      return {
        ...template,
        permissions: filteredPermissions,
        disabled: filteredPermissions.length === 0,
      };
    });
  }, [metadata, modules]);

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
    <Card className="border-dashed">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Səlahiyyət seçimi
            <Badge variant="secondary">{value.length}</Badge>
          </CardTitle>
          <CardDescription>
            {roleName} rolu üçün əlavə icazələri təyin edin. Seçim etməsəniz rolun default icazələri tətbiq olunacaq.
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
                    <p className="text-sm font-semibold flex items-center gap-2">
                      {module.label}
                      <Badge variant="secondary">
                        {selectedCount}/{module.permissions.length}
                      </Badge>
                    </p>
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
                    {module.permissions.map((permission) => (
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
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
