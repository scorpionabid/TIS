import React, { useState, useMemo } from 'react';
import { Filter, X, Building2, Tag, CheckCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export interface MinimalistFilters {
  institution_ids?: number[];
  link_type?: string;
  status?: string;
}

interface LinkFilterPanelMinimalistProps {
  filters: MinimalistFilters;
  onFiltersChange: (filters: MinimalistFilters) => void;
  availableInstitutions?: Array<{ id: number; name: string }>;
  isOpen: boolean;
  onToggle: () => void;
}

export function LinkFilterPanelMinimalist({
  filters,
  onFiltersChange,
  availableInstitutions = [],
  isOpen,
  onToggle,
}: LinkFilterPanelMinimalistProps) {
  const [institutionSearch, setInstitutionSearch] = useState('');

  const filteredInstitutions = useMemo(() => {
    const query = institutionSearch.toLowerCase().trim();
    if (!query) return availableInstitutions;
    return availableInstitutions.filter(inst =>
      inst.name.toLowerCase().includes(query)
    );
  }, [availableInstitutions, institutionSearch]);

  const updateFilter = <K extends keyof MinimalistFilters>(
    key: K,
    value: MinimalistFilters[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' || value === '' ? undefined : value,
    });
  };

  const toggleInstitution = (institutionId: number) => {
    const current = filters.institution_ids || [];
    const updated = current.includes(institutionId)
      ? current.filter(id => id !== institutionId)
      : [...current, institutionId];

    updateFilter('institution_ids', updated.length > 0 ? updated : undefined);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    setInstitutionSearch('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.institution_ids && filters.institution_ids.length > 0) count++;
    if (filters.link_type) count++;
    if (filters.status) count++;
    return count;
  }, [filters]);

  if (!isOpen) {
    return (
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={onToggle}
          className="w-full justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filtr</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-500">Göstər</span>
        </Button>
      </div>
    );
  }

  const selectedInstitutionNames = useMemo(() => {
    if (!filters.institution_ids || filters.institution_ids.length === 0) return [];
    return availableInstitutions
      .filter(inst => filters.institution_ids!.includes(inst.id))
      .map(inst => inst.name);
  }, [filters.institution_ids, availableInstitutions]);

  return (
    <div className="mb-4 border rounded-lg p-4 bg-white shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-gray-900">Filtr</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {activeFilterCount} aktiv
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Təmizlə
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-gray-600"
          >
            Gizlət
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Institution Multi-Select */}
        {availableInstitutions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Müəssisə
            </Label>

            {/* Search */}
            <Input
              placeholder="Müəssisə adı ilə axtar..."
              value={institutionSearch}
              onChange={(e) => setInstitutionSearch(e.target.value)}
              className="h-9"
            />

            {/* Institution List */}
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
              {filteredInstitutions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  Heç nə tapılmadı
                </p>
              ) : (
                filteredInstitutions.map((inst) => (
                  <label
                    key={inst.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={filters.institution_ids?.includes(inst.id) || false}
                      onCheckedChange={() => toggleInstitution(inst.id)}
                    />
                    <span className="text-sm">{inst.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* Link Type & Status - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Link Type */}
          <div>
            <Label htmlFor="filter-link-type" className="text-sm font-medium flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-primary" />
              Link Növü
            </Label>
            <Select
              value={filters.link_type || 'all'}
              onValueChange={(val) => updateFilter('link_type', val)}
            >
              <SelectTrigger id="filter-link-type" className="h-9">
                <SelectValue placeholder="Hamısı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                <SelectItem value="external">Xarici Link</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="document">Sənəd</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="filter-status" className="text-sm font-medium flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Status
            </Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(val) => updateFilter('status', val)}
            >
              <SelectTrigger id="filter-status" className="h-9">
                <SelectValue placeholder="Hamısı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="expired">Müddəti bitmiş</SelectItem>
                <SelectItem value="disabled">Deaktiv</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="pt-3 border-t space-y-2">
          <Label className="text-xs text-gray-600 font-medium">Aktiv filtrlər:</Label>
          <div className="flex flex-wrap gap-2">
            {filters.institution_ids && filters.institution_ids.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedInstitutionNames.slice(0, 3).map((name, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    {name.length > 30 ? name.substring(0, 30) + '...' : name}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer hover:text-blue-900"
                      onClick={() => {
                        const id = availableInstitutions.find(i => i.name === name)?.id;
                        if (id) toggleInstitution(id);
                      }}
                    />
                  </Badge>
                ))}
                {selectedInstitutionNames.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedInstitutionNames.length - 3} daha
                  </Badge>
                )}
              </div>
            )}

            {filters.link_type && (
              <Badge
                variant="secondary"
                className="text-xs bg-green-50 text-green-700 border border-green-200"
              >
                Növ: {filters.link_type}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer hover:text-green-900"
                  onClick={() => updateFilter('link_type', undefined)}
                />
              </Badge>
            )}

            {filters.status && (
              <Badge
                variant="secondary"
                className="text-xs bg-amber-50 text-amber-700 border border-amber-200"
              >
                Status: {filters.status}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer hover:text-amber-900"
                  onClick={() => updateFilter('status', undefined)}
                />
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
