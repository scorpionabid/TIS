import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterBar } from "@/components/common/FilterBar";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Filter,
} from "lucide-react";
import { memo, useMemo } from "react";

export interface UserFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  utisCode?: string;
  onUtisCodeChange?: (code: string) => void;
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  institutionFilter: string;
  onInstitutionFilterChange: (institution: string) => void;
  startDate?: string;
  onStartDateChange?: (date: string) => void;
  endDate?: string;
  onEndDateChange?: (date: string) => void;
  showAdvanced: boolean;
  onShowAdvancedChange: (show: boolean) => void;
  sortField: "name" | "created_at" | "last_login";
  sortDirection: "asc" | "desc";
  onSortChange: (field: "name" | "created_at" | "last_login") => void;
  availableRoles: string[];
  availableStatuses: string[];
  availableInstitutions: Array<{ id: number; name: string }>;
  onClearFilters: () => void;
}

// Role labels for display
const roleLabels: Record<string, string> = {
  superadmin: "Super Admin",
  regionadmin: "Regional Admin",
  regionoperator: "Regional Operator",
  sektoradmin: "Sektor Admin",
  schooladmin: "Məktəb Admin",
  preschooladmin: "Bağça Admin",
  müəllim: "Müəllim",
  user: "İstifadəçi",
};

const statusLabels: Record<string, string> = {
  active: "Aktiv",
  inactive: "Passiv",
  pending: "Gözləyən",
  suspended: "Müvəqqəti dayandırılmış",
};

export const UserFilters = memo(
  ({
    searchTerm,
    onSearchChange,
    utisCode = "",
    onUtisCodeChange,
    roleFilter,
    onRoleFilterChange,
    statusFilter,
    onStatusFilterChange,
    institutionFilter,
    onInstitutionFilterChange,
    startDate = "",
    onStartDateChange,
    endDate = "",
    onEndDateChange,
    showAdvanced,
    onShowAdvancedChange,
    sortField,
    sortDirection,
    onSortChange,
    availableRoles,
    availableStatuses,
    availableInstitutions,
    onClearFilters,
  }: UserFiltersProps) => {
    const hasActiveFilters = useMemo(() => {
      return (
        searchTerm ||
        utisCode ||
        roleFilter !== "all" ||
        statusFilter !== "all" ||
        institutionFilter !== "all" ||
        startDate ||
        endDate
      );
    }, [
      searchTerm,
      utisCode,
      roleFilter,
      statusFilter,
      institutionFilter,
      startDate,
      endDate,
    ]);

    const activeFilterCount = useMemo(() => {
      let count = 0;
      if (searchTerm) count++;
      if (utisCode) count++;
      if (roleFilter !== "all") count++;
      if (statusFilter !== "all") count++;
      if (institutionFilter !== "all") count++;
      if (startDate) count++;
      if (endDate) count++;
      return count;
    }, [
      searchTerm,
      utisCode,
      roleFilter,
      statusFilter,
      institutionFilter,
      startDate,
      endDate,
    ]);

    const getSortIcon = (field: UserFiltersProps["sortField"]) => {
      if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
      return sortDirection === "asc" ? (
        <ArrowUp className="h-4 w-4" />
      ) : (
        <ArrowDown className="h-4 w-4" />
      );
    };

    return (
      <div className="space-y-4 mb-6">
        <FilterBar>
          <FilterBar.Group>
            <FilterBar.Field className="flex-[2]">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Ad, email və ya username ilə axtar..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 pr-10 h-11 border-slate-200 focus:border-primary transition-all shadow-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </FilterBar.Field>

            <FilterBar.Field>
              <Select value={roleFilter} onValueChange={onRoleFilterChange}>
                <SelectTrigger className="h-11 border-slate-200 shadow-sm">
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
            </FilterBar.Field>

            <FilterBar.Field>
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="h-11 border-slate-200 shadow-sm">
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
            </FilterBar.Field>

            <Button
              variant={showAdvanced ? "secondary" : "outline"}
              className="h-11 px-4 gap-2 border-slate-200 shadow-sm transition-all"
              onClick={() => onShowAdvancedChange(!showAdvanced)}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Daha çox filtr</span>
              {showAdvanced ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
            </Button>
          </FilterBar.Group>

          <FilterBar.Actions>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSortChange("name")}
                className={`flex items-center gap-2 h-9 border-slate-200 ${sortField === "name" ? "bg-slate-50 border-primary/30" : ""}`}
              >
                Ad {getSortIcon("name")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSortChange("last_login")}
                className={`flex items-center gap-2 h-9 border-slate-200 ${sortField === "last_login" ? "bg-slate-50 border-primary/30" : ""}`}
              >
                Son giriş {getSortIcon("last_login")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSortChange("created_at")}
                className={`flex items-center gap-2 h-9 border-slate-200 ${sortField === "created_at" ? "bg-slate-50 border-primary/30" : ""}`}
              >
                Tarix {getSortIcon("created_at")}
              </Button>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="flex items-center gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-9"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Filtri təmizlə</span>
                <Badge
                  variant="secondary"
                  className="bg-rose-100 text-rose-700 border-rose-200 animate-in zoom-in-50"
                >
                  {activeFilterCount}
                </Badge>
              </Button>
            )}
          </FilterBar.Actions>
        </FilterBar>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="p-5 border border-slate-200 bg-slate-50/50 rounded-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                UTİS Kodu
              </label>
              <div className="relative group">
                <Input
                  placeholder="7 rəqəmli kod..."
                  value={utisCode}
                  onChange={(e) => onUtisCodeChange?.(e.target.value)}
                  className="h-10 border-slate-200 bg-white"
                />
                {utisCode && (
                  <button
                    onClick={() => onUtisCodeChange?.("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Müəssisə
              </label>
              <Select
                value={institutionFilter}
                onValueChange={(val) => onInstitutionFilterChange(val)}
              >
                <SelectTrigger className="h-10 border-slate-200 bg-white">
                  <SelectValue placeholder="Müəssisə seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün müəssisələr</SelectItem>
                  {availableInstitutions.map((institution) => (
                    <SelectItem
                      key={institution.id}
                      value={institution.id.toString()}
                    >
                      {institution.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Qeydiyyat Tarixi Aralığı
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartDateChange?.(e.target.value)}
                    className="h-10 border-slate-200 bg-white text-xs"
                  />
                </div>
                <span className="text-slate-400 font-bold">-</span>
                <div className="relative flex-1">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => onEndDateChange?.(e.target.value)}
                    className="h-10 border-slate-200 bg-white text-xs"
                    min={startDate}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

UserFilters.displayName = "UserFilters";
