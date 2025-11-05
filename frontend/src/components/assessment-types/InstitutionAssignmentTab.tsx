import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Users, X, Building2, Target, Search } from 'lucide-react';

interface Institution {
  id: number;
  name: string;
  type: string;
  level: number;
  district?: string;
  region?: string;
  student_count?: number;
  is_active: boolean;
}

interface InstitutionAssignmentTabProps {
  institutions: Institution[];
  selectedInstitutions: number[];
  setSelectedInstitutions: (ids: number[]) => void;
  institutionSearch: string;
  setInstitutionSearch: (search: string) => void;
  filteredInstitutions: Institution[];
  loadingInstitutions: boolean;
}

export const InstitutionAssignmentTab = ({
  institutions,
  selectedInstitutions,
  setSelectedInstitutions,
  institutionSearch,
  setInstitutionSearch,
  filteredInstitutions,
  loadingInstitutions
}: InstitutionAssignmentTabProps) => {
  const toggleInstitution = (institutionId: number, checked: boolean) => {
    if (checked) {
      if (!selectedInstitutions.includes(institutionId)) {
        setSelectedInstitutions([...selectedInstitutions, institutionId]);
      }
    } else {
      setSelectedInstitutions(selectedInstitutions.filter(id => id !== institutionId));
    }
  };

  const selectVisible = () => {
    const visibleIds = filteredInstitutions.map(inst => inst.id);
    const merged = Array.from(new Set([...selectedInstitutions, ...visibleIds]));
    setSelectedInstitutions(merged);
  };

  const selectByLevel = (level: number) => {
    const levelIds = institutions
      .filter(inst => inst.level === level)
      .map(inst => inst.id);

    const merged = Array.from(new Set([...selectedInstitutions, ...levelIds]));
    setSelectedInstitutions(merged);
  };

  const selectByPredicate = (predicate: (inst: Institution) => boolean) => {
    const matchedIds = institutions.filter(predicate).map(inst => inst.id);
    const merged = Array.from(new Set([...selectedInstitutions, ...matchedIds]));
    setSelectedInstitutions(merged);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {selectedInstitutions.length} müəssisə seçilib
            </Badge>
            <span className="hidden sm:inline">Toplam: {institutions.length}</span>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Müəssisə adı ilə axtar..."
            value={institutionSearch}
            onChange={(e) => setInstitutionSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectVisible}
            disabled={loadingInstitutions || filteredInstitutions.length === 0}
          >
            <Users className="h-4 w-4 mr-1" />
            {institutionSearch
              ? `Görünənləri seç (${filteredInstitutions.length})`
              : `Hamısını seç (${institutions.length})`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedInstitutions([])}
            disabled={selectedInstitutions.length === 0}
          >
            <X className="h-4 w-4 mr-1" />
            Hamısını ləğv et
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => selectByLevel(2)}
            disabled={loadingInstitutions}
          >
            <Building2 className="h-4 w-4 mr-1" />
            Regional İdarələr
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => selectByLevel(3)}
            disabled={loadingInstitutions}
          >
            <Target className="h-4 w-4 mr-1" />
            Sektorlar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              selectByPredicate(inst => {
                const type = inst.type || '';
                const name = inst.name?.toLowerCase() || '';
                const typeMatch = ['secondary_school', 'vocational_school'].includes(type);
                const nameMatch = inst.level === 4 && name.includes('məktəb');
                return typeMatch || nameMatch;
              })
            }
            disabled={loadingInstitutions}
          >
            <Building2 className="h-4 w-4 mr-1" />
            Məktəblər
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              selectByPredicate(inst => {
                const name = inst.name?.toLowerCase() || '';
                return inst.level === 4 && (name.includes('bağça') || name.includes('uşaq'));
              })
            }
            disabled={loadingInstitutions}
          >
            <Users className="h-4 w-4 mr-1" />
            Məktəbəqədər
          </Button>
        </div>
      </div>

      <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
        {loadingInstitutions ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Müəssisələr yüklənir...
          </div>
        ) : filteredInstitutions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3" />
            Axtarışa uyğun müəssisə tapılmadı
          </div>
        ) : (
          filteredInstitutions.map(institution => {
            const checked = selectedInstitutions.includes(institution.id);

            return (
              <div key={institution.id} className="flex items-center gap-3 py-2 border-b last:border-none">
                <Checkbox
                  id={`institution-${institution.id}`}
                  checked={checked}
                  onCheckedChange={(value) => toggleInstitution(institution.id, Boolean(value))}
                />
                <Label
                  htmlFor={`institution-${institution.id}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-1 cursor-pointer"
                >
                  <span className="font-medium text-sm">{institution.name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {institution.level && (
                      <Badge variant="outline" className="text-xs">
                        Səviyyə {institution.level}
                      </Badge>
                    )}
                    {institution.type && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {institution.type.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </span>
                </Label>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
