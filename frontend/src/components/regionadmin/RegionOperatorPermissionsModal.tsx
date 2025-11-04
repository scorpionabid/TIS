import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import {
  regionOperatorPermissionsService,
  RegionOperatorPermissionFlags,
  RegionOperatorPermissionResponse,
} from '@/services/regionOperatorPermissions';

type RegionOperatorPermissionsModalProps = {
  operatorId: number | null;
  open: boolean;
  onClose: () => void;
};

const MODULE_KEYS: Array<keyof RegionOperatorPermissionFlags> = [
  'can_manage_surveys',
  'can_manage_tasks',
  'can_manage_documents',
  'can_manage_folders',
  'can_manage_links',
];

export const RegionOperatorPermissionsModal = ({
  operatorId,
  open,
  onClose,
}: RegionOperatorPermissionsModalProps) => {
  const queryClient = useQueryClient();
  const [localState, setLocalState] = useState<RegionOperatorPermissionFlags | null>(null);

  const {
    data,
    isLoading,
    refetch,
  } = useQuery<RegionOperatorPermissionResponse>({
    queryKey: ['regionoperator-permissions', operatorId],
    queryFn: () => regionOperatorPermissionsService.getPermissions(operatorId as number),
    enabled: open && operatorId !== null,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data?.permissions) {
      setLocalState(data.permissions);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: Partial<RegionOperatorPermissionFlags>) =>
      regionOperatorPermissionsService.updatePermissions(operatorId as number, payload),
    onSuccess: (updated) => {
      toast({ title: 'Səlahiyyətlər yeniləndi' });
      setLocalState(updated);
      queryClient.invalidateQueries({ queryKey: ['regionoperator-permissions', operatorId] });
    },
    onError: () => {
      toast({
        title: 'Xəta',
        description: 'Səlahiyyətləri yeniləmək mümkün olmadı',
        variant: 'destructive',
      });
    },
  });

  const handleToggle = (key: keyof RegionOperatorPermissionFlags, value: boolean) => {
    setLocalState((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = () => {
    if (!localState || operatorId === null) return;

    mutation.mutate(localState);
  };

  const moduleMeta = useMemo(() => data?.modules ?? {}, [data?.modules]);

  const operatorName = data?.operator?.full_name ?? data?.operator?.username ?? 'RegionOperator';

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            RegionOperator Səlahiyyətləri
          </DialogTitle>
          <DialogDescription>
            {operatorId ? `${operatorName} üçün modul səlahiyyətlərini təyin edin.` : 'RegionOperator seçilməyib.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !localState ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Məlumat yüklənir...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">İstifadəçi</p>
              <p className="text-lg font-semibold">{operatorName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data?.operator?.institution ?? '—'} · {data?.operator?.department ?? '—'}
              </p>
            </div>

            {/* Empty State Warning */}
            {localState && Object.values(localState).every(v => !v) && (
              <div className="rounded-lg border-2 border-dashed border-orange-200 bg-orange-50 p-6 text-center">
                <ShieldCheck className="mx-auto h-12 w-12 text-orange-400/70" />
                <p className="mt-3 text-sm font-medium text-orange-900">
                  Heç bir səlahiyyət verilməyib
                </p>
                <p className="text-xs text-orange-700 mt-2 max-w-md mx-auto">
                  RegionOperator hal-hazırda heç bir modul üçün səlahiyyətə malik deyil.
                  Aşağıdakı modulları aktivləşdirərək səlahiyyətlər təyin edin.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {MODULE_KEYS.map((key) => (
                <div key={key} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Label className="text-sm font-medium">
                        {moduleMeta[key]?.label ?? key}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                        {moduleMeta[key]?.description ?? 'Modul səlahiyyəti'}
                      </p>
                    </div>
                    <Switch
                      checked={localState[key]}
                      onCheckedChange={(value) => handleToggle(key, value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={mutation.isLoading}>
                Bağla
              </Button>
              <Button onClick={handleSave} disabled={mutation.isLoading}>
                {mutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yadda saxla
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

