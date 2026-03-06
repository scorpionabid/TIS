import { useState } from 'react';
import type { Resource } from '@/types/resources';

export type StatusTab = 'active' | 'disabled' | 'all';

export const useLinkState = () => {
  const [statusTab, setStatusTab] = useState<StatusTab>('active');
  const [selectedLink, setSelectedLink] = useState<Resource | null>(null);
  const [linkPage, setLinkPage] = useState(1);
  const [linkPerPage, setLinkPerPage] = useState(500);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [linkBeingEdited, setLinkBeingEdited] = useState<Resource | null>(null);

  return {
    // State
    statusTab,
    selectedLink,
    linkPage,
    linkPerPage,
    isLinkModalOpen,
    isBulkUploadModalOpen,
    linkBeingEdited,
    
    // Setters
    setStatusTab,
    setSelectedLink,
    setLinkPage,
    setLinkPerPage,
    setIsLinkModalOpen,
    setIsBulkUploadModalOpen,
    setLinkBeingEdited,
  };
};
