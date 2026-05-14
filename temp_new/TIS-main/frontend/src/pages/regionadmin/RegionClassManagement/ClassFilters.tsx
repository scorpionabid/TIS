import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Search, X, Trash2 } from "lucide-react";

interface FilterInstitution {
  id: number;
  name: string;
  utis_code?: string;
}

interface FilterAcademicYear {
  id: number;
  year: string;
  is_current: boolean;
}

interface RegionOption {
  id: number;
  name: string;
}

interface ClassFiltersProps {
  // Filter values
  searchTerm: string;
  institutionFilter: string;
  classLevelFilter: string;
  academicYearFilter: string;
  statusFilter: string;
  // Region (SuperAdmin only)
  isSuperAdmin: boolean;
  selectedRegionId: number | null;
  regionOptions: RegionOption[];
  regionsLoading: boolean;
  // Filter dropdown options
  institutions: FilterInstitution[] | undefined;
  academicYears: FilterAcademicYear[] | undefined;
  // Selection bar
  selectedClassCount: number;
  // Derived
  hasActiveFilters: boolean;
  activeFilterCount: number;
  // Event handlers
  onSearchChange: (value: string) => void;
  onInstitutionFilterChange: (value: string) => void;
  onClassLevelFilterChange: (value: string) => void;
  onAcademicYearFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onRegionChange: (id: number | null) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  onImport: () => void;
  onExport: () => void;
}

export const ClassFilters = ({
  searchTerm,
  institutionFilter,
  classLevelFilter,
  academicYearFilter,
  statusFilter,
  isSuperAdmin,
  selectedRegionId,
  regionOptions,
  regionsLoading,
  institutions,
  academicYears,
  selectedClassCount,
  hasActiveFilters,
  activeFilterCount,
  onSearchChange,
  onInstitutionFilterChange,
  onClassLevelFilterChange,
  onAcademicYearFilterChange,
  onStatusFilterChange,
  onClearFilters,
  onRegionChange,
  onBulkDelete,
  onClearSelection,
  onImport,
  onExport,
}: ClassFiltersProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onImport}
              className="gap-2"
              disabled={isSuperAdmin}
              title={
                isSuperAdmin
                  ? "Superadmin üçün idxal deaktivdir"
                  : undefined
              }
            >
              <Upload className="h-4 w-4" />
              İdxal Et
            </Button>
            <Button variant="outline" onClick={onExport} className="gap-2">
              <Download className="h-4 w-4" />
              İxrac Et
            </Button>
          </div>

          {/* Bulk selection bar */}
          {selectedClassCount > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <span className="text-sm font-medium">
                {selectedClassCount} sinif seçildi
              </span>
              <Button
                size="sm"
                variant="destructive"
                className="gap-2"
                onClick={onBulkDelete}
              >
                <Trash2 className="h-4 w-4" />
                Seçilənləri Sil
              </Button>
              <Button size="sm" variant="ghost" onClick={onClearSelection}>
                Seçimi sıfırla
              </Button>
            </div>
          )}

          {/* Active Filters Info */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              <span className="font-medium">
                Aktiv filtrlər ({activeFilterCount}):
              </span>
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1">
                    Axtarış: {searchTerm}
                  </Badge>
                )}
                {institutionFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Müəssisə:{" "}
                    {
                      institutions?.find(
                        (i) => i.id.toString() === institutionFilter,
                      )?.name
                    }
                  </Badge>
                )}
                {classLevelFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {classLevelFilter}-ci sinif
                  </Badge>
                )}
                {academicYearFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {
                      academicYears?.find(
                        (y) => y.id.toString() === academicYearFilter,
                      )?.year
                    }
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {statusFilter === "active" ? "Aktiv" : "Passiv"}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Region selector (SuperAdmin only) */}
            {isSuperAdmin && (
              <div className="w-[260px]">
                <Select
                  value={
                    selectedRegionId ? selectedRegionId.toString() : ""
                  }
                  onValueChange={(value) => {
                    const parsedValue = value ? Number(value) : null;
                    onRegionChange(
                      parsedValue && !Number.isNaN(parsedValue)
                        ? parsedValue
                        : null,
                    );
                  }}
                  disabled={regionsLoading || regionOptions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        regionsLoading
                          ? "Regionlar yüklənir..."
                          : "Region seç"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {regionOptions.length === 0 ? (
                      <SelectItem value="no-region" disabled>
                        Region tapılmadı
                      </SelectItem>
                    ) : (
                      regionOptions.map((region) => (
                        <SelectItem
                          key={region.id}
                          value={region.id.toString()}
                        >
                          {region.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Search */}
            <div className="relative min-w-[300px] flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Sinif adı, müəssisə, UTIS kodu ilə axtar..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Institution Filter */}
            <Select
              value={institutionFilter}
              onValueChange={onInstitutionFilterChange}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Müəssisə seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün müəssisələr</SelectItem>
                {institutions?.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id.toString()}>
                    {inst.name}
                    {inst.utis_code && ` (${inst.utis_code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Class Level Filter */}
            <Select
              value={classLevelFilter}
              onValueChange={onClassLevelFilterChange}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sinif səviyyəsi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün səviyyələr</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((level) => (
                  <SelectItem key={level} value={level.toString()}>
                    {level}-ci sinif
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Academic Year Filter */}
            <Select
              value={academicYearFilter}
              onValueChange={onAcademicYearFilterChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tədris ili seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün tədris illəri</SelectItem>
                {academicYears?.map((year) => (
                  <SelectItem key={year.id} value={year.id.toString()}>
                    {year.year}
                    {year.is_current && " (Cari)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={onStatusFilterChange}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Passiv</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
                Filtrlər Təmizlə
                {activeFilterCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 px-1.5 py-0 text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
