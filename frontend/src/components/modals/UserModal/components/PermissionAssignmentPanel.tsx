import React, { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  PermissionMetadata,
  PermissionModuleMeta,
  RolePermissionMatrixEntry,
} from "@/services/regionAdmin";
import { Sparkles, ShieldCheck, Search, Check, Lock, Info } from "lucide-react";
import {
  PermissionSource,
  UserPermissionsDetailed,
  PermissionWithMetadata,
} from "@/types/permissions";
import { PermissionBadge } from "@/components/permissions/PermissionBadge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface PermissionAssignmentPanelProps {
  metadata?: PermissionMetadata | null;
  userPermissions?: UserPermissionsDetailed | null; // NEW: Detailed permissions
  roleName: string;
  value: string[];
  onChange: (next: string[]) => void;
  loading?: boolean;
  roleInfo?: RolePermissionMatrixEntry | null;
}

export function PermissionAssignmentPanel({
  metadata,
  userPermissions,
  roleName,
  value,
  onChange,
  loading = false,
  roleInfo = null,
}: PermissionAssignmentPanelProps) {
  // ✅ ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  // Enrich permissions with metadata (source, readonly, required/default flags)
  const enrichedPermissions = useMemo((): PermissionWithMetadata[] => {
    if (!metadata) return [];

    // Build quick lookup maps for required/default flags per permission
    const requiredSet = new Set<string>();
    const defaultSet = new Set<string>();
    metadata.modules.forEach((m) => {
      (m.required || []).forEach((p: string) => requiredSet.add(p));
      (m.defaults || []).forEach((p: string) => defaultSet.add(p));
    });

    return metadata.modules
      .filter(
        (module) =>
          !module.roles ||
          module.roles.length === 0 ||
          module.roles.includes(roleName)
      )
      .flatMap((module) =>
        module.permissions.map((permission) => {
          const isRoleBased =
            userPermissions?.via_roles?.includes(permission.key) ?? false;
          const isDirect =
            userPermissions?.direct?.includes(permission.key) ?? false;
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
            required: requiredSet.has(permission.key),
            default: defaultSet.has(permission.key),
          } as PermissionWithMetadata;
        })
      );
  }, [metadata, userPermissions, roleName]);

  const permissionLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    metadata?.modules?.forEach((module) => {
      module.permissions.forEach((permission) => {
        map.set(permission.key, permission.label ?? permission.key);
      });
    });
    return map;
  }, [metadata]);

  const getPermissionLabel = (key: string) =>
    permissionLabelMap.get(key) ?? key;

  const modules = useMemo(() => {
    if (!metadata) {
      return [];
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    // Group enriched permissions by their module key for display
    const enrichedByModule = new Map<string, PermissionWithMetadata[]>();
    enrichedPermissions.forEach((perm) => {
      for (const mod of metadata.modules || []) {
        if ((mod.permissions || []).some((p) => p.key === perm.key)) {
          const arr = enrichedByModule.get(mod.key) || [];
          arr.push(perm);
          enrichedByModule.set(mod.key, arr);
          break;
        }
      }
    });

    return (metadata.modules || [])
      .filter((module) => {
        if (!module.roles || module.roles.length === 0) {
          return true;
        }
        return module.roles.includes(roleName);
      })
      .map((module) => {
        const perms = enrichedByModule.get(module.key) || [];
        if (!normalizedSearch) {
          return {
            ...module,
            permissions: perms,
          } as PermissionModuleMeta & { permissions: PermissionWithMetadata[] };
        }

        const filteredPermissions = perms.filter(
          (permission) =>
            (permission.label || permission.key)
              .toLowerCase()
              .includes(normalizedSearch) ||
            (permission.description || "")
              .toLowerCase()
              .includes(normalizedSearch)
        );

        return {
          ...module,
          permissions: filteredPermissions,
        } as PermissionModuleMeta & { permissions: PermissionWithMetadata[] };
      })
      .filter(
        (module) => (module.permissions || []).length > 0 || !normalizedSearch
      );
  }, [metadata, roleName, searchTerm, enrichedPermissions]);

  const allowedPermissionKeys = useMemo(() => {
    return new Set(
      modules.flatMap((module) =>
        module.permissions.map((permission) => permission.key)
      )
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
      const filteredPermissions = template.permissions.filter(
        (permission) =>
          allowedPermissionKeys.has(permission) &&
          shareablePermissionKeys.has(permission)
      );

      return {
        ...template,
        permissions: filteredPermissions,
        disabled: filteredPermissions.length === 0,
      };
    });
  }, [metadata, allowedPermissionKeys, shareablePermissionKeys]);

  const nonShareableSelections = useMemo(() => {
    if (!value?.length || shareablePermissionKeys.size === 0) {
      // If RegionAdmin has zero shareable permissions, treat all selections as non-shareable
      return value || [];
    }
    return value.filter(
      (permission) => !shareablePermissionKeys.has(permission)
    );
  }, [value, shareablePermissionKeys]);

  const handleTemplateSelect = (templateKey: string, permissions: string[]) => {
    setActiveTemplate(templateKey);
    const merged = Array.from(new Set([...value, ...permissions]));
    onChange(merged);
  };

  const togglePermission = (permission: string) => {
    if (value.includes(permission)) {
      onChange(value.filter((item) => item !== permission));
    } else {
      onChange([...value, permission]);
    }
  };

  const toggleModuleExpansion = (moduleKey: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleKey)) {
        next.delete(moduleKey);
      } else {
        next.add(moduleKey);
      }
      return next;
    });
  };

  const visibleTemplates = templates
    .filter((template) => !template.disabled)
    .slice(0, 4);

  // ✅ CONDITIONAL RETURNS AFTER ALL HOOKS
  if (loading) {
    return (
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Səlahiyyət seçimi yüklənir...
          </CardTitle>
          <CardDescription>
            RegionAdmin icazələri serverdən gətirilir.
          </CardDescription>
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
            Serverdən səlahiyyət siyahısını almaq mümkün olmadı. Səhifəni
            yeniləməyə və ya şəbəkə bağlantınızı yoxlamağa çalışın.
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
            Bu rol üçün təyin oluna bilən xüsusi səlahiyyət yoxdur. Rolun
            default icazələri istifadə olunacaq.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-[10px]">
          1
        </Badge>
        Şablon seçin
        <Badge variant="outline" className="text-[10px]">
          2
        </Badge>
        Modulları tənzimlə
        <Badge variant="outline" className="text-[10px]">
          3
        </Badge>
        Yekun yoxlayın
      </div>

      {roleInfo && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>
            Default icazələr: <strong>{roleInfo.defaults.length}</strong>
          </span>
          <span>
            Məcburi icazələr: <strong>{roleInfo.required.length}</strong>
          </span>
        </div>
      )}

      {visibleTemplates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Hazır şablonlar
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleTemplates.map((template) => (
              <Button
                key={template.key}
                type="button"
                size="sm"
                variant={
                  activeTemplate === template.key ? "default" : "outline"
                }
                onClick={() =>
                  handleTemplateSelect(template.key, template.permissions)
                }
              >
                <div className="flex items-center gap-2">
                  <span>{template.label}</span>
                  {typeof template.available_permissions === "number" &&
                    typeof template.total_permissions === "number" &&
                    (() => {
                      const cov = template.coverage_percent ?? 0;
                      const covVariant =
                        cov === 100
                          ? "secondary"
                          : cov >= 50
                          ? "outline"
                          : "destructive";
                      return (
                        <Badge
                          variant={covVariant as any}
                          className="text-[10px]"
                        >
                          {cov}% ({template.available_permissions}/
                          {template.total_permissions})
                        </Badge>
                      );
                    })()}
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

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

      <div className="grid gap-3 md:grid-cols-2">
        {modules.map((module) => {
          const moduleSelectedCount = module.permissions.filter((permission) =>
            value.includes(permission.key)
          ).length;
          const showAll = expandedModules.has(module.key);
          const permissionList = showAll
            ? module.permissions
            : module.permissions.slice(0, 4);

          return (
            <Card key={module.key} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{module.label}</CardTitle>
                    {module.description && (
                      <CardDescription>{module.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {moduleSelectedCount}/{module.permissions.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {permissionList.map((permission) => {
                    const isSelected = value.includes(permission.key);
                    const isReadonly =
                      (permission as PermissionWithMetadata).readonly ===
                        true ||
                      (permission as PermissionWithMetadata).required === true;
                    const source = (permission as PermissionWithMetadata)
                      .source;
                    const isRequired =
                      (permission as PermissionWithMetadata).required === true;
                    const isDefault =
                      (permission as PermissionWithMetadata).default === true;

                    return (
                      <div
                        key={permission.key}
                        className="flex items-center gap-2"
                      >
                        <button
                          type="button"
                          className={`text-xs rounded-full px-3 py-1 border flex items-center gap-1 transition ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border"
                          } ${
                            isReadonly
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:bg-accent"
                          }`}
                          onClick={() =>
                            !isReadonly && togglePermission(permission.key)
                          }
                          aria-pressed={isSelected}
                          disabled={isReadonly}
                        >
                          {isReadonly ? (
                            <Lock className="h-3 w-3" />
                          ) : isSelected ? (
                            <Check className="h-3 w-3" />
                          ) : null}
                          <span className="max-w-[10rem] truncate">
                            {permission.label}
                          </span>
                        </button>

                        {/* Source badge */}
                        <PermissionBadge source={source} />

                        {/* Required / Default small chips */}
                        {isRequired && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    Məcburi
                                  </Badge>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  Bu icazə rol tərəfindən məcburi hesab olunur
                                  və silinə bilməz.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {isDefault && (
                          <Badge
                            variant={isSelected ? "secondary" : "outline"}
                            className={`text-[10px] ${
                              isSelected
                                ? "bg-amber-50 border-amber-300 text-amber-700"
                                : ""
                            }`}
                          >
                            Default
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
                {module.permissions.length > 4 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleModuleExpansion(module.key)}
                    className="text-xs"
                  >
                    {showAll
                      ? "Daha az göstər"
                      : `+${module.permissions.length - 4} daha çox`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {nonShareableSelections.length > 0 && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Lock className="h-3 w-3" />
          Bu istifadəçidə {nonShareableSelections.length} icazə var, lakin sizin
          hesabınızda olmadığı üçün read-only kimi göstərilir.
        </div>
      )}

      <Card className="border bg-muted/30">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Seçilmiş səlahiyyətlər</CardTitle>
            <CardDescription>
              {value.length === 0
                ? "Hələ seçim etməmisiniz"
                : `Toplam ${value.length} səlahiyyət seçildi`}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() =>
              window.open(
                "/docs/ROLE_SYSTEM_GUIDE.md",
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            <Info className="h-3 w-3 mr-1" />
            Tez bələdçi
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 max-h-40 overflow-auto">
          {value.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Seçim etmədən davam etmək tövsiyə olunmur.
            </p>
          ) : (
            value.map((permission) => (
              <Badge key={permission} variant="outline" className="text-xs">
                {getPermissionLabel(permission)}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
