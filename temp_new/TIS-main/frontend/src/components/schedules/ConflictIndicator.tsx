import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScheduleConflict } from '@/services/schedule';

interface ConflictIndicatorProps {
  conflicts: ScheduleConflict[];
  onResolveConflict?: (conflictId: number) => void;
  className?: string;
}

export const ConflictIndicator: React.FC<ConflictIndicatorProps> = ({
  conflicts,
  onResolveConflict,
  className
}) => {
  const getConflictSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-700';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      default: return 'bg-blue-100 border-blue-500 text-blue-700';
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'teacher_conflict': return 'Müəllim';
      case 'room_conflict': return 'Otaq';
      case 'class_conflict': return 'Sinif';
      case 'time_conflict': return 'Vaxt';
      default: return 'Naməlum';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Kritik';
      case 'high': return 'Yüksək';
      case 'medium': return 'Orta';
      case 'low': return 'Aşağı';
      default: return 'Naməlum';
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'destructive' as const;
      case 'medium':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Konflikt Analizi
        </CardTitle>
        <CardDescription>
          Dərs cədvəlindəki konfliktlər və xəbərdarlıqlar
        </CardDescription>
      </CardHeader>
      <CardContent>
        {conflicts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-700 mb-2">Konflikt tapılmadı</h3>
            <p className="text-muted-foreground">Dərs cədvəli konfliktsizidir və hazırdır</p>
          </div>
        ) : (
          <div className="space-y-4">
            {conflicts.map((conflict, index) => (
              <div
                key={conflict.id || index}
                className={cn(
                  "p-4 rounded-lg border-l-4",
                  getConflictSeverityColor(conflict.severity)
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {getConflictTypeLabel(conflict.type)} Konflikti
                      </Badge>
                      <Badge variant={getSeverityVariant(conflict.severity)}>
                        {getSeverityLabel(conflict.severity)}
                      </Badge>
                    </div>
                    <p className="font-medium mb-1">{conflict.description}</p>
                    {conflict.suggestions && conflict.suggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Təkliflər:</p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {conflict.suggestions.map((suggestion, idx) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {conflict.auto_resolvable && onResolveConflict && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onResolveConflict(conflict.id)}
                    >
                      Avtomatik həll et
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};