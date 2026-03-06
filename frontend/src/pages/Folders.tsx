import React from 'react';
import RegionalFolderManager from "@/components/documents/RegionalFolderManager";
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { AlertCircle } from "lucide-react";

export default function Folders() {
  const { currentUser } = useRoleCheck();
  const foldersAccess = useModuleAccess('folders');
  const isAuthenticated = !!currentUser;
  const canManageFolders =
  foldersAccess.canManage || foldersAccess.canCreate || foldersAccess.canEdit;

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş tələb olunur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə daxil olmaq üçün sistemə giriş etməlisiniz
          </p>
        </div>
      </div>
    );
  }

  if (!canManageFolders) {
    return <ResourceAccessRestricted />;
  }

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <RegionalFolderManager />
    </div>
  );
}

function ResourceAccessRestricted() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
        <p className="text-muted-foreground">
          Bu bölmədən istifadə etmək üçün səlahiyyətiniz yoxdur.
        </p>
      </div>
    </div>
  );
}
