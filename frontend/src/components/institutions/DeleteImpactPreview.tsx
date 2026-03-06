import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Users,
  Building2,
  GraduationCap,
  FileText,
  BarChart3,
  Clock,
  Shield,
  Trash2,
  Archive
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface DeleteImpactData {
  institution: {
    id: number;
    name: string;
    type: string;
    level: number;
  };
  direct_children_count: number;
  total_children_count: number;
  children_details: any[];
  users_count: number;
  total_users_count: number;
  students_count: number;
  total_students_count: number;
  departments_count: number;
  rooms_count: number;
  grades_count: number;
  survey_responses_count: number;
  statistics_count: number;
  indicator_values_count: number;
  audit_logs_count: number;
  has_region: boolean;
  has_sector: boolean;
  deletion_mode: {
    soft_delete: string;
    hard_delete: string;
  };
  cascade_delete_tables: string[];
}

interface DeleteImpactPreviewProps {
  impact: DeleteImpactData | null;
  deleteType: 'soft' | 'hard';
  isLoading?: boolean;
  className?: string;
}

export const DeleteImpactPreview: React.FC<DeleteImpactPreviewProps> = ({
  impact,
  deleteType,
  isLoading = false,
  className
}) => {
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 animate-spin" />
            Təsir analizi yüklənir...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!impact) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Təsir məlumatlarını yükləmək mümkün olmadı.
        </AlertDescription>
      </Alert>
    );
  }

  const { institution } = impact;
  const isHardDelete = deleteType === 'hard';

  // Calculate risk level
  const getRiskLevel = () => {
    const totalImpact = impact.total_children_count + impact.total_users_count + impact.total_students_count;
    if (totalImpact === 0) return 'low';
    if (totalImpact < 10) return 'medium';
    return 'high';
  };

  const riskLevel = getRiskLevel();
  const riskColors = {
    low: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    high: 'text-red-600 bg-red-50 border-red-200'
  };

  const riskLabels = {
    low: 'Aşağı Risk',
    medium: 'Orta Risk',
    high: 'Yüksək Risk'
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Institution Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isHardDelete ? (
                <Trash2 className="h-5 w-5 text-red-500" />
              ) : (
                <Archive className="h-5 w-5 text-orange-500" />
              )}
              <span>Silmə Təsiri: {institution.name}</span>
            </div>
            <Badge variant="outline" className={riskColors[riskLevel]}>
              {riskLabels[riskLevel]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <strong>Növ:</strong> {institution.type} | <strong>Səviyyə:</strong> {institution.level}
          </div>
        </CardContent>
      </Card>

      {/* Delete Mode Explanation */}
      <Alert className={isHardDelete ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>{isHardDelete ? 'Həmişəlik Silmə:' : 'Arxivə Köçürmə:'}</strong>{' '}
          {isHardDelete ? impact.deletion_mode.hard_delete : impact.deletion_mode.soft_delete}
        </AlertDescription>
      </Alert>

      {/* Impact Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium">Alt Müəssisələr</div>
                <div className="text-2xl font-bold text-blue-600">
                  {isHardDelete ? impact.total_children_count : impact.direct_children_count}
                </div>
                {isHardDelete && impact.total_children_count !== impact.direct_children_count && (
                  <div className="text-xs text-muted-foreground">
                    ({impact.direct_children_count} birbaşa)
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">İstifadəçilər</div>
                <div className="text-2xl font-bold text-green-600">
                  {isHardDelete ? impact.total_users_count : impact.users_count}
                </div>
                {isHardDelete && impact.total_users_count !== impact.users_count && (
                  <div className="text-xs text-muted-foreground">
                    ({impact.users_count} birbaşa)
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-sm font-medium">Şagirdlər</div>
                <div className="text-2xl font-bold text-purple-600">
                  {isHardDelete ? impact.total_students_count : impact.students_count}
                </div>
                {isHardDelete && impact.total_students_count !== impact.students_count && (
                  <div className="text-xs text-muted-foreground">
                    ({impact.students_count} birbaşa)
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              <div>
                <div className="text-sm font-medium">Məlumatlar</div>
                <div className="text-2xl font-bold text-amber-600">
                  {impact.survey_responses_count + impact.statistics_count + impact.audit_logs_count}
                </div>
                <div className="text-xs text-muted-foreground">
                  Sorğu, statistika, audit
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Data Details */}
      {isHardDelete && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Silinəcək Əlavə Məlumatlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Şöbələr:</span> {impact.departments_count}
              </div>
              <div>
                <span className="font-medium">Otaqlar:</span> {impact.rooms_count}
              </div>
              <div>
                <span className="font-medium">Siniflər:</span> {impact.grades_count}
              </div>
              <div>
                <span className="font-medium">Sorğu cavabları:</span> {impact.survey_responses_count}
              </div>
              <div>
                <span className="font-medium">Statistikalar:</span> {impact.statistics_count}
              </div>
              <div>
                <span className="font-medium">Audit logları:</span> {impact.audit_logs_count}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {impact.users_count > 0 && deleteType === 'soft' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Xəbərdarlıq:</strong> Bu müəssisədə {impact.users_count} istifadəçi var.
            Soft delete üçün əvvəlcə istifadəçiləri köçürün və ya hard delete istifadə edin.
          </AlertDescription>
        </Alert>
      )}

      {isHardDelete && impact.total_children_count > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <strong>Xəbərdarlıq:</strong> Bu əməliyyat {impact.total_children_count} alt müəssisəni
            və onların bütün məlumatlarını həmişəlik siləcək. Bu əməliyyat geri alına bilməz!
          </AlertDescription>
        </Alert>
      )}

      {/* Children Details */}
      {impact.children_details.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Təsirlənəcək Alt Müəssisələr</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {impact.children_details.slice(0, 5).map((child, index) => (
                <div key={index} className="flex justify-between items-center text-sm p-2 bg-muted rounded">
                  <span>{child.institution?.name || 'Naməlum'}</span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs">
                      {child.users_count || 0} istifadəçi
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {child.students_count || 0} şagird
                    </Badge>
                  </div>
                </div>
              ))}
              {impact.children_details.length > 5 && (
                <div className="text-xs text-muted-foreground text-center">
                  və {impact.children_details.length - 5} digər müəssisə...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};