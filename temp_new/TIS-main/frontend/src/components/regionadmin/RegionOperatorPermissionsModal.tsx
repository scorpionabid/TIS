import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import { PermissionMatrix } from '@/components/modals/UserModal/components/PermissionMatrix';
import { CRUD_PERMISSIONS } from '@/components/modals/UserModal/utils/constants';
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

const buildEmptyPermissions = (): RegionOperatorPermissionFlags => {
  const permissions: RegionOperatorPermissionFlags = {};

  Object.values(CRUD_PERMISSIONS).forEach((module) => {
    module.actions.forEach((action) => {
      permissions[action.key] = false;
    });
  });

  return permissions;
};

export const RegionOperatorPermissionsModal = ({
  operatorId,
  open,
  onClose,
}: RegionOperatorPermissionsModalProps) => {
  const queryClient = useQueryClient();
  const [localState, setLocalState] = useState<RegionOperatorPermissionFlags | null>(null);

  const { data, isLoading } = useQuery<RegionOperatorPermissionResponse>({
    queryKey: ['regionoperator-permissions', operatorId],
    queryFn: () => regionOperatorPermissionsService.getPermissions(operatorId as number),
    enabled: open && operatorId !== null,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data?.permissions) {
      setLocalState({
        ...buildEmptyPermissions(),
        ...data.permissions,
      });
    } else if (!isLoading && open) {
      setLocalState(buildEmptyPermissions());
    }
  }, [data, isLoading, open]);

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

  const handleMatrixChange = (updated: Record<string, any>) => {
    setLocalState(updated as RegionOperatorPermissionFlags);
  };

  const handleSave = () => {
    if (!localState || operatorId === null) return;

    mutation.mutate(localState);
  };

  const isLoaded = !!data && !!localState;
  const hasAnyPermissionSelected = localState ? Object.values(localState).some(Boolean) : false;

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

        {!isLoaded ? (
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

            <PermissionMatrix formData={localState} setFormData={handleMatrixChange} />

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={mutation.isLoading}>
                Bağla
              </Button>
              <Button onClick={handleSave} disabled={mutation.isLoading || !hasAnyPermissionSelected}>
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
