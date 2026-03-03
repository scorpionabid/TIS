/**
 * Step3Institutions Component
 * Institution targeting with sector grouping and search
 */

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Users, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Institution } from '@/services/institutions';
import { useQuery } from '@tanstack/react-query';
import { institutionService } from '@/services/institutions';
import { useAuth } from '@/contexts/AuthContextOptimized';
import type { StepProps } from '../types';

interface Step3InstitutionsProps extends StepProps {
  open: boolean;
}

export function Step3Institutions({
  formData,
  onChange,
  validation,
  open,
}: Step3InstitutionsProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Determine parent institution filter based on current user's institution level
  const { currentUser } = useAuth();
  const parentInstitutionId = useMemo(() => {
    const inst = currentUser?.institution;
    return inst && inst.level >= 2 ? inst.id : null;
  }, [currentUser]);

  // Load institutions
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions-for-report-tables-l4', parentInstitutionId],
    queryFn: () => institutionService.getAll({
      per_page: 1000,
      ...(parentInstitutionId ? { parent_id: parentInstitutionId } : {}),
    } as Parameters<typeof institutionService.getAll>[0]),
    enabled: open,
  });

  const { data: sectorsResponse } = useQuery({
    queryKey: ['institutions-for-report-tables-l3', parentInstitutionId],
    queryFn: () => institutionService.getAll({
      per_page: 200,
      level: 3,
      ...(parentInstitutionId ? { parent_id: parentInstitutionId } : {}),
    } as Parameters<typeof institutionService.getAll>[0]),
    enabled: open,
  });

  const allInstitutions = useMemo(() => {
    const raw = institutionsResponse?.data ?? [];
    return raw.filter((inst) => (inst as Institution & { level?: number }).level === 4);
  }, [institutionsResponse]);

  const sectorMap = useMemo(() => {
    const raw = sectorsResponse?.data ?? [];
    const map: Record<number, string> = {};
    raw.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [sectorsResponse]);

  // Group institutions by sector with search filtering
  const groupedInstitutions = useMemo(() => {
    const groups: Record<string, Institution[]> = {};
    const q = searchTerm.toLowerCase().trim();
    const list = q
      ? allInstitutions.filter((i) => i.name.toLowerCase().includes(q))
      : allInstitutions;

    list.forEach((inst) => {
      const parentId = (inst as Institution & { parent_id?: number }).parent_id;
      const sectorName = parentId ? (sectorMap[parentId] ?? 'Sektor bilinmir') : 'Digər';
      if (!groups[sectorName]) groups[sectorName] = [];
      groups[sectorName].push(inst);
    });

    return groups;
  }, [allInstitutions, searchTerm, sectorMap]);

  const toggleInstitution = (id: number) => {
    const newSelection = formData.target_institutions.includes(id)
      ? formData.target_institutions.filter((x) => x !== id)
      : [...formData.target_institutions, id];
    onChange('target_institutions', newSelection);
  };

  const toggleSector = (insts: Institution[]) => {
    const ids = insts.map((i) => i.id);
    const allSelected = ids.every((id) => formData.target_institutions.includes(id));
    const newSelection = allSelected
      ? formData.target_institutions.filter((x) => !ids.includes(x))
      : [...new Set([...formData.target_institutions, ...ids])];
    onChange('target_institutions', newSelection);
  };

  const selectAll = () => {
    onChange('target_institutions', allInstitutions.map((i) => i.id));
  };

  const clearAll = () => {
    onChange('target_institutions', []);
  };

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            Seçilib:
            <Badge variant="secondary" className="ml-2">
              {formData.target_institutions.length}
            </Badge>
            {allInstitutions.length > 0 && (
              <span className="text-xs text-gray-400 ml-1">
                / {allInstitutions.length}
              </span>
            )}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Hamısını seç
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll}>
            Sıfırla
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Müəssisə axtar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Institutions List */}
      <div className="max-h-[350px] overflow-y-auto border rounded-lg">
        {Object.keys(groupedInstitutions).length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>Axtarışa uyğun müəssisə tapılmadı</p>
          </div>
        ) : (
          Object.entries(groupedInstitutions)
            .sort(([a], [b]) => a.localeCompare(b, 'az'))
            .map(([sectorName, insts]) => {
              const sectorIds = insts.map((i) => i.id);
              const selectedInSector = sectorIds.filter((id) =>
                formData.target_institutions.includes(id)
              ).length;
              const allSelected = selectedInSector === sectorIds.length;
              const someSelected = selectedInSector > 0;

              return (
                <div key={sectorName}>
                  {/* Sector Header */}
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 border-b sticky top-0 cursor-pointer select-none',
                      someSelected ? 'bg-emerald-50/50' : 'bg-gray-50'
                    )}
                    onClick={() => toggleSector(insts)}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        allSelected
                          ? 'bg-emerald-600 border-emerald-600'
                          : someSelected
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-gray-300'
                      )}
                    >
                      {allSelected && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                      {someSelected && !allSelected && (
                        <div className="w-2 h-0.5 bg-emerald-600" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-gray-600 flex-1">
                      {sectorName}
                    </span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {selectedInSector}/{sectorIds.length}
                    </Badge>
                  </div>

                  {/* Institutions */}
                  <div className="divide-y divide-gray-100">
                    {insts.map((inst) => {
                      const selected = formData.target_institutions.includes(inst.id);
                      return (
                        <label
                          key={inst.id}
                          className={cn(
                            'flex items-center gap-3 px-5 py-2 cursor-pointer text-sm hover:bg-gray-50 transition-colors',
                            selected && 'bg-emerald-50'
                          )}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleInstitution(inst.id)}
                          />
                          <span
                            className={cn(
                              selected ? 'font-medium text-emerald-700' : 'text-gray-700'
                            )}
                          >
                            {inst.name}
                          </span>
                          {searchTerm && inst.name.toLowerCase().includes(searchTerm.toLowerCase()) && (
                            <span className="text-xs text-emerald-600 ml-auto">
                              Axtarışa uyğun
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Quick Stats */}
      {formData.target_institutions.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
          <p className="text-emerald-800">
            <strong>{formData.target_institutions.length}</strong> müəssisə seçilib.
            {' '}
            {formData.target_institutions.length === 0 && 'Heç bir müəssisə seçilməyib.'}
          </p>
        </div>
      )}
    </div>
  );
}
