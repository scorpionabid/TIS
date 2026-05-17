import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, Users } from 'lucide-react';
import { Institution } from '@/services/institutions';
import { Department } from '@/services/departments';

interface ShareSettingsProps {
  institutions: Institution[];
  departments: Department[];
  filteredInstitutions: Institution[];
  selectedInstitutions: number[];
  selectedDepartments: number[];
  shareWithAll: boolean;
  searchTerm: string;
  institutionsLoading: boolean;
  departmentsLoading: boolean;
  onSearchChange: (value: string) => void;
  onToggleInstitution: (id: number) => void;
  onToggleDepartment: (id: number) => void;
  onShareWithAllChange: (value: boolean) => void;
}

export const ShareSettings = ({
  institutions,
  departments,
  filteredInstitutions,
  selectedInstitutions,
  selectedDepartments,
  shareWithAll,
  searchTerm,
  institutionsLoading,
  departmentsLoading,
  onSearchChange,
  onToggleInstitution,
  onToggleDepartment,
  onShareWithAllChange
}: ShareSettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Paylaşım Parametrləri</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Share with all toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="share_with_all"
            checked={shareWithAll}
            onCheckedChange={onShareWithAllChange}
          />
          <Label htmlFor="share_with_all" className="text-sm">
            Bütün müəssisələrlə paylaş
          </Label>
        </div>

        {!shareWithAll && (
          <>
            {/* Institution Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Müəssisələr</Label>
                <p className="text-xs text-muted-foreground">
                  Sənədi paylaşmaq istədiyiniz müəssisələri seçin
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Müəssisə axtar..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Selected institutions summary */}
              {selectedInstitutions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedInstitutions.map(id => {
                    const institution = institutions.find(inst => inst.id === id);
                    return institution ? (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {institution.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              {/* Institutions list */}
              <ScrollArea className="h-48 border rounded-md">
                {institutionsLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Müəssisələr yüklənir...
                  </div>
                ) : filteredInstitutions.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Müəssisə tapılmadı
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {filteredInstitutions.map((institution) => (
                      <div
                        key={institution.id}
                        className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                        onClick={() => onToggleInstitution(institution.id)}
                      >
                        <Checkbox
                          checked={selectedInstitutions.includes(institution.id)}
                          readOnly
                        />
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{institution.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {institution.type} • {institution.region}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Department Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Şöbələr</Label>
                <p className="text-xs text-muted-foreground">
                  Xüsusi şöbələrlə paylaşmaq istəyirsinizsə seçin
                </p>
              </div>

              {/* Selected departments summary */}
              {selectedDepartments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedDepartments.map(id => {
                    const department = departments.find(dept => dept.id === id);
                    return department ? (
                      <Badge key={id} variant="outline" className="text-xs">
                        {department.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              {/* Departments list */}
              <ScrollArea className="h-32 border rounded-md">
                {departmentsLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Şöbələr yüklənir...
                  </div>
                ) : departments.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Şöbə tapılmadı
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {departments.map((department) => (
                      <div
                        key={department.id}
                        className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                        onClick={() => onToggleDepartment(department.id)}
                      >
                        <Checkbox
                          checked={selectedDepartments.includes(department.id)}
                          readOnly
                        />
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{department.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {department.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </>
        )}

        {shareWithAll && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Qeyd:</strong> Sənəd sistemdəki bütün müəssisələrlə paylaşılacaq.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};