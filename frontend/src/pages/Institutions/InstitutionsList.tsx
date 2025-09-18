import React from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Settings, MoreHorizontal, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TablePagination } from "@/components/common/TablePagination";
import { getInstitutionIcon, getTypeLabel } from "@/utils/institutionUtils";
import { Institution } from "@/services/institutions";
import { User } from "@/services/users";

interface InstitutionsListProps {
  institutions: Institution[];
  institutionAdmins: Record<number, User | null>;
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    lastPage: number;
  };
  isLoading: boolean;
  
  // Event handlers
  onEdit: (institution: Institution) => void;
  onDelete: (institution: Institution) => void;
  onViewDetails: (institution: Institution) => void;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  
  // User permissions
  isSuperAdmin: boolean;
  isRegionAdmin: boolean;
  isSektorAdmin: boolean;
}

const InstitutionRow: React.FC<{
  institution: Institution;
  admin: User | null;
  onEdit: (institution: Institution) => void;
  onDelete: (institution: Institution) => void;
  onViewDetails: (institution: Institution) => void;
  canEdit: boolean;
  canDelete: boolean;
}> = React.memo(({ institution, admin, onEdit, onDelete, onViewDetails, canEdit, canDelete }) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  
  const handleEdit = React.useCallback(() => {
    setDropdownOpen(false);
    // Longer delay to ensure dropdown fully closes and focus is released
    setTimeout(() => onEdit(institution), 300);
  }, [onEdit, institution]);
  
  const handleDelete = React.useCallback(() => {
    setDropdownOpen(false);
    // Longer delay to ensure dropdown fully closes and focus is released
    setTimeout(() => onDelete(institution), 300);
  }, [onDelete, institution]);
  
  const handleViewDetails = React.useCallback(() => {
    setDropdownOpen(false);
    // Longer delay to ensure dropdown fully closes and focus is released
    setTimeout(() => onViewDetails(institution), 300);
  }, [onViewDetails, institution]);

  return (
    <TableRow 
      key={institution.id}
      className="hover:bg-muted/50 cursor-pointer"
      onClick={handleViewDetails}
    >
      <TableCell className="font-medium">
        <div className="flex items-center space-x-3">
          <span className="text-lg" title={getTypeLabel(institution.type)}>
            {getInstitutionIcon(institution.type)}
          </span>
          <div>
            <div className="font-medium">{institution.name}</div>
            <div className="text-sm text-muted-foreground">
              {getTypeLabel(institution.type)}
            </div>
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="text-center">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {institution.level}
          </span>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex flex-col">
          {admin ? (
            <>
              <span className="font-medium">
                {admin.first_name} {admin.last_name}
              </span>
              <span className="text-sm text-muted-foreground">
                {admin.email}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground italic">
              Admin təyin edilməyib
            </span>
          )}
        </div>
      </TableCell>
      
      <TableCell>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          institution.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {institution.is_active ? 'Aktiv' : 'Deaktiv'}
        </span>
      </TableCell>
      
      <TableCell>
        <div className="text-sm">
          {institution.parent_institution?.name || '-'}
        </div>
      </TableCell>
      
      <TableCell onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(institution.id.toString()).then(() => {
          // Simple feedback - could be enhanced with toast
          const element = e.currentTarget;
          const originalTitle = element.title;
          element.title = '✅ Kopyalandı!';
          setTimeout(() => {
            element.title = originalTitle;
          }, 2000);
        }).catch(() => {
          console.log('Kopyalama uğursuz');
        });
      }}>
        <div className="text-sm font-mono bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200 cursor-pointer select-all hover:bg-red-100 transition-colors"
             title="ID kopyalamaq üçün kliklə">
          #{institution.id}
        </div>
      </TableCell>
      
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem onSelect={() => handleViewDetails()}>
              <Settings className="mr-2 h-4 w-4" />
              Detallar
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onSelect={() => handleEdit()}>
                <Edit className="mr-2 h-4 w-4" />
                Redaktə et
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem 
                onSelect={() => handleDelete()}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Sil
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

export const InstitutionsList: React.FC<InstitutionsListProps> = ({
  institutions,
  institutionAdmins,
  pagination,
  isLoading,
  onEdit,
  onDelete,
  onViewDetails,
  onPageChange,
  onPerPageChange,
  isSuperAdmin,
  isRegionAdmin,
  isSektorAdmin,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Müəssisələr yüklənir...</span>
        </div>
      </div>
    );
  }

  if (!institutions?.length) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <div className="text-lg font-medium mb-2">Heç bir müəssisə tapılmadı</div>
          <div className="text-sm">
            Axtarış kriteriyalarınızı dəyişməyi cəhd edin və ya yeni müəssisə əlavə edin.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Müəssisə</TableHead>
              <TableHead className="w-20 text-center">Səviyyə</TableHead>
              <TableHead>Administrator</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead>Ana müəssisə</TableHead>
              <TableHead className="w-20">ID</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {institutions.map((institution) => {
              const admin = institutionAdmins[institution.id];
              
              // Determine permissions based on user role and institution
              const canEdit = isSuperAdmin || 
                (isRegionAdmin && institution.level >= 3) ||
                (isSektorAdmin && institution.level === 4);
              
              const canDelete = isSuperAdmin || 
                (isRegionAdmin && institution.level >= 3) ||
                (isSektorAdmin && institution.level === 4);

              return (
                <InstitutionRow
                  key={institution.id}
                  institution={institution}
                  admin={admin}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewDetails={onViewDetails}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <TablePagination
        currentPage={pagination.currentPage}
        totalPages={pagination.lastPage}
        perPage={pagination.perPage}
        total={pagination.total}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
      />
    </div>
  );
};