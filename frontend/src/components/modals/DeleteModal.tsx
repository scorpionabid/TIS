import React from 'react';
import GenericDeleteModal, { DeleteType } from '@/components/common/GenericDeleteModal';

export interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteType: DeleteType) => void;
  itemName: string;
  itemType: string;
  isLoading?: boolean;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  isLoading,
}) => (
  <GenericDeleteModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    itemName={itemName}
    itemType={itemType}
    isLoading={isLoading}
    showDeleteTypeOptions
  />
);
