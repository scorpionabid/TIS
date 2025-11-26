import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import { PermissionBadge } from './PermissionBadge';
import type { PermissionWithMetadata } from '@/types/permissions';
import { cn } from '@/lib/utils';

interface EnhancedPermissionCheckboxProps {
  permission: PermissionWithMetadata;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function EnhancedPermissionCheckbox({
  permission,
  checked,
  onChange,
  disabled = false,
}: EnhancedPermissionCheckboxProps) {
  const isReadonly = permission.readonly || disabled;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all',
        checked ? 'bg-primary/5 border-primary/30' : 'bg-background border-border',
        isReadonly ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent/50 cursor-pointer'
      )}
    >
      <Checkbox
        id={permission.key}
        checked={checked}
        onCheckedChange={onChange}
        disabled={isReadonly}
        className={isReadonly ? 'cursor-not-allowed' : ''}
      />

      <div className="flex-1 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Label
            htmlFor={permission.key}
            className={cn(
              'flex items-center gap-2 text-sm font-medium cursor-pointer',
              isReadonly && 'cursor-not-allowed'
            )}
          >
            <span className="truncate">{permission.label}</span>
            {isReadonly && <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
          </Label>
          {permission.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {permission.description}
            </p>
          )}
        </div>

        <PermissionBadge source={permission.source} className="flex-shrink-0" />
      </div>
    </div>
  );
}
