/**
 * PermissionMatrixMinimalist Component
 *
 * Minimalist CRUD-based permission management for RegionOperator role
 * Features:
 * - Template-first approach (role-based presets)
 * - Quick level selection (Minimal, Standard, Wide, Full)
 * - Expandable detailed permission matrix
 * - Compact visual design (~250px height vs 800px original)
 */

import React, { useMemo, useState } from 'react';
import { Switch } from '../../../ui/switch';
import { Button } from '../../../ui/button';
import { Alert, AlertDescription } from '../../../ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../ui/tooltip';
import { useToast } from '../../../ui/use-toast';
import { Info, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { CRUD_PERMISSIONS, PERMISSION_TEMPLATES_CRUD } from '../utils/constants';

interface PermissionMatrixMinimalistProps {
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
}

// Quick permission levels (replaces 8 template buttons)
const QUICK_LEVELS = {
  minimal: {
    label: 'Minimal',
    description: 'Yalnız oxumaq',
    icon: '👁️',
    template: 'viewer',
  },
  standard: {
    label: 'Standart',
    description: 'Oxu + Yaz',
    icon: '✏️',
    template: 'editor',
  },
  wide: {
    label: 'Geniş',
    description: 'Oxu + Yaz + İdarə et',
    icon: '⚙️',
    template: 'manager',
  },
  full: {
    label: 'Tam',
    description: 'Bütün səlahiyyətlər',
    icon: '🔓',
    template: 'full',
  },
} as const;

// Role templates (shown as compact buttons)
const ROLE_TEMPLATES = [
  { key: 'survey_manager', label: '📊 Sorğu Meneceri', short: 'Sorğu' },
  { key: 'task_coordinator', label: '✓ Tapşırıq Koordinatoru', short: 'Tapşırıq' },
  { key: 'document_admin', label: '📄 Sənəd Administratoru', short: 'Sənəd' },
  { key: 'content_curator', label: '🔗 Məzmun Kuratoru', short: 'Məzmun' },
] as const;

export function PermissionMatrixMinimalist({
  formData,
  setFormData,
}: PermissionMatrixMinimalistProps) {
  const { toast } = useToast();
  const [showDetailed, setShowDetailed] = useState(false);
  const [selectedQuickLevel, setSelectedQuickLevel] = useState<string | null>(null);

  // Calculate total enabled permissions
  const enabledCount = useMemo(() => {
    return Object.values(CRUD_PERMISSIONS).reduce((total, module) => {
      return total + module.actions.filter((action) => formData[action.key] === true).length;
    }, 0);
  }, [formData]);

  // Apply template
  const applyTemplate = (templateKey: keyof typeof PERMISSION_TEMPLATES_CRUD, source: string) => {
    const template = PERMISSION_TEMPLATES_CRUD[templateKey];
    setFormData({
      ...formData,
      ...template.permissions,
    });

    const enabledPermissions = Object.values(template.permissions).filter((v) => v === true).length;

    toast({
      title: '✓ Şablon tətbiq edildi',
      description: `${template.label} (${enabledPermissions} səlahiyyət)`,
      duration: 2500,
    });
  };

  // Apply quick level
  const applyQuickLevel = (levelKey: keyof typeof QUICK_LEVELS) => {
    setSelectedQuickLevel(levelKey);
    const level = QUICK_LEVELS[levelKey];
    applyTemplate(level.template as keyof typeof PERMISSION_TEMPLATES_CRUD, 'quick');
  };

  // Toggle individual action
  const toggleAction = (actionKey: string, checked: boolean) => {
    setFormData({
      ...formData,
      [actionKey]: checked,
    });
    // Clear quick level selection when manually changing
    setSelectedQuickLevel(null);
  };

  // Get module summary (how many actions enabled per module)
  const getModuleSummary = (moduleKey: keyof typeof CRUD_PERMISSIONS) => {
    const module = CRUD_PERMISSIONS[moduleKey];
    const enabledActions = module.actions.filter((action) => formData[action.key] === true).length;
    return {
      enabled: enabledActions,
      total: module.actions.length,
      percentage: Math.round((enabledActions / module.actions.length) * 100),
    };
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">📋 Səlahiyyət Seçimi</h3>
            <p className="text-xs text-muted-foreground">
              {enabledCount} / 25 səlahiyyət aktiv
            </p>
          </div>
          {enabledCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDetailed(!showDetailed)}
              className="text-xs"
            >
              {showDetailed ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Gizlət
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Detallı
                </>
              )}
            </Button>
          )}
        </div>

        {/* Role Templates (Compact) */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Hazır Rol Şablonları
          </label>
          <div className="grid grid-cols-4 gap-2">
            {ROLE_TEMPLATES.map((role) => (
              <Button
                key={role.key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  applyTemplate(role.key as keyof typeof PERMISSION_TEMPLATES_CRUD, 'role')
                }
                className="text-xs h-8 justify-start"
                title={role.label}
              >
                <span className="truncate">{role.short}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">və ya</span>
          </div>
        </div>

        {/* Quick Levels (Radio-style) */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">🎯 Sürətli Seçim</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(QUICK_LEVELS).map(([key, level]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyQuickLevel(key as keyof typeof QUICK_LEVELS)}
                className={`flex items-start gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                  selectedQuickLevel === key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {selectedQuickLevel === key ? (
                    <div className="w-4 h-4 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-1">
                    <span>{level.icon}</span>
                    <span>{level.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{level.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Warning if no permissions */}
        {enabledCount === 0 && (
          <Alert variant="destructive" className="py-2">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Ən azı 1 səlahiyyət seçilməlidir
            </AlertDescription>
          </Alert>
        )}

        {/* Module Summary (Compact Overview) */}
        {enabledCount > 0 && !showDetailed && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Seçilmiş Modullar</label>
            {Object.entries(CRUD_PERMISSIONS).map(([moduleKey, module]) => {
              const summary = getModuleSummary(moduleKey as keyof typeof CRUD_PERMISSIONS);
              if (summary.enabled === 0) return null;

              return (
                <div key={moduleKey} className="flex items-center gap-2 text-xs">
                  <span className="text-base">{module.icon}</span>
                  <span className="flex-1 font-medium">{module.label}</span>
                  <span className="text-muted-foreground">
                    {summary.enabled} / {summary.total}
                  </span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${summary.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Permission Matrix (Expandable) */}
        {showDetailed && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Detallı Səlahiyyətlər</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const updates: Record<string, boolean> = {};
                  Object.values(CRUD_PERMISSIONS).forEach((module) => {
                    module.actions.forEach((action) => {
                      updates[action.key] = false;
                    });
                  });
                  setFormData({ ...formData, ...updates });
                  setSelectedQuickLevel(null);
                  toast({
                    title: 'Səlahiyyətlər təmizləndi',
                    duration: 2000,
                  });
                }}
                className="text-xs h-7"
              >
                Hamısını təmizlə
              </Button>
            </div>

            {/* Compact Permission Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium w-32">Modul</th>
                      <th className="text-center py-2 px-2 font-medium w-16">👁️</th>
                      <th className="text-center py-2 px-2 font-medium w-16">➕</th>
                      <th className="text-center py-2 px-2 font-medium w-16">✏️</th>
                      <th className="text-center py-2 px-2 font-medium w-16">🗑️</th>
                      <th className="text-center py-2 px-2 font-medium w-16">⭐</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(CRUD_PERMISSIONS).map(([moduleKey, module], idx) => (
                      <tr
                        key={moduleKey}
                        className={`border-t ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span>{module.icon}</span>
                            <span className="font-medium text-xs">{module.label}</span>
                          </div>
                        </td>
                        {module.actions.map((action) => (
                          <td key={action.key} className="py-2 px-2 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex justify-center">
                                  <Switch
                                    checked={formData[action.key] === true}
                                    onCheckedChange={(checked) => toggleAction(action.key, checked)}
                                    className="scale-75"
                                  />
                                </div>
                              </TooltipTrigger>
                              {(action as any).detailedHelp && (
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1">
                                    <div className="font-semibold text-xs">
                                      {action.icon} {action.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {(action as any).detailedHelp}
                                    </div>
                                  </div>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
