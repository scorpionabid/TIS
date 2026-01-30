import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { resourceService } from '@/services/resources';
import type { Resource } from '@/types/resources';

export type LinkAction = 'edit' | 'delete' | 'restore' | 'forceDelete';

export const useLinkActions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleResourceAction = useCallback(async (resource: Resource, action: LinkAction) => {
    try {
      switch (action) {
        case 'edit':
          const detailedLink = await resourceService.getLinkById(resource.id);
          // Return detailed link for modal
          return { action: 'open-edit-modal', data: detailedLink };
          
        case 'delete':
          await resourceService.delete(resource.id, resource.type);
          toast({
            title: 'Uğurla silindi',
            description: `Link müvəffəqiyyətlə silindi`,
          });
          queryClient.invalidateQueries({ queryKey: ['link-resources'] });
          queryClient.invalidateQueries({ queryKey: ['resource-stats'] });
          queryClient.invalidateQueries({ queryKey: ['links-selection'] });
          break;
          
        case 'restore':
          await resourceService.restoreLink(resource.id);
          toast({
            title: 'Link bərpa edildi',
            description: `Link uğurla aktiv edildi`,
          });
          queryClient.invalidateQueries({ queryKey: ['link-resources'] });
          break;
          
        case 'forceDelete':
          await resourceService.forceDeleteLink(resource.id);
          toast({
            title: 'Link birdəfəlik silindi',
            description: `Link sistemdən birdəfəlik silindi`,
          });
          queryClient.invalidateQueries({ queryKey: ['link-resources'] });
          break;
      }
    } catch (error: any) {
      console.error('Resource action error:', error);
      toast({
        title: 'Xəta baş verdi',
        description: error.message || 'Əməliyyat yerinə yetirməyi bacarmadık',
        variant: 'destructive',
      });
    }
  }, [toast, queryClient]);

  return { handleResourceAction };
};
