import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  CheckCircle2, 
  School, 
  Calendar, 
  Bell, 
  Users,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { CreateAssessmentTypeData } from '../../services/assessmentTypes';

interface CriteriaEntry {
  name: string;
  weight: number;
}

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

interface PreviewTabProps {
  formData: CreateAssessmentTypeData;
  criteria: CriteriaEntry[];
  selectedInstitutions: number[];
  institutions: Institution[];
  dueDate: string;
  isRecurring: boolean;
  recurringFrequency: string;
  notificationDays: number;
}

export const PreviewTab = ({
  formData,
  criteria,
  selectedInstitutions,
  institutions,
  dueDate,
  isRecurring,
  recurringFrequency,
  notificationDays
}: PreviewTabProps) => {
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const selectedInstitutionDetails = institutions.filter(inst => 
    selectedInstitutions.includes(inst.id)
  );

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      'academic': 'Akademik',
      'behavioral': 'Davranış',
      'skill': 'Bacarıq',
      'project': 'Layihə',
      'portfolio': 'Portfel',
      'custom': 'Xüsusi'
    };
    return labels[category] || category;
  };

  const getScoringMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      'percentage': 'Faiz (%)',
      'points': 'Bal',
      'grade': 'Qiymət',
      'pass_fail': 'Keçdi/Qaldı'
    };
    return labels[method] || method;
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: { [key: string]: string } = {
      'weekly': 'Həftəlik',
      'monthly': 'Aylıq', 
      'quarterly': 'Rüblük',
      'semesterly': 'Semestr',
      'yearly': 'İllik'
    };
    return labels[frequency] || frequency;
  };

  return (
    <div className="space-y-6">
      {/* Basic Information Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Əsas Məlumatlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">{formData.name}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kateqoriya:</span>
                  <Badge variant="outline">{getCategoryLabel(formData.category)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maksimum Bal:</span>
                  <span className="font-medium">{formData.max_score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Metod:</span>
                  <span className="font-medium">{getScoringMethodLabel(formData.scoring_method || 'percentage')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={formData.is_active ? "default" : "secondary"}>
                    {formData.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
                  </Badge>
                </div>
              </div>
            </div>
            
            {formData.description && (
              <div>
                <h4 className="font-medium mb-2">Təsvir</h4>
                <p className="text-sm text-muted-foreground">{formData.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Criteria Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Qiymətləndirmə Meyarları
            <Badge variant={totalWeight === 100 ? "default" : "destructive"} className="ml-auto">
              {totalWeight}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {criteria.filter(c => c.name.trim()).length === 0 ? (
            <p className="text-sm text-muted-foreground">Meyar əlavə edilməyib</p>
          ) : (
            <div className="space-y-3">
              {criteria.filter(c => c.name.trim()).map((criterion, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-medium">{criterion.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{criterion.weight}%</span>
                    <div className="w-16">
                      <Progress value={criterion.weight} className="h-2" />
                    </div>
                  </div>
                </div>
              ))}
              
              {totalWeight !== 100 && (
                <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Meyarların çəki cəmi {totalWeight < 100 ? 'az' : 'çox'}dur ({totalWeight}%)</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Institution Assignment Summary */}
      {selectedInstitutions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <School className="h-5 w-5" />
              Seçilmiş Müəssisələr
              <Badge variant="outline" className="ml-auto">
                {selectedInstitutions.length} müəssisə
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedInstitutionDetails.map((institution) => (
                <div key={institution.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <span className="font-medium">{institution.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {institution.type}
                    </Badge>
                    {institution.student_count && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{institution.student_count.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduling Summary */}
      {(dueDate || isRecurring) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Vaxt Cədvəli
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dueDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Son Tarix:</span>
                <span className="font-medium">
                  {new Date(dueDate).toLocaleDateString('az-AZ', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
            
            {isRecurring && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Təkrar:</span>
                <Badge variant="outline">{getFrequencyLabel(recurringFrequency)}</Badge>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Xatırlatma:</span>
              <div className="flex items-center gap-1 text-sm">
                <Bell className="h-3 w-3" />
                <span>{notificationDays} gün əvvəl</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};