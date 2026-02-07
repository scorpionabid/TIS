import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { linkDatabaseService, type PaginatedResponse } from '@/services/linkDatabase';
import type { CreateLinkData, LinkShare } from '../types/linkDatabase.types';

export type DeleteType = 'soft' | 'hard';

interface UseLinkDatabaseActionsParams {
  isOnSectorsTab: boolean;
  currentDepartmentId: number | null;
  selectedSector: number | null;
  onSuccess?: () => void;
}

export function useLinkDatabaseActions({
  isOnSectorsTab,
  currentDepartmentId,
  selectedSector,
  onSuccess,
}: UseLinkDatabaseActionsParams) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['link-database-department'] });
    queryClient.invalidateQueries({ queryKey: ['link-database-sector'] });
  }, [queryClient]);

  // Optimistically remove link(s) from all cached queries
  const removeFromCache = useCallback((linkIds: number | number[]) => {
    const ids = new Set(Array.isArray(linkIds) ? linkIds : [linkIds]);
    const prefixes = [['link-database-department'], ['link-database-sector']];

    prefixes.forEach((prefix) => {
      queryClient.setQueriesData<PaginatedResponse<LinkShare>>(
        { queryKey: prefix },
        (oldData) => {
          if (!oldData?.data) return oldData;
          const filtered = oldData.data.filter((link) => !ids.has(link.id));
          return {
            ...oldData,
            data: filtered,
            total: Math.max(0, (oldData.total || 0) - (oldData.data.length - filtered.length)),
          };
        }
      );
    });
  }, [queryClient]);

  // Optimistically update link status in cache
  const updateStatusInCache = useCallback((linkId: number, newStatus: LinkShare['status']) => {
    const prefixes = [['link-database-department'], ['link-database-sector']];

    prefixes.forEach((prefix) => {
      queryClient.setQueriesData<PaginatedResponse<LinkShare>>(
        { queryKey: prefix },
        (oldData) => {
          if (!oldData?.data) return oldData;
          return {
            ...oldData,
            data: oldData.data.map((link) =>
              link.id === linkId ? { ...link, status: newStatus } : link
            ),
          };
        }
      );
    });
  }, [queryClient]);

  // Create link
  const createMutation = useMutation({
    mutationFn: async (data: CreateLinkData) => {
      if (isOnSectorsTab && selectedSector) {
        return linkDatabaseService.createLinkForSector(selectedSector, data);
      } else if (currentDepartmentId) {
        return linkDatabaseService.createLinkForDepartment(
          currentDepartmentId.toString(),
          data
        );
      }
      throw new Error('Hədəf seçilməyib');
    },
    onSuccess: () => {
      toast({ title: 'Uğurlu', description: 'Link uğurla yaradıldı' });
      invalidateAll();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Link yaradılarkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Update link
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateLinkData> }) => {
      return linkDatabaseService.updateLink(id, data);
    },
    onSuccess: () => {
      toast({ title: 'Uğurlu', description: 'Link uğurla yeniləndi' });
      invalidateAll();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Link yenilənərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Soft delete (status -> disabled)
  const softDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return linkDatabaseService.deleteLink(id);
    },
    onSuccess: (_data, deletedId) => {
      toast({ title: 'Uğurlu', description: 'Link arxivə köçürüldü' });
      updateStatusInCache(deletedId, 'disabled');
      invalidateAll();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Link arxivləşdirilə bilmədi',
        variant: 'destructive',
      });
    },
  });

  // Hard delete (permanently remove, only works on disabled links)
  const hardDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return linkDatabaseService.forceDeleteLink(id);
    },
    onSuccess: (_data, deletedId) => {
      toast({ title: 'Uğurlu', description: 'Link həmişəlik silindi' });
      removeFromCache(deletedId);
      invalidateAll();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Link silinə bilmədi',
        variant: 'destructive',
      });
    },
  });

  // Combined delete handler
  const deleteLink = useCallback((id: number, deleteType: DeleteType) => {
    if (deleteType === 'hard') {
      hardDeleteMutation.mutate(id);
    } else {
      softDeleteMutation.mutate(id);
    }
  }, [hardDeleteMutation, softDeleteMutation]);

  // Bulk soft delete
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => linkDatabaseService.deleteLink(id))
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        throw new Error(`${ids.length - failed}/${ids.length} link arxivləşdirildi, ${failed} xəta baş verdi`);
      }
      return ids;
    },
    onSuccess: (_data, deletedIds) => {
      toast({
        title: 'Uğurlu',
        description: `${deletedIds.length} link arxivə köçürüldü`,
      });
      deletedIds.forEach((id) => updateStatusInCache(id, 'disabled'));
      invalidateAll();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Qismən xəta',
        description: error.message,
        variant: 'destructive',
      });
      invalidateAll();
    },
  });

  // Restore link (disabled -> active)
  const restoreMutation = useMutation({
    mutationFn: (id: number) => linkDatabaseService.restoreLink(id),
    onSuccess: (_data, restoredId) => {
      toast({ title: 'Uğurlu', description: 'Link uğurla bərpa edildi' });
      updateStatusInCache(restoredId, 'active');
      invalidateAll();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Link bərpa edilərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  return {
    createLink: createMutation.mutate,
    updateLink: updateMutation.mutate,
    deleteLink,
    bulkDeleteLinks: bulkDeleteMutation.mutate,
    restoreLink: restoreMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: softDeleteMutation.isPending || hardDeleteMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}
