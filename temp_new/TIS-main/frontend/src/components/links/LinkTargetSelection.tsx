import React from 'react';
import { Building2, Users, Search } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Institution } from '@/services/institutions';
import { Department } from '@/services/departments';
import { SharingOptions } from '@/services/links';

interface LinkTargetSelectionProps {
  form: any;
  creating: boolean;
  
  // Data
  filteredInstitutions: Institution[];
  filteredDepartments: Department[];
  availableInstitutionTypes: Array<{ value: string; label: string }>;
  sharingOptions?: SharingOptions;
  
  // Loading states
  institutionsLoading: boolean;
  departmentsLoading: boolean;
  
  // Search and filter states
  institutionSearch: string;
  departmentSearch: string;
  institutionTypeFilter: string;
  selectedInstitutionForDepartments: number | null;
  
  // Actions
  setInstitutionSearch: (value: string) => void;
  setDepartmentSearch: (value: string) => void;
  setInstitutionTypeFilter: (value: string) => void;
  setSelectedInstitutionForDepartments: (value: number | null) => void;
  handleSelectAllInstitutions: () => void;
  handleDeselectAllInstitutions: () => void;
  handleSelectAllDepartments: () => void;
  handleDeselectAllDepartments: () => void;
  handleSelectAllRoles: () => void;
  handleDeselectAllRoles: () => void;
}

