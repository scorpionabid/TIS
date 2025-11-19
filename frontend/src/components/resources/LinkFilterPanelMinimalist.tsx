import React from 'react';
import { Filter, Building2, Tag, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LinkFilters } from './LinkFilterPanel';

interface LinkFilterPanelMinimalistProps {
  filters: LinkFilters;
  onFiltersChange: (filters: LinkFilters) => void;
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
  const [institutionSearch, setInstitutionSearch] = React.useState('');

  const updateFilter = (key: keyof LinkFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value,
    });
  };

  const toggleInstitution = (institutionId: number) => {
    const current = filters.institution_ids || [];
    const next = current.includes(institutionId)
      ? current.filter((id) => id !== institutionId)
      : [...current, institutionId];
    onFiltersChange({
      ...filters,
      institution_ids: next.length > 0 ? next : undefined,
    });
  };

  const clearAll = () => {
    onFiltersChange({});
    setInstitutionSearch('');
  };

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.institution_ids && filters.institution_ids.length > 0) count += 1;
    if (filters.link_type) count += 1;
    if (filters.status) count += 1;
    return count;
  }, [filters.institution_ids, filters.link_type, filters.status]);

  const filteredInstitutions = React.useMemo(() => {
    if (!institutionSearch.trim()) {
      return availableInstitutions;
    }
    const query = institutionSearch.toLowerCase();
    return availableInstitutions.filter((inst) =>
      inst.name.toLowerCase().includes(query)
    );
  }, [availableInstitutions, institutionSearch]);

  const selectedInstitutions = React.useMemo(() => {
    if (!filters.institution_ids || filters.institution_ids.length === 0) {
      return [];
    }
    return filters.institution_ids.map((id) => {
      const match = availableInstitutions.find((inst) => inst.id === id);
      return {
        id,
        name: match?.name || `Müəssisə #${id}`,
      };
    });
  }, [filters.institution_ids, availableInstitutions]);

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
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-500">Göstər</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4 border rounded-lg p-4 bg-white shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Filtr</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount} aktiv</Badge>
          )}
        </div>
        <div className="flex gap-2">
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="h-4 w-4 mr-1" />
              Təmizlə
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onToggle}>
            Gizlət
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {availableInstitutions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Müəssisə
            </Label>
            <Input
              placeholder="Müəssisə adı ilə axtar..."
              value={institutionSearch}
              onChange={(e) => setInstitutionSearch(e.target.value)}
              className="h-9"
            />
            <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
              {filteredInstitutions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Heç nə tapılmadı
                </p>
              ) : (
                filteredInstitutions.map((inst) => (
                  <label
                    key={inst.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-primary" />
              Link Növü
            </Label>
            <Select
              value={filters.link_type || 'all'}
              onValueChange={(val) => updateFilter('link_type', val)}
            >
              <SelectTrigger className="h-9">
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

          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Status
            </Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(val) => updateFilter('status', val)}
            >
              <SelectTrigger className="h-9">
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

      {activeFilterCount > 0 && (
        <div className="pt-3 border-t">
          <Label className="text-xs text-gray-600 mb-2 block">Aktiv filtrlər:</Label>
          <div className="flex flex-wrap gap-2">
            {selectedInstitutions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedInstitutions.slice(0, 3).map((inst) => (
                  <Badge
                    key={inst.id}
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    {inst.name}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => toggleInstitution(inst.id)}
                    />
                  </Badge>
                ))}
                {selectedInstitutions.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedInstitutions.length - 3} daha
                  </Badge>
                )}
              </div>
            )}
            {filters.link_type && (
              <Badge variant="secondary" className="bg-green-50 text-green-700 border border-green-200">
                Növ: {filters.link_type}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('link_type', undefined)}
                />
              </Badge>
            )}
            {filters.status && (
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border border-amber-200">
                Status: {filters.status}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
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
