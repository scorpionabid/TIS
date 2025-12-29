import React from 'react';
import { Switch } from '@/components/ui/switch';

interface LinkScopeToggleProps {
  scope: 'scoped' | 'global';
  canUseGlobalScope: boolean;
  onScopeChange: (next: 'scoped' | 'global') => void;
}

export function LinkScopeToggle({
  scope,
  canUseGlobalScope,
  onScopeChange,
}: LinkScopeToggleProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">
          {scope === 'global' ? 'Qlobal baxış aktivdir' : 'Qlobal baxış deaktivdir'}
        </p>
        <p className="text-sm text-muted-foreground">
          {scope === 'global'
            ? 'Bütün müəssisələrin paylaşılan linklərini filtrləyə bilərsiniz.'
            : 'Yalnız səlahiyyətli olduğunuz müəssisələrin linkləri göstərilir.'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Qlobal baxış</span>
        <Switch
          disabled={!canUseGlobalScope}
          checked={scope === 'global'}
          onCheckedChange={(checked) => {
            onScopeChange(checked ? 'global' : 'scoped');
          }}
        />
      </div>
    </div>
  );
}
