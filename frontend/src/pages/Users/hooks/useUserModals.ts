import { useState, useCallback } from "react";
import { User } from "@/services/users";

export const useUserModals = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isTrashedUsersModalOpen, setIsTrashedUsersModalOpen] = useState(false);

  const openUserModal = useCallback((user?: User) => {
    setSelectedUser(user || null);
    setIsModalOpen(true);
  }, []);

  const closeUserModal = useCallback(() => {
    setSelectedUser(null);
    setIsModalOpen(false);
  }, []);

  const openDeleteModal = useCallback((user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setUserToDelete(null);
    setIsDeleteModalOpen(false);
  }, []);

  return {
    // User Edit/Create Modal
    isModalOpen,
    selectedUser,
    openUserModal,
    closeUserModal,

    // Delete Modal
    isDeleteModalOpen,
    userToDelete,
    openDeleteModal,
    closeDeleteModal,

    // Import/Export Modal
    isImportExportModalOpen,
    setIsImportExportModalOpen,

    // Trashed Users Modal
    isTrashedUsersModalOpen,
    setIsTrashedUsersModalOpen
  };
};
