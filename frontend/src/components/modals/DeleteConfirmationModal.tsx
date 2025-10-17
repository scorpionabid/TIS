import React from 'react';
import GenericDeleteModal, { DeleteType, GenericDeleteModalProps } from '@/components/common/GenericDeleteModal';

export interface DeleteConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  item: unknown | null;
  onConfirm: (item: unknown, deleteType: DeleteType) => Promise<void>;
  itemType?: string;
  modalProps?: Partial<GenericDeleteModalProps>;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  open,
  onClose,
  item,
  onConfirm,
  itemType = 'element',
  modalProps,
}) => (
  <GenericDeleteModal
    open={open}
    onClose={onClose}
    item={item ?? undefined}
    onConfirmWithItem={onConfirm}
    itemType={itemType}
    showDeleteTypeOptions
    {...modalProps}
  />
);
