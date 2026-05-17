import type { GenericDeleteModalProps } from './GenericDeleteModal';

export const createDeleteModalConfig = (
  itemType: string,
  options?: Partial<GenericDeleteModalProps>
): Partial<GenericDeleteModalProps> => ({
  itemType,
  showDeleteTypeOptions: true,
  defaultDeleteType: 'soft',
  confirmButtonText: 'Sil',
  cancelButtonText: 'İmtina et',
  ...options,
});
