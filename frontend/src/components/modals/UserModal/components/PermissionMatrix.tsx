/**
 * PermissionMatrix Component
 *
 * Granular CRUD-based permission management table for RegionOperator role
 * Features:
 * - 5 modules × 5 actions = 25 individual permissions
 * - Quick template selection (Viewer, Editor, Manager, Full)
 * - Module-level toggles (enable/disable entire module)
 * - Individual action switches
 * - Real-time permission count display
 * - Clear All functionality
 */

import React, { useMemo } from 'react';
import { Switch } from '../../../ui/switch';
import { Button } from '../../../ui/button';
import { Alert, AlertDescription } from '../../../ui/alert';
import { Info, RotateCcw } from 'lucide-react';
import { CRUD_PERMISSIONS, PERMISSION_TEMPLATES_CRUD } from '../utils/constants';

interface PermissionMatrixProps {
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
}

export function PermissionMatrix({ formData, setFormData }: PermissionMatrixProps) {
  // Calculate total enabled permissions
  const enabledCount = useMemo(() => {
    return Object.values(CRUD_PERMISSIONS).reduce((total, module) => {
      return total + module.actions.filter(action => formData[action.key] === true).length;
    }, 0);
  }, [formData]);

  // Apply permission template
  const applyTemplate = (templateKey: keyof typeof PERMISSION_TEMPLATES_CRUD) => {
    const template = PERMISSION_TEMPLATES_CRUD[templateKey];
    setFormData({
      ...formData,
      ...template.permissions,
    });
  };

  // Toggle individual action
  const toggleAction = (actionKey: string, checked: boolean) => {
    setFormData({
      ...formData,
      [actionKey]: checked,
    });
  };

  // Toggle entire module (all 5 actions)
  const toggleModule = (moduleKey: keyof typeof CRUD_PERMISSIONS) => {
    const module = CRUD_PERMISSIONS[moduleKey];
    const allEnabled = module.actions.every(action => formData[action.key] === true);

    const updates: Record<string, boolean> = {};
    module.actions.forEach(action => {
      updates[action.key] = !allEnabled;
    });

    setFormData({
      ...formData,
      ...updates,
    });
  };

  // Check if entire module is enabled
  const isModuleFullyEnabled = (moduleKey: keyof typeof CRUD_PERMISSIONS) => {
    const module = CRUD_PERMISSIONS[moduleKey];
    return module.actions.every(action => formData[action.key] === true);
  };

  // Check if module is partially enabled
  const isModulePartiallyEnabled = (moduleKey: keyof typeof CRUD_PERMISSIONS) => {
    const module = CRUD_PERMISSIONS[moduleKey];
    const enabledActions = module.actions.filter(action => formData[action.key] === true);
    return enabledActions.length > 0 && enabledActions.length < module.actions.length;
  };

  // Clear all permissions
  const clearAll = () => {
    const updates: Record<string, boolean> = {};
    Object.values(CRUD_PERMISSIONS).forEach(module => {
      module.actions.forEach(action => {
        updates[action.key] = false;
      });
    });
    setFormData({
      ...formData,
      ...updates,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Səlahiyyət İdarəetməsi</h3>
          <p className="text-sm text-muted-foreground">
            {enabledCount} / 25 səlahiyyət aktiv
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearAll}
          disabled={enabledCount === 0}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Hamısını təmizlə
        </Button>
      </div>

      {/* Quick Templates */}
      <div>
        <label className="text-sm font-medium mb-2 block">Sürətli Seçim:</label>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(PERMISSION_TEMPLATES_CRUD).map(([key, template]) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyTemplate(key as keyof typeof PERMISSION_TEMPLATES_CRUD)}
              className="flex flex-col items-center justify-center h-auto py-3 px-2 hover:bg-accent"
            >
              <span className="text-base mb-1">{template.label.split(' ')[0]}</span>
              <span className="text-xs text-muted-foreground text-center">
                {template.description}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Warning if no permissions selected */}
      {enabledCount === 0 && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>
            RegionOperator üçün ən azı 1 səlahiyyət seçilməlidir
          </AlertDescription>
        </Alert>
      )}

      {/* Permission Matrix Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left py-3 px-4 font-semibold text-sm w-[200px]">
                  Modul
                </th>
                <th className="text-center py-3 px-3 font-semibold text-sm w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>👁️</span>
                    <span className="text-xs">Görüntülə</span>
                  </div>
                </th>
                <th className="text-center py-3 px-3 font-semibold text-sm w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>➕</span>
                    <span className="text-xs">Yarat</span>
                  </div>
                </th>
                <th className="text-center py-3 px-3 font-semibold text-sm w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>✏️</span>
                    <span className="text-xs">Redaktə</span>
                  </div>
                </th>
                <th className="text-center py-3 px-3 font-semibold text-sm w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>🗑️</span>
                    <span className="text-xs">Sil</span>
                  </div>
                </th>
                <th className="text-center py-3 px-3 font-semibold text-sm w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>⭐</span>
                    <span className="text-xs">Xüsusi</span>
                  </div>
                </th>
                <th className="text-center py-3 px-4 font-semibold text-sm w-[120px]">
                  Modul
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(CRUD_PERMISSIONS).map(([moduleKey, module], idx) => {
                const fullyEnabled = isModuleFullyEnabled(moduleKey as keyof typeof CRUD_PERMISSIONS);
                const partiallyEnabled = isModulePartiallyEnabled(moduleKey as keyof typeof CRUD_PERMISSIONS);

                return (
                  <tr
                    key={moduleKey}
                    className={`border-b hover:bg-muted/30 transition-colors ${
                      idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                    }`}
                  >
                    {/* Module Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{module.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{module.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {module.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Action Switches */}
                    {module.actions.map((action) => (
                      <td key={action.key} className="py-4 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Switch
                            checked={formData[action.key] === true}
                            onCheckedChange={(checked) => toggleAction(action.key, checked)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {action.label}
                          </span>
                        </div>
                      </td>
                    ))}

                    {/* Module Toggle Button */}
                    <td className="py-4 px-4 text-center">
                      <Button
                        type="button"
                        variant={fullyEnabled ? 'default' : partiallyEnabled ? 'outline' : 'ghost'}
                        size="sm"
                        onClick={() => toggleModule(moduleKey as keyof typeof CRUD_PERMISSIONS)}
                        className="w-full"
                      >
                        {fullyEnabled ? (
                          <>
                            <span className="mr-1">✓</span>
                            Hamısı
                          </>
                        ) : partiallyEnabled ? (
                          <>
                            <span className="mr-1">◐</span>
                            Qismən
                          </>
                        ) : (
                          <>
                            <span className="mr-1">○</span>
                            Heç biri
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Açıqlamalar
        </h4>
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">👁️ Görüntüləmə:</span> Məlumatları görə bilər
          </div>
          <div>
            <span className="font-medium">➕ Yaratma:</span> Yeni məlumat əlavə edə bilər
          </div>
          <div>
            <span className="font-medium">✏️ Redaktə:</span> Mövcud məlumatları dəyişə bilər
          </div>
          <div>
            <span className="font-medium">🗑️ Silmə:</span> Məlumatları silə bilər
          </div>
          <div className="col-span-2">
            <span className="font-medium">⭐ Xüsusi:</span> Dərc etmə, təyin etmə, paylaşma kimi əlavə funksiyalar
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Seçilmiş səlahiyyətlər:
        </span>
        <span className="font-semibold">
          {enabledCount} / 25
        </span>
      </div>
    </div>
  );
}