export const LinkTargetSelection: React.FC<LinkTargetSelectionProps> = ({
  form,
  creating,
  filteredInstitutions,
  filteredDepartments,
  availableInstitutionTypes,
  sharingOptions,
  institutionsLoading,
  departmentsLoading,
  institutionSearch,
  departmentSearch,
  institutionTypeFilter,
  selectedInstitutionForDepartments,
  setInstitutionSearch,
  setDepartmentSearch,
  setInstitutionTypeFilter,
  setSelectedInstitutionForDepartments,
  handleSelectAllInstitutions,
  handleDeselectAllInstitutions,
  handleSelectAllDepartments,
  handleDeselectAllDepartments,
  handleSelectAllRoles,
  handleDeselectAllRoles
}) => {
  const { setValue, watch } = form;

  return (
    <div className="space-y-4">
      {/* Institution Selection */}
      <div className="space-y-3">
        <Label className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Hədəf Müəssisələr</span>
          </div>
          {watch('target_institutions').length > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
              {watch('target_institutions').length} seçilmiş
            </span>
          )}
        </Label>

        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
              <Input
                placeholder="Müəssisə axtarın..."
                value={institutionSearch}
                onChange={(e) => setInstitutionSearch(e.target.value)}
                className="h-8 pl-7"
                disabled={creating}
              />
            </div>
            <Select value={institutionTypeFilter} onValueChange={setInstitutionTypeFilter} disabled={creating}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Hamısı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                {availableInstitutionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllInstitutions}
              disabled={creating || filteredInstitutions.length === 0}
              className="h-7 text-xs"
            >
              Hamısını seç ({filteredInstitutions.length})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeselectAllInstitutions}
              disabled={creating || watch('target_institutions').length === 0}
              className="h-7 text-xs"
            >
              Hamısını ləğv et
            </Button>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
          {filteredInstitutions.map((institution: Institution) => (
            <div key={institution.id} className="flex items-center space-x-2">
              <Checkbox
                id={`institution-${institution.id}`}
                checked={watch('target_institutions').includes(institution.id)}
                onCheckedChange={(checked) => {
                  const current = watch('target_institutions');
                  if (checked) {
                    setValue('target_institutions', [...current, institution.id]);
                  } else {
                    setValue('target_institutions', current.filter(id => id !== institution.id));
                  }
                }}
                disabled={creating}
              />
              <Label htmlFor={`institution-${institution.id}`} className="text-sm cursor-pointer">
                {institution.name}
                <span className="text-xs text-muted-foreground ml-2">({institution.type})</span>
              </Label>
            </div>
          ))}
          {institutionsLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Müəssisə məlumatları yüklənir...
            </p>
          )}
          {!institutionsLoading && filteredInstitutions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {institutionSearch || institutionTypeFilter !== 'all' 
                ? 'Filter şərtlərinə uyğun müəssisə tapılmadı' 
                : 'Müəssisə tapılmadı'
              }
            </p>
          )}
        </div>
      </div>

      {/* Department Selection */}
      <div className="space-y-3">
        <Label className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Hədəf Departamentlər</span>
          </div>
          {watch('target_departments').length > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
              {watch('target_departments').length} seçilmiş
            </span>
          )}
        </Label>

        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
              <Input
                placeholder="Departament axtarın..."
                value={departmentSearch}
                onChange={(e) => setDepartmentSearch(e.target.value)}
                className="h-8 pl-7"
                disabled={creating}
              />
            </div>
            <Select 
              value={selectedInstitutionForDepartments?.toString() || 'all'} 
              onValueChange={(value) => {
                setSelectedInstitutionForDepartments(value === 'all' ? null : parseInt(value));
              }}
              disabled={creating}
            >
              <SelectTrigger className="w-48 h-8">
                <SelectValue placeholder="Müəssisə seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün müəssisələr</SelectItem>
                {filteredInstitutions.map((institution) => (
                  <SelectItem key={institution.id} value={institution.id.toString()}>
                    {institution.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllDepartments}
              disabled={creating || filteredDepartments.length === 0}
              className="h-7 text-xs"
            >
              Hamısını seç ({filteredDepartments.length})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeselectAllDepartments}
              disabled={creating || watch('target_departments').length === 0}
              className="h-7 text-xs"
            >
              Hamısını ləğv et
            </Button>
            {selectedInstitutionForDepartments && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedInstitutionForDepartments(null)}
                disabled={creating}
                className="h-7 text-xs text-muted-foreground"
              >
                Filtri sıfırla
              </Button>
            )}
          </div>

          {selectedInstitutionForDepartments && (
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded px-2 py-1">
              🏢 Yalnız "{filteredInstitutions.find(i => i.id === selectedInstitutionForDepartments)?.name}" müəssisəsinin departamentləri göstərilir
            </div>
          )}
        </div>

        <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
          {filteredDepartments.map((department: Department) => (
            <div key={department.id} className="flex items-center space-x-2">
              <Checkbox
                id={`department-${department.id}`}
                checked={watch('target_departments').includes(department.id)}
                onCheckedChange={(checked) => {
                  const current = watch('target_departments');
                  if (checked) {
                    setValue('target_departments', [...current, department.id]);
                  } else {
                    setValue('target_departments', current.filter(id => id !== department.id));
                  }
                }}
                disabled={creating}
              />
              <Label htmlFor={`department-${department.id}`} className="text-sm cursor-pointer">
                {department.name}
                <span className="text-xs text-muted-foreground ml-2">({department.department_type})</span>
                {department.institution && (
                  <span className="text-xs text-muted-foreground ml-1">- {department.institution.name}</span>
                )}
              </Label>
            </div>
          ))}
          {departmentsLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Departament məlumatları yüklənir...
            </p>
          )}
          {!departmentsLoading && filteredDepartments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {departmentSearch || selectedInstitutionForDepartments
                ? 'Filter şərtlərinə uyğun departament tapılmadı' 
                : 'Departament tapılmadı'
              }
            </p>
          )}
        </div>
      </div>

      {/* Role Selection */}
      {sharingOptions?.available_roles && sharingOptions.available_roles.length > 0 && (
        <div className="space-y-3">
          <Label className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Hədəf Rollar</span>
            </div>
            {watch('target_roles').length > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                {watch('target_roles').length} seçilmiş
              </span>
            )}
          </Label>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllRoles}
                disabled={creating}
                className="h-7 text-xs"
              >
                Hamısını seç ({sharingOptions.available_roles.length})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAllRoles}
                disabled={creating || watch('target_roles').length === 0}
                className="h-7 text-xs"
              >
                Hamısını ləğv et
              </Button>
            </div>

            <div className="max-h-24 overflow-y-auto border rounded-lg p-3 space-y-2">
              {sharingOptions.available_roles.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={watch('target_roles').includes(role)}
                    onCheckedChange={(checked) => {
                      const current = watch('target_roles');
                      if (checked) {
                        setValue('target_roles', [...current, role]);
                      } else {
                        setValue('target_roles', current.filter(r => r !== role));
                      }
                    }}
                    disabled={creating}
                  />
                  <Label htmlFor={`role-${role}`} className="text-sm cursor-pointer capitalize">
                    {role}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};