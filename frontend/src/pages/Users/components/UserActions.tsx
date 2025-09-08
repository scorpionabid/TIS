import { Button } from "@/components/ui/button";
import { Plus, FileDown, Upload, ArchiveRestore } from "lucide-react";
import { memo } from "react";

export interface UserActionsProps {
  currentUserRole: string;
  onCreateUser: () => void;
  onExport: () => void;
  onImportExport: () => void;
  onTrashedUsers: () => void;
}

export const UserActions = memo(({ 
  currentUserRole,
  onCreateUser,
  onExport,
  onImportExport,
  onTrashedUsers
}: UserActionsProps) => {
  
  const canCreateUsers = ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'].includes(currentUserRole);
  const canAccessImportExport = ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'].includes(currentUserRole);
  const canAccessTrashedUsers = ['superadmin', 'regionadmin'].includes(currentUserRole);

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-foreground">İstifadəçilər</h1>
        <p className="text-muted-foreground">Sistem istifadəçilərinin idarə edilməsi</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onExport} className="flex items-center gap-2">
          <FileDown className="h-4 w-4" />
          Export
        </Button>
        
        {canAccessTrashedUsers && (
          <Button 
            variant="outline" 
            onClick={onTrashedUsers} 
            className="flex items-center gap-2"
          >
            <ArchiveRestore className="h-4 w-4" />
            Silinmiş İstifadəçilər
          </Button>
        )}
        
        {canAccessImportExport && (
          <Button 
            variant="outline" 
            onClick={onImportExport} 
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            İdxal/İxrac
          </Button>
        )}
        
        {canCreateUsers && (
          <Button className="flex items-center gap-2" onClick={onCreateUser}>
            <Plus className="h-4 w-4" />
            Yeni İstifadəçi
          </Button>
        )}
      </div>
    </div>
  );
});

UserActions.displayName = 'UserActions';