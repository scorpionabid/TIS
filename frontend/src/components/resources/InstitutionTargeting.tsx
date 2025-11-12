import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Building2, Users, Search, X, Target } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Institution } from "@/services/institutions";

interface InstitutionTargetingProps {
  form: any;
  availableInstitutions: Institution[];
}

export function InstitutionTargeting({
  form,
  availableInstitutions,
}: InstitutionTargetingProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const selectedIds: number[] = form.watch('target_institutions') || [];
  const selectedCount = selectedIds.length;

  const watchedDepartments = form.watch('target_departments') || [];
  const departmentsSelected = Array.isArray(watchedDepartments) && watchedDepartments.length > 0;

  const normalizedInstitutions = useMemo(() => {
    const mapped = (availableInstitutions || []).map((inst: any) => ({
      id: inst.id,
      name: inst.name || '',
      level: inst.level ?? null,
      type: inst.type || inst.institution_type || null,
    }));
    console.log('[InstitutionTargeting] normalizedInstitutions computed', {
      count: mapped.length,
      timestamp: new Date().toISOString(),
    });
    return mapped;
  }, [availableInstitutions]);

  const filteredInstitutions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedInstitutions;
    const query = searchTerm.toLowerCase();
    return normalizedInstitutions.filter((inst) =>
      inst.name.toLowerCase().includes(query)
    );
  }, [normalizedInstitutions, searchTerm]);

  const counts = useMemo(() => ({
    all: normalizedInstitutions.length,
    regional: normalizedInstitutions.filter((inst) => inst.level === 2).length,
    sector: normalizedInstitutions.filter((inst) => inst.level === 3).length,
    schools: normalizedInstitutions.filter((inst) =>
      (inst.level === 4 && inst.name.toLowerCase().includes('məktəb')) ||
      ['secondary_school', 'vocational_school', 'school'].includes((inst.type || '').toLowerCase())
    ).length,
    preschools: normalizedInstitutions.filter((inst) =>
      inst.level === 4 && (
        inst.name.toLowerCase().includes('bağça') ||
        inst.name.toLowerCase().includes('uşaq')
      )
    ).length,
  }), [normalizedInstitutions]);

  const updateSelection = useCallback((ids: number[]) => {
    console.log('[InstitutionTargeting] updateSelection called', {
      nextLength: ids.length,
      idsPreview: ids.slice(0, 5),
      timestamp: new Date().toISOString(),
    });
    form.setValue('target_institutions', ids);
    const primary = ids.length > 0 ? ids[0] : null;
    form.setValue('assigned_institution_id', primary);
    form.setValue('target_institution_id', primary);
  }, [form]);

  const handleSelectAll = useCallback(() => {
    if (departmentsSelected) return;
    console.log('[InstitutionTargeting] handleSelectAll triggered', {
      filteredCount: filteredInstitutions.length,
      timestamp: new Date().toISOString(),
    });
    updateSelection(filteredInstitutions.map((inst) => inst.id));
  }, [departmentsSelected, filteredInstitutions, updateSelection]);

  const handleClear = useCallback(() => {
    updateSelection([]);
  }, [updateSelection]);

  const handleSelectByLevel = useCallback((level: number) => {
    if (departmentsSelected) return;
    console.log('[InstitutionTargeting] handleSelectByLevel', {
      level,
      timestamp: new Date().toISOString(),
    });
    const ids = normalizedInstitutions
      .filter((inst) => inst.level === level)
      .map((inst) => inst.id);
    updateSelection(ids);
  }, [departmentsSelected, normalizedInstitutions, updateSelection]);

  const handleSelectByPredicate = useCallback((predicate: (inst: Institution) => boolean) => {
    if (departmentsSelected) return;
    console.log('[InstitutionTargeting] handleSelectByPredicate triggered', {
      timestamp: new Date().toISOString(),
    });
    const ids = normalizedInstitutions
      .filter(predicate)
      .map((inst) => inst.id);
    updateSelection(ids);
  }, [departmentsSelected, normalizedInstitutions, updateSelection]);

  const toggleInstitution = useCallback((institutionId: number, nextSelected?: boolean) => {
    if (departmentsSelected) return;
    console.log('[InstitutionTargeting] toggleInstitution', {
      institutionId,
      wasSelected: selectedIds.includes(institutionId),
      nextSelected,
      timestamp: new Date().toISOString(),
    });
    const current = new Set(selectedIds);
    const currentlySelected = current.has(institutionId);
    const shouldSelect = typeof nextSelected === 'boolean' ? nextSelected : !currentlySelected;

    if (shouldSelect === currentlySelected) {
      console.log('[InstitutionTargeting] toggleInstitution no-op (state already matches)', {
        institutionId,
        currentlySelected,
        shouldSelect,
      });
      return;
    }

    if (shouldSelect) {
      current.add(institutionId);
    } else {
      current.delete(institutionId);
    }

    updateSelection(Array.from(current));
  }, [departmentsSelected, selectedIds, updateSelection]);

  useEffect(() => {
    if (departmentsSelected && selectedIds.length > 0) {
      console.log('[InstitutionTargeting] departments selected, clearing institutions', {
        selectedLength: selectedIds.length,
        timestamp: new Date().toISOString(),
      });
      updateSelection([]);
    }
  }, [departmentsSelected, selectedIds.length, updateSelection]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-500" />
          Müəssisələri seçin
        </Label>
        {selectedCount > 0 && (
          <Badge variant="secondary" className="text-sm">
            {selectedCount} seçildi
          </Badge>
        )}
      </div>

      <div className="relative">
        <Input
          type="text"
          placeholder="Müəssisə adı ilə axtar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          disabled={departmentsSelected}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label="Axtarışı təmizlə"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {departmentsSelected && (
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          ⚠️ Departament seçildiyi üçün müəssisə seçimi müvəqqəti deaktiv edilib.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          disabled={departmentsSelected || filteredInstitutions.length === 0}
        >
          <Users className="h-4 w-4 mr-1" />
          {searchTerm
            ? `Görünənləri seç (${filteredInstitutions.length})`
            : `Hamısını seç (${counts.all})`
          }
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={selectedCount === 0}
        >
          <X className="h-4 w-4 mr-1" />
          Seçimi ləğv et
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleSelectByLevel(2)}
          disabled={departmentsSelected || counts.regional === 0}
        >
          <Building2 className="h-4 w-4 mr-1" />
          Regional ({counts.regional})
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleSelectByLevel(3)}
          disabled={departmentsSelected || counts.sector === 0}
        >
          <Target className="h-4 w-4 mr-1" />
          Sektor ({counts.sector})
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            handleSelectByPredicate((inst: Institution) => {
              const type = (inst.type || '').toLowerCase();
              return (
                ['secondary_school', 'vocational_school', 'school'].includes(type) ||
                (inst.level === 4 && inst.name.toLowerCase().includes('məktəb'))
              );
            })
          }
          disabled={departmentsSelected || counts.schools === 0}
        >
          <Building2 className="h-4 w-4 mr-1" />
          Məktəb ({counts.schools})
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            handleSelectByPredicate((inst: Institution) =>
              inst.level === 4 && (
                inst.name.toLowerCase().includes('bağça') ||
                inst.name.toLowerCase().includes('uşaq')
              )
            )
          }
          disabled={departmentsSelected || counts.preschools === 0}
        >
          <Users className="h-4 w-4 mr-1" />
          Məktəbəqədər ({counts.preschools})
        </Button>
      </div>

      <div className="border rounded-lg max-h-60 overflow-y-auto">
        {filteredInstitutions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchTerm ? 'Axtarış nəticəsində müəssisə tapılmadı' : 'Müəssisə mövcud deyil'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredInstitutions.map((institution) => {
              const isSelected = selectedIds.includes(institution.id);
              return (
                <div
                  key={institution.id}
                  className={`flex items-center space-x-3 p-3 hover:bg-muted/40 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => toggleInstitution(institution.id)}
                >
                  <div
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(next) => toggleInstitution(institution.id, next === true)}
                      disabled={departmentsSelected}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {institution.name}
                      </span>
                      {institution.level && (
                        <Badge variant="outline" className="text-xs">
                          L{institution.level}
                        </Badge>
                      )}
                    </div>
                    {institution.type && (
                      <span className="text-xs text-muted-foreground">
                        {institution.type}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-2">
            Seçilmiş müəssisələr ({selectedCount})
          </p>
          <div className="flex flex-wrap gap-1">
            {normalizedInstitutions
              .filter((inst) => selectedIds.includes(inst.id))
              .slice(0, 5)
              .map((inst) => (
                <Badge key={inst.id} variant="secondary" className="text-xs">
                  {inst.name}
                </Badge>
              ))}
            {selectedCount > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{selectedCount - 5} daha
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
