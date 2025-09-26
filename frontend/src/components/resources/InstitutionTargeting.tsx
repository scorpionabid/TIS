import React from 'react';
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
  filteredInstitutions: Institution[];
  institutionSearch: string;
  setInstitutionSearch: (value: string) => void;
  selectInstitutionsByLevel: (level: number) => void;
  selectInstitutionsByType: (filterFn: (inst: any) => boolean) => void;
}

export function InstitutionTargeting({
  form,
  availableInstitutions,
  filteredInstitutions,
  institutionSearch,
  setInstitutionSearch,
  selectInstitutionsByLevel,
  selectInstitutionsByType,
}: InstitutionTargetingProps) {
  return (
    <div className="border-t pt-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Hədəf müəssisələr</Label>

          {/* Search Input */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Müəssisə adı ilə axtar..."
              value={institutionSearch}
              onChange={(e) => setInstitutionSearch(e.target.value)}
              className="pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Enhanced Bulk Selection Buttons */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const filteredIds = filteredInstitutions.map((inst: any) => inst.id);
                  form.setValue('target_institutions', filteredIds);
                }}
              >
                <Users className="h-4 w-4 mr-1" />
                {institutionSearch
                  ? `Görünənləri seç (${filteredInstitutions.length})`
                  : `Hamısını seç (${availableInstitutions.length})`
                }
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => form.setValue('target_institutions', [])}
              >
                <X className="h-4 w-4 mr-1" />
                Hamısını ləğv et
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectInstitutionsByLevel(2)}
              >
                <Building2 className="h-4 w-4 mr-1" />
                Regional idarələr ({availableInstitutions.filter((inst: any) => inst.level === 2).length})
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectInstitutionsByLevel(3)}
              >
                <Target className="h-4 w-4 mr-1" />
                Sektorlar ({availableInstitutions.filter((inst: any) => inst.level === 3).length})
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectInstitutionsByType((inst: any) => {
                  const isSchoolType = ['secondary_school', 'vocational_school'].includes(inst.type);
                  const isSchoolByName = inst.level === 4 && inst.name?.toLowerCase().includes('məktəb');
                  return isSchoolType || isSchoolByName;
                })}
              >
                <Building2 className="h-4 w-4 mr-1" />
                Məktəblər ({availableInstitutions.filter((inst: any) => {
                  const isSchoolType = ['secondary_school', 'vocational_school'].includes(inst.type);
                  const isSchoolByName = inst.level === 4 && inst.name?.toLowerCase().includes('məktəb');
                  return isSchoolType || isSchoolByName;
                }).length})
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectInstitutionsByType((inst: any) =>
                  inst.level === 4 && (inst.name.toLowerCase().includes('bağça') || inst.name.toLowerCase().includes('uşaq'))
                )}
              >
                <Users className="h-4 w-4 mr-1" />
                Məktəbəqədər
              </Button>
            </div>
          </div>

          <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
            {filteredInstitutions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2" />
                <p>Axtarış nəticəsində müəssisə tapılmadı</p>
              </div>
            ) : (
              filteredInstitutions.map((institution: any) => (
                <div key={institution.id} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`institution-${institution.id}`}
                    checked={
                      (form.watch('target_institutions') || []).some(id => String(id) === String(institution.id))
                    }
                    onCheckedChange={(checked) => {
                      const currentTargets = form.watch('target_institutions') || [];
                      const institutionId = institution.id;

                      if (checked) {
                        if (!currentTargets.some(id => String(id) === String(institutionId))) {
                          form.setValue('target_institutions', [...currentTargets, institutionId]);
                        }
                      } else {
                        form.setValue('target_institutions',
                          currentTargets.filter(id => String(id) !== String(institutionId))
                        );
                      }
                    }}
                  />
                  <Label
                    htmlFor={`institution-${institution.id}`}
                    className="text-sm font-normal cursor-pointer flex items-center gap-2"
                  >
                    <span>{institution.name}</span>
                    {institution.level && (
                      <Badge variant="outline" className="text-xs">
                        Səviyyə {institution.level}
                      </Badge>
                    )}
                  </Label>
                </div>
              ))
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {(form.watch('target_institutions') || []).length} müəssisə seçilib
          </p>
        </div>
      </div>
    </div>
  );
}