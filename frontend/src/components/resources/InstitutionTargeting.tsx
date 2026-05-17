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

const EMPTY_INSTITUTION_IDS: number[] = [];

export function InstitutionTargeting({
  form,
  availableInstitutions,
}: InstitutionTargetingProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const watchedInstitutionIds = form.watch('target_institutions');
  const selectedIds: number[] = useMemo(() => {
    if (Array.isArray(watchedInstitutionIds)) {
      return watchedInstitutionIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));
    }
    return EMPTY_INSTITUTION_IDS;
  }, [watchedInstitutionIds]);
  const selectedCount = selectedIds.length;


  const normalizedInstitutions = useMemo(() => {
    return (availableInstitutions || []).map((inst: any) => ({
      id: inst.id,
      name: inst.name || '',
      level: inst.level ?? null,
      type: inst.type || inst.institution_type || null,
    }));
  }, [availableInstitutions]);

  const filteredInstitutions = useMemo(() => {
    const list = searchTerm.trim()
      ? normalizedInstitutions.filter(inst => inst.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : [...normalizedInstitutions];
    // Seçilmişlər yuxarıda
    list.sort((a, b) => {
      const aSelected = selectedIds.includes(a.id) ? 0 : 1;
      const bSelected = selectedIds.includes(b.id) ? 0 : 1;
      return aSelected - bSelected;
    });
    return list;
  }, [normalizedInstitutions, searchTerm, selectedIds]);

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
    console.log('[InstitutionTargeting] handleSelectAll triggered', {
      filteredCount: filteredInstitutions.length,
      timestamp: new Date().toISOString(),
    });
    updateSelection(filteredInstitutions.map((inst) => inst.id));
  }, [filteredInstitutions, updateSelection]);

  const handleClear = useCallback(() => {
    updateSelection([]);
  }, [updateSelection]);

  const handleSelectByLevel = useCallback((level: number) => {
    console.log('[InstitutionTargeting] handleSelectByLevel', {
      level,
      timestamp: new Date().toISOString(),
    });
    const ids = normalizedInstitutions
      .filter((inst) => inst.level === level)
      .map((inst) => inst.id);
    updateSelection(ids);
  }, [normalizedInstitutions, updateSelection]);

  const handleSelectByPredicate = useCallback((predicate: (inst: Institution) => boolean) => {
    console.log('[InstitutionTargeting] handleSelectByPredicate triggered', {
      timestamp: new Date().toISOString(),
    });
    const ids = normalizedInstitutions
      .filter(predicate)
      .map((inst) => inst.id);
    updateSelection(ids);
  }, [normalizedInstitutions, updateSelection]);

  const toggleInstitution = useCallback((institutionId: number, nextSelected?: boolean) => {
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
  }, [selectedIds, updateSelection]);

  const selectedInstitutions = useMemo(() =>
    normalizedInstitutions.filter(inst => selectedIds.includes(inst.id)),
    [normalizedInstitutions, selectedIds]
  );

  const CHIP_LIMIT = 5;

  return (
    <div className="space-y-3">
      {/* Selected strip — institutions yüklənməsə də count dərhal görünür */}
      <div className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl min-h-[44px] transition-colors ${
        selectedCount > 0 ? 'bg-blue-50/60 border-blue-200' : 'bg-muted/30 border-border/50'
      }`}>
        <div className="flex items-center gap-1.5 shrink-0">
          <Building2 className={`h-3.5 w-3.5 ${selectedCount > 0 ? 'text-blue-600' : 'text-muted-foreground'}`} />
          <span className={`text-xs font-semibold ${selectedCount > 0 ? 'text-blue-700' : 'text-muted-foreground'}`}>
            {selectedCount > 0 ? `${selectedCount} müəssisə seçilib` : 'Seçilməyib'}
          </span>
        </div>
        {selectedCount > 0 && (
          <>
            <div className="flex-1 flex items-center gap-1 flex-wrap min-w-0">
              {selectedInstitutions.length > 0
                ? selectedInstitutions.slice(0, CHIP_LIMIT).map(inst => (
                    <span key={inst.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-blue-700 text-[11px] font-medium border border-blue-200 max-w-[180px] shadow-sm">
                      <span className="truncate">{inst.name}</span>
                      <button type="button" onClick={() => toggleInstitution(inst.id, false)}
                        className="shrink-0 text-blue-400 hover:text-blue-700">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                : (
                  // Institutions hələ yüklənmir — sadəcə count göstər
                  <span className="text-[11px] text-blue-600 italic">Yüklənir...</span>
                )
              }
              {selectedInstitutions.length > CHIP_LIMIT && (
                <span className="text-[11px] text-blue-600 font-medium">
                  +{selectedCount - CHIP_LIMIT} daha
                </span>
              )}
            </div>
            <button type="button" onClick={handleClear}
              className="shrink-0 text-[11px] text-blue-600/70 hover:text-red-600 transition-colors whitespace-nowrap">
              Hamısını sil
            </button>
          </>
        )}
      </div>

      <div className="relative">
        <Input
          type="text"
          placeholder="Müəssisə adı ilə axtar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
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

      {/* Action + quick-select — 1 sətir */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={handleSelectAll}
          disabled={filteredInstitutions.length === 0}
          className="h-7 inline-flex items-center gap-1 px-2.5 rounded-full text-[11px] font-semibold border bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Users className="h-3 w-3" />
          {searchTerm ? `Görünənləri seç (${filteredInstitutions.length})` : `Hamısını seç (${counts.all})`}
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={selectedCount === 0}
          className="h-7 inline-flex items-center gap-1 px-2.5 rounded-full text-[11px] font-semibold border border-gray-200 bg-white text-gray-500 hover:border-red-300 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <X className="h-3 w-3" />
          Seçimi ləğv et
        </button>

        <div className="w-px h-4 bg-gray-200 mx-0.5" />

        {[
          { label: `Regional (${counts.regional})`,     icon: Building2, disabled: counts.regional === 0,  onClick: () => handleSelectByLevel(2) },
          { label: `Sektor (${counts.sector})`,         icon: Target,    disabled: counts.sector === 0,    onClick: () => handleSelectByLevel(3) },
          { label: `Məktəb (${counts.schools})`,        icon: Building2, disabled: counts.schools === 0,   onClick: () => handleSelectByPredicate((inst: Institution) => { const t = (inst.type||'').toLowerCase(); return ['secondary_school','vocational_school','school'].includes(t)||(inst.level===4&&inst.name.toLowerCase().includes('məktəb')); }) },
          { label: `Məktəbəqədər (${counts.preschools})`, icon: Users,   disabled: counts.preschools === 0, onClick: () => handleSelectByPredicate((inst: Institution) => inst.level===4&&(inst.name.toLowerCase().includes('bağça')||inst.name.toLowerCase().includes('uşaq'))) },
        ].map(({ label, icon: Icon, disabled, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="h-7 inline-flex items-center gap-1 px-2.5 rounded-full text-[11px] font-semibold border border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
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
