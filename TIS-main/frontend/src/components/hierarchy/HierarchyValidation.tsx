import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Shield, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ValidationResponse, ValidationIssue } from '@/services/hierarchy';
import { cn } from '@/lib/utils';

interface HierarchyValidationProps {
  validation: ValidationResponse | null;
  isLoading: boolean;
  onValidate: () => void;
  className?: string;
}

const getIssueTypeInfo = (type: ValidationIssue['type']) => {
  switch (type) {
    case 'orphaned_institutions':
      return {
        title: 'Yetim Müəssisələr',
        description: 'Valideyn müəssisəsi olmayan və ya silinmiş valideynə sahib müəssisələr',
        icon: <XCircle className="h-4 w-4" />,
        severity: 'error' as const,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    case 'level_inconsistencies':
      return {
        title: 'Səviyyə Uyğunsuzluqları',
        description: 'Valideyn müəssisəsindən 1 fərqli olmayan səviyyəyə sahib müəssisələr',
        icon: <AlertTriangle className="h-4 w-4" />,
        severity: 'warning' as const,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
      };
    case 'circular_references':
      return {
        title: 'Dövri Referanslar',
        description: 'Özünə və ya alt müəssisələrinə referans verən müəssisələr',
        icon: <AlertTriangle className="h-4 w-4" />,
        severity: 'error' as const,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    default:
      return {
        title: 'Naməlum Problem',
        description: 'Tanınmayan validation problemi',
        icon: <Info className="h-4 w-4" />,
        severity: 'info' as const,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
      };
  }
};

const ValidationIssueCard: React.FC<{ issue: ValidationIssue }> = ({ issue }) => {
  const info = getIssueTypeInfo(issue.type);

  return (
    <Card className={cn('border-l-4', info.borderColor)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={info.color}>
              {info.icon}
            </div>
            <div>
              <CardTitle className="text-base">{info.title}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {info.description}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={info.severity === 'error' ? 'destructive' : 'secondary'}
            className="font-medium"
          >
            {issue.count} müəssisə
          </Badge>
        </div>
      </CardHeader>
      
      {(issue.institutions || issue.chains) && (
        <CardContent className="pt-0">
          {issue.institutions && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-muted-foreground">
                Təsir olunmuş müəssisələr:
              </h5>
              <div className="grid grid-cols-1 gap-1">
                {Object.entries(issue.institutions).map(([id, name]) => (
                  <div 
                    key={id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded text-sm',
                      info.bgColor
                    )}
                  >
                    <span className="font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground">ID: {id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {issue.chains && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-muted-foreground">
                Dövri zəncir:
              </h5>
              <div className="space-y-1">
                {issue.chains.map((chain, index) => (
                  <div 
                    key={index}
                    className={cn(
                      'p-2 rounded text-sm font-mono',
                      info.bgColor
                    )}
                  >
                    {chain.join(' → ')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export const HierarchyValidation: React.FC<HierarchyValidationProps> = ({
  validation,
  isLoading,
  onValidate,
  className,
}) => {
  if (!validation && !isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Hierarchy Validasiyası</h3>
          <p className="text-muted-foreground mb-4">
            Hierarchy strukturunun bütövlüyünü yoxlamaq üçün validasiya işə salın
          </p>
          <Button onClick={onValidate} disabled={isLoading}>
            <Shield className="h-4 w-4 mr-2" />
            Validasiya Başlat
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mr-4" />
            <div>
              <h3 className="text-lg font-medium">Validasiya işləyir...</h3>
              <p className="text-muted-foreground">
                Hierarchy strukturu yoxlanılır və problemlər axtarılır
              </p>
            </div>
          </div>
          <Progress value={undefined} className="mt-4" />
        </CardContent>
      </Card>
    );
  }

  if (!validation?.data) {
    return (
      <Alert className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Validasiya xətası</AlertTitle>
        <AlertDescription>
          Validasiya məlumatları yüklənərkən xəta baş verdi. Yenidən cəhd edin.
        </AlertDescription>
      </Alert>
    );
  }

  const { data } = validation;
  const healthScore = data.is_valid ? 100 : Math.max(0, 100 - (data.total_issues * 10));

  return (
    <div className={cn('space-y-4', className)}>
      {/* Validation Summary */}
      <Card className={data.is_valid ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {data.is_valid ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              )}
              <div>
                <CardTitle className={data.is_valid ? 'text-green-800' : 'text-amber-800'}>
                  {data.is_valid ? 'Hierarchy Sağlamdır' : 'Problemlər Tapıldı'}
                </CardTitle>
                <CardDescription className="mt-1">
                  {data.is_valid 
                    ? 'Bütün struktural yoxlamalar uğurla keçdi'
                    : `${data.total_issues} problem tapıldı və düzəldilmə tələb olunur`
                  }
                </CardDescription>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {healthScore}%
              </div>
              <div className="text-xs text-muted-foreground">
                Sağlamlıq səviyyəsi
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Son yoxlama: {new Date(data.checked_at).toLocaleString('az-AZ')}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onValidate}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Yenidən Yoxla
            </Button>
          </div>
          
          {/* Health Progress */}
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-muted-foreground">Struktur sağlamlığı</span>
              <span className="text-xs font-medium">{healthScore}%</span>
            </div>
            <Progress 
              value={healthScore} 
              className={cn(
                'h-2',
                healthScore >= 90 ? 'text-green-600' : 
                healthScore >= 70 ? 'text-amber-600' : 'text-red-600'
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      {!data.is_valid && data.issues.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Tapılan Problemlər</h3>
            <Badge variant="secondary">
              {data.total_issues} problem
            </Badge>
          </div>

          {data.issues.map((issue, index) => (
            <ValidationIssueCard key={index} issue={issue} />
          ))}
        </div>
      )}

      {/* Recommendations */}
      {!data.is_valid && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Tövsiyələr
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-medium text-muted-foreground">1.</span>
                <span>Yetim müəssisələri uyğun valideyn müəssisəyə bağlayın və ya silin</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-muted-foreground">2.</span>
                <span>Səviyyə uyğunsuzluqlarını düzəldərək düzgün hierarchy qurun</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-muted-foreground">3.</span>
                <span>Dövri referansları aradan qaldıraraq sağlam struktur yaradın</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-muted-foreground">4.</span>
                <span>Dəyişikliklər etdikdən sonra yenidən validasiya işlədin</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HierarchyValidation;