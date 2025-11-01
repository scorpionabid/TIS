import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface InstitutionFiltersProps {
  // Filter values
  selectedType: string;
  searchQuery: string;
  statusFilter: string;
  levelFilter: string;
  parentFilter: string;
  deletedFilter: string;
  sortField: string;
  sortDirection: string;
  showFilters: boolean;

  // Available options
  availableTypes: Array<{
    key: string;
    label: string;
    level: number;
    color: string;
    icon: string;
  }>;
  parentInstitutions?: {
    regions: any[];
    sectors: any[];
  };

  // Event handlers
  onTypeChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onLevelFilterChange: (value: string) => void;
  onParentFilterChange: (value: string) => void;
  onDeletedFilterChange: (value: string) => void;
  onSortFieldChange: (value: string) => void;
  onSortDirectionChange: (value: string) => void;
  onToggleFilters: () => void;
  onResetFilters: () => void;

  // User permissions
  isSuperAdmin: boolean;
  isRegionAdmin: boolean;
}

export const InstitutionFilters: React.FC<InstitutionFiltersProps> = ({
  selectedType,
  searchQuery,
  statusFilter,
  levelFilter,
  parentFilter,
  deletedFilter,
  sortField,
  sortDirection,
  showFilters,
  availableTypes,
  parentInstitutions,
  onTypeChange,
  onSearchChange,
  onStatusFilterChange,
  onLevelFilterChange,
  onParentFilterChange,
  onDeletedFilterChange,
  onSortFieldChange,
  onSortDirectionChange,
  onToggleFilters,
  onResetFilters,
  isSuperAdmin,
  isRegionAdmin,
}) => {
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || levelFilter !== 'all' ||
    parentFilter !== 'all' || deletedFilter !== 'active' || sortField !== 'name' || sortDirection !== 'asc';

  const regionOptions: Array<{ id?: number | string; name?: string }> = Array.isArray(parentInstitutions?.regions)
    ? parentInstitutions?.regions ?? []
    : parentInstitutions?.regions && typeof parentInstitutions.regions === 'object'
      ? Object.values(parentInstitutions.regions)
      : [];

  const sectorOptions: Array<{ id?: number | string; name?: string }> = Array.isArray(parentInstitutions?.sectors)
    ? parentInstitutions?.sectors ?? []
    : parentInstitutions?.sectors && typeof parentInstitutions.sectors === 'object'
      ? Object.values(parentInstitutions.sectors)
      : [];

  const toOptionValue = (value: number | string | undefined): string | undefined => {
    if (value === undefined || value === null) {
      return undefined;
    }
    return typeof value === 'string' ? value : value.toString();
  };

  return (
    <div className="space-y-4">
      {/* Main search and type filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Müəssisə adı ilə axtarın..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedType} onValueChange={onTypeChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Müəssisə növü" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün növlər</SelectItem>
            {availableTypes.map((type) => (
              <SelectItem key={type.key} value={type.key}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          onClick={onToggleFilters}
          className="w-full sm:w-auto"
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Filterləri gizlə' : 'Filterlər'}
          {hasActiveFilters && (
            <span className="ml-2 h-2 w-2 bg-blue-500 rounded-full"></span>
          )}
        </Button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Deleted Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select value={deletedFilter} onValueChange={onDeletedFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">✅ Aktiv müəssisələr</SelectItem>
                    <SelectItem value="with_deleted">📋 Aktiv + Arxivlənmiş</SelectItem>
                    <SelectItem value="only_deleted">🗑️ Yalnız Arxivlənmiş</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active Status Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Aktivlik</label>
                <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aktivlik seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Bütün aktivliklər</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Deaktiv</SelectItem>
                    <SelectItem value="pending">Gözləyən</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Level Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Səviyyə</label>
                <Select value={levelFilter} onValueChange={onLevelFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Səviyyə seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Bütün səviyyələr</SelectItem>
                    <SelectItem value="1">1 - Nazirlik</SelectItem>
                    <SelectItem value="2">2 - Regional</SelectItem>
                    <SelectItem value="3">3 - Sektor</SelectItem>
                    <SelectItem value="4">4 - Məktəb</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Parent Institution Filter */}
              {(isSuperAdmin || isRegionAdmin) && parentInstitutions && (
                <div>
                  <label className="block text-sm font-medium mb-2">Ana müəssisə</label>
                  <Select value={parentFilter} onValueChange={onParentFilterChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ana müəssisə seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün ana müəssisələr</SelectItem>
                      {regionOptions
                        .map((region) => ({
                          id: toOptionValue(region?.id),
                          name: region?.name ?? 'Naməlum',
                        }))
                        .filter((region) => region.id)
                        .map((region) => (
                          <SelectItem key={region.id} value={region.id!}>
                          📍 {region.name}
                        </SelectItem>
                      ))}
                      {sectorOptions
                        .map((sector) => ({
                          id: toOptionValue(sector?.id),
                          name: sector?.name ?? 'Naməlum',
                        }))
                        .filter((sector) => sector.id)
                        .map((sector) => (
                          <SelectItem key={sector.id} value={sector.id!}>
                          🏢 {sector.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sort Field */}
              <div>
                <label className="block text-sm font-medium mb-2">Sıralama</label>
                <div className="flex gap-2">
                  <Select value={sortField} onValueChange={onSortFieldChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Ad</SelectItem>
                      <SelectItem value="level">Səviyyə</SelectItem>
                      <SelectItem value="created_at">Yaradılma tarixi</SelectItem>
                      <SelectItem value="updated_at">Yenilənmə tarixi</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortDirection} onValueChange={onSortDirectionChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">↑</SelectItem>
                      <SelectItem value="desc">↓</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Reset filters button */}
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t">
                <Button 
                  variant="ghost" 
                  onClick={onResetFilters}
                  className="h-8 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Filterləri təmizlə
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
