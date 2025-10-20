import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, X, Building2, Target } from 'lucide-react';

interface Institution {
  id: number;
  name: string;
  level?: number;
  type?: string;
}

interface Step3TargetingProps {
  formData: {
    target_institutions: number[] | undefined;
    max_responses: number | null | undefined;
  };
  institutionSearch: string;
  availableInstitutions: Institution[];
  filteredInstitutions: Institution[];
  setInstitutionSearch: (value: string) => void;
  handleInputChange: (field: string, value: any) => void;
  selectInstitutionsByLevel: (level: number) => void;
  selectInstitutionsByType: (predicate: (inst: Institution) => boolean) => void;
}

export function Step3Targeting({
  formData,
  institutionSearch,
  availableInstitutions,
  filteredInstitutions,
  setInstitutionSearch,
  handleInputChange,
  selectInstitutionsByLevel,
  selectInstitutionsByType,
}: Step3TargetingProps) {
  return (
    <div className="space-y-4">
      {/* Target Institutions */}
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
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Enhanced Bulk Selection Buttons */}
        <div className="space-y-2">
          {/* Select All / Clear All */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const filteredIds = filteredInstitutions.map((inst) => inst.id);
                handleInputChange('target_institutions', filteredIds);
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
              onClick={() => handleInputChange('target_institutions', [])}
            >
              <X className="h-4 w-4 mr-1" />
              Hamısını ləğv et
            </Button>
          </div>

          {/* Select by Level/Type */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectInstitutionsByLevel(2)}
            >
              <Building2 className="h-4 w-4 mr-1" />
              Regional idarələr ({availableInstitutions.filter((inst) => inst.level === 2).length})
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectInstitutionsByLevel(3)}
            >
              <Target className="h-4 w-4 mr-1" />
              Sektorlar ({availableInstitutions.filter((inst) => inst.level === 3).length})
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectInstitutionsByType((inst) => {
                const isSchoolType = ['secondary_school', 'vocational_school'].includes(inst.type || '');
                const isSchoolByName = inst.level === 4 && inst.name?.toLowerCase().includes('məktəb');
                return isSchoolType || isSchoolByName;
              })}
            >
              <Building2 className="h-4 w-4 mr-1" />
              Məktəblər ({availableInstitutions.filter((inst) => {
                const isSchoolType = ['secondary_school', 'vocational_school'].includes(inst.type || '');
                const isSchoolByName = inst.level === 4 && inst.name?.toLowerCase().includes('məktəb');
                return isSchoolType || isSchoolByName;
              }).length})
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectInstitutionsByType((inst) =>
                inst.level === 4 && (inst.name.toLowerCase().includes('bağça') || inst.name.toLowerCase().includes('uşaq'))
              )}
            >
              <Users className="h-4 w-4 mr-1" />
              Məktəbəqədər
            </Button>
          </div>
        </div>

        {/* Institution List */}
        <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
          {filteredInstitutions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2" />
              <p>Axtarış nəticəsində müəssisə tapılmadı</p>
            </div>
          ) : (
            filteredInstitutions.map((institution) => (
              <div key={institution.id} className="flex items-center space-x-2 py-1">
                <Checkbox
                  id={`institution-${institution.id}`}
                  checked={
                    (formData.target_institutions || []).some(id => String(id) === String(institution.id))
                  }
                  onCheckedChange={(checked) => {
                    const currentTargets = formData.target_institutions || [];
                    const institutionId = institution.id;

                    if (checked) {
                      if (!currentTargets.some(id => String(id) === String(institutionId))) {
                        handleInputChange('target_institutions', [...currentTargets, institutionId]);
                      }
                    } else {
                      handleInputChange('target_institutions',
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
          {(formData.target_institutions || []).length} müəssisə seçilib
        </p>
      </div>

      {/* Max Responses */}
      <div className="space-y-2">
        <Label htmlFor="max_responses">Maksimal cavab sayı (isteğe bağlı)</Label>
        <Input
          id="max_responses"
          type="number"
          min="1"
          value={formData.max_responses || ''}
          onChange={(e) => handleInputChange('max_responses', e.target.value ? parseInt(e.target.value) : undefined)}
          placeholder="Məhdudiyyət qoyulmur"
        />
      </div>
    </div>
  );
}
