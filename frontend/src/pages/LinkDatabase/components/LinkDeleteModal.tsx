import { GenericDeleteModal, type DeleteType } from '@/components/common/GenericDeleteModal';
import type { LinkShare } from '../types/linkDatabase.types';

interface LinkDeleteModalProps {
  link: LinkShare | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (deleteType: DeleteType) => void;
}

export function LinkDeleteModal({
  link,
  isOpen,
  isLoading,
  onClose,
  onConfirm,
}: LinkDeleteModalProps) {
  const isDisabled = link?.status === 'disabled';

  return (
    <GenericDeleteModal
      open={isOpen}
      onClose={onClose}
      itemName={link?.title}
      itemType="Link"
      onConfirm={onConfirm}
      isLoading={isLoading}
      showDeleteTypeOptions={!isDisabled}
      defaultDeleteType={isDisabled ? 'hard' : 'soft'}
      description={
        isDisabled
          ? `"${link?.title || ''}" linki artıq deaktivdir. Həmişəlik silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz.`
          : `"${link?.title || ''}" linkini necə silmək istəyirsiniz?`
      }
      confirmButtonText={isDisabled ? 'Həmişəlik Sil' : 'Sil'}
    />
  );
}
