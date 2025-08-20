import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LinkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkCreated?: () => void;
}

export const LinkCreateModal: React.FC<LinkCreateModalProps> = ({
  isOpen,
  onClose,
  onLinkCreated
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Yaradılması</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <p className="text-gray-600">
            Link yaradılması funksionallığı inkişaf halındadır.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};