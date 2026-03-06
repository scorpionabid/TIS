import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Users, Building2, Target, Search, X } from 'lucide-react';

const LIST_HEIGHT = 224;
const ITEM_SIZE = 52;
const OVERSCAN_COUNT = 4;

export type TaskInstitution = {
  id: number;
  name: string;
  level: number | null;
  type: string | null;
  parent_id?: number | null;
};

export interface TaskTargetingFieldProps {
  form: any;
  formField: any;
  institutions: TaskInstitution[];
  disabled?: boolean;
}

const EMPTY_TASK_SELECTED_VALUES: string[] = [];

/**
 * TaskTargetingField - Tapşırıq üçün hədəf müəssisələrin seçimi
 *
 * Xüsusiyyətlər:
 * - Axtarış funksiyası
 * - Bulk seçim (Hamısını seç, Səviyyəyə görə seç, Tipə görə seç)
 * - Departament seçildikdə deaktiv olur
 * - Real-time validation
 */
export const TaskTargetingField: React.FC<TaskTargetingFieldProps> = ({
  form,
  formField,
  institutions,
  disabled
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  // Get selected values from form
  const selectedValues: string[] = React.useMemo(() => {
    if (Array.isArray(formField.value)) {
      return formField.value.map((value: any) => String(value));
    }
    return EMPTY_TASK_SELECTED_VALUES;
  }, [formField.value]);

  const selectedValuesSet = React.useMemo(
    () => new Set(selectedValues),
    [selectedValues],
  );

  // Watch departments to disable institution selection when departments are selected
  const watchedDepartments = form.watch('target_departments');
  const selectedDepartments: string[] = Array.isArray(watchedDepartments)
    ? watchedDepartments.map((item: any) => String(item))
    : [];
  const departmentsSelected = selectedDepartments.length > 0;

  // Update form values
  const updateValues = React.useCallback((nextValues: string[]) => {
    formField.onChange(nextValues);
    form.setValue('target_institutions', nextValues);

    // Set primary institution
    const primary = nextValues.length > 0 ? Number(nextValues[0]) : null;
    form.setValue('assigned_institution_id', primary);
    form.setValue('target_institution_id', primary);
  }, [form, formField]);

  // Clear institution selection when departments are selected
  React.useEffect(() => {
    if (departmentsSelected && selectedValues.length > 0) {
      updateValues([]);
    }
  }, [departmentsSelected, selectedValues.length, updateValues]);

  // Filter institutions based on search term
  const filteredInstitutions = React.useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return institutions;
    return institutions.filter((institution) =>
      institution.name.toLowerCase().includes(query),
    );
  }, [institutions, searchTerm]);

  const institutionLookup = React.useMemo(() => {
    const map = new Map<string, TaskInstitution>();
    institutions.forEach((institution) => {
      map.set(institution.id.toString(), institution);
    });
    return map;
  }, [institutions]);

  const selectedInstitutionsDetailed = React.useMemo(
    () =>
      selectedValues
        .map((id) => institutionLookup.get(id))
        .filter((inst): inst is TaskInstitution => Boolean(inst)),
    [institutionLookup, selectedValues],
  );

  // Bulk selection handlers
  const handleSelectAll = React.useCallback(() => {
    if (departmentsSelected) return;
    const values = filteredInstitutions.map((institution) => institution.id.toString());
    updateValues(values);
  }, [filteredInstitutions, updateValues, departmentsSelected]);

  const handleClear = React.useCallback(() => {
    updateValues([]);
  }, [updateValues]);

  const handleRemoveSelected = React.useCallback(
    (institutionId: number) => {
      const next = selectedValues.filter(
        (value) => Number(value) !== institutionId,
      );
      updateValues(next);
    },
    [selectedValues, updateValues],
  );

  const handleSelectByLevel = React.useCallback((level: number) => {
    if (departmentsSelected) return;
    const values = institutions
      .filter((institution) => institution.level === level)
      .map((institution) => institution.id.toString());
    updateValues(values);
  }, [institutions, updateValues, departmentsSelected]);

  const handleSelectByType = React.useCallback((
    predicate: (institution: TaskInstitution) => boolean
  ) => {
    if (departmentsSelected) return;
    const values = institutions
      .filter(predicate)
      .map((institution) => institution.id.toString());
    updateValues(values);
  }, [institutions, updateValues, departmentsSelected]);

  // Toggle individual institution
  const toggleValue = React.useCallback(
    (checked: boolean, institutionId: number) => {
      const current = new Set(selectedValues);
      const idAsString = institutionId.toString();

      if (checked && !departmentsSelected) {
        current.add(idAsString);
      } else {
        current.delete(idAsString);
      }

      updateValues(Array.from(current));
    },
    [selectedValues, updateValues, departmentsSelected],
  );

  // Helper functions for filtering
  const isSchoolInstitution = React.useCallback((inst: TaskInstitution): boolean => {
    const typeValue = typeof inst.type === 'string' ? inst.type : '';
    const normalized = typeValue.toLowerCase();
    const isSchoolType = ['secondary_school', 'vocational_school', 'school'].includes(normalized);
    const isSchoolByName = inst.level === 4 && inst.name.toLowerCase().includes('məktəb');
    return isSchoolType || isSchoolByName;
  }, []);

  const isPreschoolInstitution = React.useCallback((inst: TaskInstitution): boolean => {
    return inst.level === 4 && (
      inst.name.toLowerCase().includes('bağça') ||
      inst.name.toLowerCase().includes('uşaq')
    );
  }, []);

  // Count institutions by type
  const counts = React.useMemo(() => ({
    all: institutions.length,
    regional: institutions.filter((inst) => inst.level === 2).length,
    sector: institutions.filter((inst) => inst.level === 3).length,
    schools: institutions.filter(isSchoolInstitution).length,
    preschools: institutions.filter(isPreschoolInstitution).length,
  }), [institutions, isSchoolInstitution, isPreschoolInstitution]);

  const [scrollOffset, setScrollOffset] = React.useState(0);
  const totalHeight = filteredInstitutions.length * ITEM_SIZE;
  const visibleCount = Math.ceil(LIST_HEIGHT / ITEM_SIZE);
  const startIndex = Math.max(
    0,
    Math.floor(scrollOffset / ITEM_SIZE) - OVERSCAN_COUNT
  );
  const endIndex = Math.min(
    filteredInstitutions.length,
    startIndex + visibleCount + OVERSCAN_COUNT * 2
  );
  const visibleInstitutions = React.useMemo(
    () => filteredInstitutions.slice(startIndex, endIndex),
    [filteredInstitutions, startIndex, endIndex]
  );

  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollOffset(event.currentTarget.scrollTop);
  }, []);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Input
          type="text"
          placeholder="Müəssisə adı ilə axtar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          disabled={disabled || departmentsSelected}
          aria-label="Müəssisə axtarışı"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
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

      {/* Department Selected Warning */}
      {departmentsSelected && (
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          ⚠️ Departament seçildiyinə görə müəssisə seçimi deaktiv edilib.
        </div>
      )}

      {/* Selected Preview */}
      {selectedInstitutionsDetailed.length > 0 && (
        <div className="rounded-lg border bg-card/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Seçilmiş müəssisələr ({selectedValues.length})
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleClear}
            >
              Hamısını sil
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedInstitutionsDetailed.slice(0, 8).map((institution) => (
              <Badge key={institution.id} variant="secondary" className="text-xs">
                {institution.name}
                <button
                  type="button"
                  onClick={() => handleRemoveSelected(institution.id)}
                  className="ml-1 rounded-full hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${institution.name} seçimini sil`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
            {selectedValues.length > 8 && (
              <Badge variant="outline" className="text-xs">
                +{selectedValues.length - 8} daha
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Bulk Selection Actions */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={disabled || departmentsSelected}
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
            disabled={disabled || selectedValues.length === 0}
          >
            <X className="h-4 w-4 mr-1" />
            Seçimi ləğv et
          </Button>
        </div>

        {/* Filter by Level/Type */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSelectByLevel(2)}
            disabled={disabled || departmentsSelected}
          >
            <Building2 className="h-4 w-4 mr-1" />
            Regional idarələr ({counts.regional})
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSelectByLevel(3)}
            disabled={disabled || departmentsSelected}
          >
            <Target className="h-4 w-4 mr-1" />
            Sektorlar ({counts.sector})
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSelectByType(isSchoolInstitution)}
            disabled={disabled || departmentsSelected}
          >
            <Building2 className="h-4 w-4 mr-1" />
            Məktəblər ({counts.schools})
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSelectByType(isPreschoolInstitution)}
            disabled={disabled || departmentsSelected}
          >
            <Users className="h-4 w-4 mr-1" />
            Məktəbəqədər ({counts.preschools})
          </Button>
        </div>
      </div>

      {/* Institution List */}
      <div className="border rounded-lg p-0">
        {filteredInstitutions.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchTerm
                ? "Axtarış nəticəsində müəssisə tapılmadı"
                : "Müəssisə siyahısı yüklənir..."}
            </p>
          </div>
        ) : (
          <div
            className="max-h-[224px] overflow-y-auto"
            style={{ height: LIST_HEIGHT }}
            onScroll={handleScroll}
          >
            <div style={{ height: totalHeight, position: "relative" }}>
              {visibleInstitutions.map((institution, index) => {
                const absoluteIndex = startIndex + index;
                const institutionId = institution.id.toString();
                const isChecked = selectedValuesSet.has(institutionId);

                return (
                  <div
                    key={institution.id}
                    className="flex items-center space-x-2 px-2 py-1 hover:bg-muted/50"
                    style={{
                      position: "absolute",
                      top: absoluteIndex * ITEM_SIZE,
                      left: 0,
                      right: 0,
                      height: ITEM_SIZE,
                    }}
                  >
                    <Checkbox
                      id={`institution-${institution.id}`}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        toggleValue(Boolean(checked), institution.id)
                      }
                      disabled={disabled || departmentsSelected}
                    />
                    <Label
                      htmlFor={`institution-${institution.id}`}
                      className="text-sm font-normal cursor-pointer flex items-center gap-2 flex-1"
                    >
                      <span className="flex-1">{institution.name}</span>
                      {institution.level && (
                        <Badge variant="outline" className="text-xs">
                          Səviyyə {institution.level}
                        </Badge>
                      )}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selection Summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {selectedValues.length > 0 ? (
            <span className="text-foreground font-medium">{selectedValues.length} müəssisə seçilib</span>
          ) : (
            'Heç bir müəssisə seçilməyib'
          )}
        </span>
        {searchTerm && (
          <span className="text-muted-foreground">
            {filteredInstitutions.length} nəticə göstərilir
          </span>
        )}
      </div>
    </div>
  );
};
