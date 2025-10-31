import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { memo, useMemo } from "react";

export interface UserFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  institutionFilter: string;
  onInstitutionFilterChange: (institution: string) => void;
  sortField: 'name' | 'created_at' | 'last_login';
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: 'name' | 'created_at' | 'last_login') => void;
  availableRoles: string[];
  availableStatuses: string[];
  availableInstitutions: Array<{ id: number; name: string }>;
  onClearFilters: () => void;
}

// Role labels for display
const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  regionadmin: 'Regional Admin',
  regionoperator: 'Regional Operator',
  sektoradmin: 'Sektor Admin',
  schooladmin: 'Məktəb Admin',
  müəllim: 'Müəllim',
  user: 'İstifadəçi',
};

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Passiv',
  pending: 'Gözləyən',
  suspended: 'Müvəqqəti dayandırılmış'
};

export const UserFilters = memo(({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  institutionFilter,
  onInstitutionFilterChange,
  sortField,
  sortDirection,
  onSortChange,
  availableRoles,
  availableStatuses,
  availableInstitutions,
  onClearFilters
}: UserFiltersProps) => {
  
  const hasActiveFilters = useMemo(() => {
    return searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || institutionFilter !== 'all';
  }, [searchTerm, roleFilter, statusFilter, institutionFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (roleFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (institutionFilter !== 'all') count++;
    return count;
  }, [searchTerm, roleFilter, statusFilter, institutionFilter]);

  const getSortIcon = (field: UserFiltersProps['sortField']) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  return (
    <div className="flex flex-wrap gap-4 items-center mb-6 p-4 bg-background border rounded-lg">
      {/* Search Input */}
      <div className="relative min-w-[300px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Ad, email və ya username ilə axtar..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Role Filter */}
      <Select value={roleFilter} onValueChange={onRoleFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Rol seçin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Bütün rollar</SelectItem>
          {availableRoles.map((role) => (
            <SelectItem key={role} value={role}>
              {roleLabels[role] || role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status seçin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Bütün statuslar</SelectItem>
          {availableStatuses.map((status) => (
            <SelectItem key={status} value={status}>
              {statusLabels[status] || status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Institution Filter */}
      <Select value={institutionFilter} onValueChange={onInstitutionFilterChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Müəssisə seçin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Bütün müəssisələr</SelectItem>
          {availableInstitutions.map((institution) => (
            <SelectItem key={institution.id} value={institution.id.toString()}>
              {institution.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onSortChange('name')}
          className="flex items-center gap-1"
        >
          Ad {getSortIcon('name')}
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onSortChange('last_login')}
          className="flex items-center gap-1"
        >
          Son giriş {getSortIcon('last_login')}
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onSortChange('created_at')}
          className="flex items-center gap-1"
        >
          Tarix {getSortIcon('created_at')}
        </Button>
      </div>

      {/* Clear Filters with Count Badge */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-1">
            <X className="h-4 w-4" />
            Filtri təmizlə
          </div>
          <Badge variant="secondary" className="ml-1">
            {activeFilterCount}
          </Badge>
        </Button>
      )}
    </div>
  );
});

UserFilters.displayName = 'UserFilters';
