import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Preschool } from '@/services/preschools';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  Code,
  CheckCircle,
  XCircle,
  Users,
  BookOpen,
  UserCheck,
  ClipboardList,
  FileText,
  TrendingUp,
  AlertTriangle,
  X
} from 'lucide-react';

interface PreschoolDetailModalProps {
  open: boolean;
  onClose: () => void;
  preschool: Preschool | null;
  onEdit?: (preschool: Preschool) => void;
}

const PRESCHOOL_TYPES = [
  { value: 'kindergarten', label: 'Uşaq Bağçası', icon: '🏫' },
  { value: 'preschool_center', label: 'Məktəbəqədər Təhsil Mərkəzi', icon: '🎓' },
  { value: 'nursery', label: 'Uşaq Evləri', icon: '🏡' }
] as const;

export const PreschoolDetailModal: React.FC<PreschoolDetailModalProps> = ({
  open,
  onClose,
  preschool,
  onEdit,
}) => {
  if (!preschool) return null;

  const getTypeInfo = (type: string) => {
    return PRESCHOOL_TYPES.find(t => t.value === type) || PRESCHOOL_TYPES[0];
  };

  const typeInfo = getTypeInfo(preschool.type);
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Göstərilməyib';
    return new Date(dateString).toLocaleDateString('az-AZ');
  };

  const formatPerformanceScore = (score: number) => {
    return Math.round(score * 10) / 10;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceLabel = (score: number) => {
    if (score >= 90) return 'Əla';
    if (score >= 80) return 'Yaxşı';
    if (score >= 70) return 'Orta';
    return 'Zəif';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <span className="text-2xl">{typeInfo.icon}</span>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold leading-tight">
                {preschool.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={preschool.is_active ? 'default' : 'secondary'}>
                  {typeInfo.label}
                </Badge>
                {preschool.is_active ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Aktiv</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-500">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Qeyri-aktiv</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(preschool)}>
                Redaktə et
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                Əsas Məlumatlar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Tam Adı</div>
                  <div className="font-medium">{preschool.name}</div>
                </div>
                {preschool.short_name && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Qısa Ad</div>
                    <div className="font-medium">{preschool.short_name}</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Bağlı Sektor</div>
                  <div className="font-medium">{preschool.sector_name}</div>
                </div>
                {preschool.code && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Code className="h-4 w-4" />
                      Kod
                    </div>
                    <div className="font-mono font-medium">{preschool.code}</div>
                  </div>
                )}
              </div>

              {preschool.established_date && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Təsis Tarixi
                  </div>
                  <div className="font-medium">{formatDate(preschool.established_date)}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="h-5 w-5 text-primary" />
                Əlaqə Məlumatları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {preschool.address && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Ünvan
                  </div>
                  <div className="text-sm leading-relaxed">{preschool.address}</div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {preschool.phone && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      Telefon
                    </div>
                    <div className="font-mono">{preschool.phone}</div>
                  </div>
                )}

                {preschool.email && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                    <div className="font-mono text-sm">{preschool.email}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manager Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Menecer Məlumatları
              </CardTitle>
            </CardHeader>
            <CardContent>
              {preschool.manager ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <UserCheck className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {(preschool.manager.first_name && preschool.manager.last_name)
                          ? `${preschool.manager.first_name} ${preschool.manager.last_name}`
                          : preschool.manager.username || preschool.manager.email?.split('@')[0] || 'Admin'}
                      </div>
                      <div className="text-sm text-muted-foreground">Bağça Admini</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">İstifadəçi adı: </span>
                      <span className="font-medium">{preschool.manager.username}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      <span className="font-medium">{preschool.manager.email}</span>
                    </div>
                  </div>

                  {preschool.manager.phone && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Telefon: </span>
                      <span className="font-medium">{preschool.manager.phone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <div className="font-medium text-amber-800">Menecer təyin edilməyib</div>
                    <div className="text-sm text-amber-700">Bu müəssisəyə hələ menecer təyin edilməmişdir</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Statistika
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="p-3 bg-blue-100 rounded-lg mb-2 mx-auto w-fit">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{preschool.statistics.total_children}</div>
                  <div className="text-sm text-muted-foreground">Uşaq</div>
                </div>

                <div className="text-center">
                  <div className="p-3 bg-green-100 rounded-lg mb-2 mx-auto w-fit">
                    <BookOpen className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{preschool.statistics.total_teachers}</div>
                  <div className="text-sm text-muted-foreground">Müəllim</div>
                </div>

                <div className="text-center">
                  <div className="p-3 bg-orange-100 rounded-lg mb-2 mx-auto w-fit">
                    <UserCheck className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600">{preschool.statistics.total_staff}</div>
                  <div className="text-sm text-muted-foreground">Ümumi İşçi</div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Aktiv Sorğular</span>
                  </div>
                  <div className="text-xl font-bold">{preschool.statistics.active_surveys}</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Gözləyən Tapşırıq</span>
                  </div>
                  <div className="text-xl font-bold">{preschool.statistics.pending_tasks}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Performans Göstəriciləri
              </CardTitle>
              <CardDescription>
                Müəssisənin müxtəlif sahələrdə performans göstəriciləri
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Cavab Verme Nisbəti</span>
                    <span className={`text-sm font-bold ${getPerformanceColor(preschool.performance_metrics.response_rate)}`}>
                      {formatPerformanceScore(preschool.performance_metrics.response_rate)}% - {getPerformanceLabel(preschool.performance_metrics.response_rate)}
                    </span>
                  </div>
                  <Progress value={preschool.performance_metrics.response_rate} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Tapşırıq Tamamlama Nisbəti</span>
                    <span className={`text-sm font-bold ${getPerformanceColor(preschool.performance_metrics.task_completion_rate)}`}>
                      {formatPerformanceScore(preschool.performance_metrics.task_completion_rate)}% - {getPerformanceLabel(preschool.performance_metrics.task_completion_rate)}
                    </span>
                  </div>
                  <Progress value={preschool.performance_metrics.task_completion_rate} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Sorğu İştirakı</span>
                    <span className={`text-sm font-bold ${getPerformanceColor(preschool.performance_metrics.survey_participation)}`}>
                      {formatPerformanceScore(preschool.performance_metrics.survey_participation)}% - {getPerformanceLabel(preschool.performance_metrics.survey_participation)}
                    </span>
                  </div>
                  <Progress value={preschool.performance_metrics.survey_participation} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Sənəd Uyğunluğu</span>
                    <span className={`text-sm font-bold ${getPerformanceColor(preschool.performance_metrics.document_compliance)}`}>
                      {formatPerformanceScore(preschool.performance_metrics.document_compliance)}% - {getPerformanceLabel(preschool.performance_metrics.document_compliance)}
                    </span>
                  </div>
                  <Progress value={preschool.performance_metrics.document_compliance} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Sistem Məlumatları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Yaradılma tarixi: </span>
                  <span className="font-medium">{formatDate(preschool.created_at)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Son yeniləmə: </span>
                  <span className="font-medium">{formatDate(preschool.updated_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};