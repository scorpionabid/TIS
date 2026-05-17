import React from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Eye, MoreHorizontal, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TablePagination } from "@/components/common/TablePagination";
import { Badge } from "@/components/ui/badge";
import type { Preschool } from "@/services/preschools";

interface PreschoolsListProps {
  preschools: Preschool[];
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    lastPage: number;
  };
  isLoading: boolean;
  
  // Event handlers
  onEdit: (preschool: Preschool) => void;
  onDelete: (preschool: Preschool) => void;
  onViewDetails: (preschool: Preschool) => void;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  
  // User permissions
  isSuperAdmin: boolean;
  isRegionAdmin: boolean;
  isSektorAdmin: boolean;
}

const PRESCHOOL_TYPES = [
  { value: "kindergarten", label: "Uşaq Bağçası", icon: "🏫" },
  { value: "preschool_center", label: "Məktəbəqədər Təhsil Mərkəzi", icon: "🎓" },
  { value: "nursery", label: "Uşaq Evləri", icon: "🏡" },
] as const;

const getTypeInfo = (type: string) => {
  const typeInfo = PRESCHOOL_TYPES.find((t) => t.value === type);
  return typeInfo || { icon: "🏫", label: type };
};

const PreschoolRow: React.FC<{
  preschool: Preschool;
  onEdit: (preschool: Preschool) => void;
  onDelete: (preschool: Preschool) => void;
  onViewDetails: (preschool: Preschool) => void;
  canEdit: boolean;
  canDelete: boolean;
}> = React.memo(({ preschool, onEdit, onDelete, onViewDetails, canEdit, canDelete }) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const typeInfo = getTypeInfo(preschool.type);
  
  const handleEdit = React.useCallback(() => {
    setDropdownOpen(false);
    setTimeout(() => onEdit(preschool), 300);
  }, [onEdit, preschool]);
  
  const handleDelete = React.useCallback(() => {
    setDropdownOpen(false);
    setTimeout(() => onDelete(preschool), 300);
  }, [onDelete, preschool]);
  
  const handleViewDetails = React.useCallback(() => {
    setDropdownOpen(false);
    setTimeout(() => onViewDetails(preschool), 300);
  }, [onViewDetails, preschool]);

  return (
    <TableRow 
      key={preschool.id}
      className="hover:bg-muted/50 cursor-pointer"
      onClick={handleViewDetails}
    >
      <TableCell className="font-medium">
        <div className="flex items-center space-x-3">
          <span className="text-lg" title={typeInfo.label}>
            {typeInfo.icon}
          </span>
          <div>
            <div className="font-medium">{preschool.name}</div>
            {preschool.short_name && (
              <div className="text-sm text-muted-foreground">
                {preschool.short_name}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <Badge variant={preschool.is_active ? "default" : "secondary"}>
          {typeInfo.label}
        </Badge>
      </TableCell>
      
      <TableCell>
        <div className="text-sm">
          {preschool.sector_name || '-'}
        </div>
      </TableCell>
      
      <TableCell>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          preschool.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {preschool.is_active ? 'Aktiv' : 'Deaktiv'}
        </span>
      </TableCell>
      
      <TableCell>
        <div className="flex flex-col">
          {preschool.manager ? (
            <>
              <span className="font-medium">
                {preschool.manager.first_name && preschool.manager.last_name
                  ? `${preschool.manager.first_name} ${preschool.manager.last_name}`
                  : preschool.manager.username || preschool.manager.email?.split("@")[0] || "Admin"}
              </span>
              <span className="text-sm text-muted-foreground">
                {preschool.manager.email}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground italic">
              Menecer təyin edilməyib
            </span>
          )}
        </div>
      </TableCell>
      
      <TableCell>
        <div className="text-center">
          <span className="text-sm font-medium text-blue-600">
            {preschool.statistics?.total_children || 0}
          </span>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="text-center">
          <span className="text-sm font-medium text-green-600">
            {preschool.statistics?.total_teachers || 0}
          </span>
        </div>
      </TableCell>
      
      <TableCell onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(preschool.id.toString()).then(() => {
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
          #{preschool.id}
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
              <Eye className="mr-2 h-4 w-4" />
              Ətraflı baxış
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

export const PreschoolsList: React.FC<PreschoolsListProps> = ({
  preschools,
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
          <span>Məktəbəqədər müəssisələr yüklənir...</span>
        </div>
      </div>
    );
  }

  if (!preschools?.length) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <div className="text-lg font-medium mb-2">Heç bir məktəbəqədər müəssisə tapılmadı</div>
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
              <TableHead>Növ</TableHead>
              <TableHead>Sektor</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead>Menecer</TableHead>
              <TableHead className="w-20 text-center">Uşaq</TableHead>
              <TableHead className="w-20 text-center">Müəllim</TableHead>
              <TableHead className="w-20">ID</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preschools.map((preschool) => {
              // Determine permissions based on user role
              const canEdit = isSuperAdmin || isRegionAdmin || isSektorAdmin;
              const canDelete = isSuperAdmin || isRegionAdmin || isSektorAdmin;

              return (
                <PreschoolRow
                  key={preschool.id}
                  preschool={preschool}
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
