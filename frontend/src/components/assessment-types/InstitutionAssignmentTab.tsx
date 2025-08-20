import { useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { 
  Search, 
  School, 
  MapPin, 
  Users, 
  Building2,
  CheckCircle2 
} from 'lucide-react';

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
  const [showSelected, setShowSelected] = useState(false);

  const toggleInstitution = (institutionId: number) => {
    if (selectedInstitutions.includes(institutionId)) {
      setSelectedInstitutions(selectedInstitutions.filter(id => id !== institutionId));
    } else {
      setSelectedInstitutions([...selectedInstitutions, institutionId]);
    }
  };

  const selectAll = () => {
    setSelectedInstitutions(filteredInstitutions.map(inst => inst.id));
  };

  const clearAll = () => {
    setSelectedInstitutions([]);
  };

  const displayInstitutions = showSelected 
    ? institutions.filter(inst => selectedInstitutions.includes(inst.id))
    : filteredInstitutions;

  const getInstitutionTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'primary': 'İbtidai',
      'secondary': 'Orta',
      'high': 'Lise', 
      'preschool': 'Məktəbəqədər',
      'vocational': 'Peşə',
      'special': 'Xüsusi'
    };
    return labels[type] || type;
  };

  const getInstitutionIcon = (type: string) => {
    switch (type) {
      case 'primary':
      case 'secondary':
      case 'high':
        return <School className="h-4 w-4" />;
      case 'preschool':
        return <Users className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Selection Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Müəssisə Seçimi
            <Badge variant="outline">
              {selectedInstitutions.length} seçildi
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={loadingInstitutions}
            >
              Hamısını Seç
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              disabled={selectedInstitutions.length === 0}
            >
              Hamısını Sil
            </Button>
            <Button
              variant={showSelected ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSelected(!showSelected)}
              disabled={selectedInstitutions.length === 0}
            >
              {showSelected ? 'Hamısını Göstər' : 'Seçilmişləri Göstər'}
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Müəssisə axtar..."
              value={institutionSearch}
              onChange={(e) => setInstitutionSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Institutions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {showSelected ? 'Seçilmiş Müəssisələr' : 'Bütün Müəssisələr'}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({displayInstitutions.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {loadingInstitutions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Müəssisələr yüklənir...</p>
              </div>
            ) : displayInstitutions.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {showSelected ? 'Seçilmiş müəssisə yoxdur' : 'Müəssisə tapılmadı'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayInstitutions.map((institution) => (
                  <div
                    key={institution.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedInstitutions.includes(institution.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    }`}
                    onClick={() => toggleInstitution(institution.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedInstitutions.includes(institution.id)}
                          readOnly
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getInstitutionIcon(institution.type)}
                            <h4 className="font-medium">{institution.name}</h4>
                            {selectedInstitutions.includes(institution.id) && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{institution.district || institution.region}</span>
                            </div>
                            {institution.student_count && (
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>{institution.student_count.toLocaleString()} şagird</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-xs">
                          {getInstitutionTypeLabel(institution.type)}
                        </Badge>
                        <Badge variant={institution.is_active ? "default" : "secondary"} className="text-xs">
                          {institution.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};