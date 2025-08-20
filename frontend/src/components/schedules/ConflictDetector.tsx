import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle,
  Clock,
  Users,
  MapPin,
  Calendar,
  CheckCircle,
  X,
  RefreshCw,
  Eye,
  Settings,
  Zap,
  AlertCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { scheduleService, ScheduleConflict, ScheduleSlot } from '@/services/schedule';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

interface ConflictDetectorProps {
  scheduleId?: number;
  scheduleSlots?: ScheduleSlot[];
  onConflictResolve?: (conflictId: number) => void;
  autoDetect?: boolean;
  className?: string;
}

interface ConflictGroup {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conflicts: ScheduleConflict[];
  count: number;
}

export const ConflictDetector: React.FC<ConflictDetectorProps> = ({
  scheduleId,
  scheduleSlots,
  onConflictResolve,
  autoDetect = true,
  className
}) => {
  const { toast } = useToast();
  const [detecting, setDetecting] = useState(false);
  const [selectedConflictType, setSelectedConflictType] = useState<string>('all');

  // Fetch conflicts for schedule
  const { 
    data: conflicts, 
    isLoading, 
    refetch,
    error 
  } = useQuery({
    queryKey: ['schedule-conflicts', scheduleId],
    queryFn: () => scheduleId ? scheduleService.getScheduleConflicts(scheduleId) : Promise.resolve([]),
    enabled: !!scheduleId,
    refetchInterval: autoDetect ? 30000 : false, // Auto-refresh every 30 seconds
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Run real-time detection
  const runConflictDetection = async () => {
    if (!scheduleId) return;
    
    setDetecting(true);
    try {
      await scheduleService.detectConflicts(scheduleId);
      await refetch();
      toast({
        title: "Konflikt Axtarışı Tamamlandı",
        description: "Yeni konfliktlər yoxlandı və nəticələr yeniləndi",
      });
    } catch (error) {
      toast({
        title: "Xəta",
        description: "Konflikt axtarışı zamanı xəta baş verdi",
        variant: "destructive",
      });
    } finally {
      setDetecting(false);
    }
  };

  // Group conflicts by type and severity
  const conflictGroups: ConflictGroup[] = React.useMemo(() => {
    if (!conflicts) return [];

    const groups: Record<string, ConflictGroup> = {};
    
    conflicts.forEach(conflict => {
      const key = conflict.conflict_type;
      if (!groups[key]) {
        groups[key] = {
          type: conflict.conflict_type,
          severity: 'low',
          conflicts: [],
          count: 0
        };
      }
      
      groups[key].conflicts.push(conflict);
      groups[key].count++;
      
      // Determine highest severity for group
      if (conflict.severity === 'critical') groups[key].severity = 'critical';
      else if (conflict.severity === 'high' && groups[key].severity !== 'critical') groups[key].severity = 'high';
      else if (conflict.severity === 'medium' && !['critical', 'high'].includes(groups[key].severity)) groups[key].severity = 'medium';
    });

    return Object.values(groups).sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [conflicts]);

  // Filter conflicts by selected type
  const filteredConflicts = React.useMemo(() => {
    if (!conflicts) return [];
    if (selectedConflictType === 'all') return conflicts;
    return conflicts.filter(conflict => conflict.conflict_type === selectedConflictType);
  }, [conflicts, selectedConflictType]);

  const getConflictTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'teacher_conflict': 'Müəllim Konflikti',
      'room_conflict': 'Otaq Konflikti',
      'resource_conflict': 'Resurs Konflikti',
      'time_overlap': 'Vaxt Üst-üstə Düşməsi',
      'capacity_exceeded': 'Tutum Aşımı',
      'schedule_gap': 'Cədvəl Boşluğu',
      'invalid_duration': 'Yanlış Müddət',
      'business_rule_violation': 'İş Qaydası Pozuntu',
      'optimization_suggestion': 'Optimallaşdırma Təklifi'
    };
    return labels[type] || type;
  };

  const getConflictTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      'teacher_conflict': Users,
      'room_conflict': MapPin,
      'resource_conflict': Settings,
      'time_overlap': Clock,
      'capacity_exceeded': AlertTriangle,
      'schedule_gap': Calendar,
      'invalid_duration': Clock,
      'business_rule_violation': AlertCircle,
      'optimization_suggestion': Zap
    };
    return icons[type] || AlertTriangle;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityLabel = (severity: string): string => {
    const labels: Record<string, string> = {
      'critical': 'Kritik',
      'high': 'Yüksək',
      'medium': 'Orta',
      'low': 'Aşağı'
    };
    return labels[severity] || severity;
  };

  const handleResolveConflict = async (conflictId: number) => {
    try {
      await scheduleService.resolveConflict(conflictId);
      await refetch();
      onConflictResolve?.(conflictId);
      toast({
        title: "Konflikt Həll Edildi",
        description: "Konflikt uğurla həll edildi və cədvəl yeniləndi",
      });
    } catch (error) {
      toast({
        title: "Xəta",
        description: "Konflikti həll etməkdə xəta baş verdi",
        variant: "destructive",
      });
    }
  };

  const handleIgnoreConflict = async (conflictId: number) => {
    try {
      await scheduleService.ignoreConflict(conflictId);
      await refetch();
      toast({
        title: "Konflikt Nəzərə Alınmadı",
        description: "Konflikt nəzərə alınmayacaq kimi işarələndi",
      });
    } catch (error) {
      toast({
        title: "Xəta",
        description: "Konflikti nəzərə almamaqda xəta baş verdi",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Konflikt Axtarışı Xətası
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Xəta</AlertTitle>
            <AlertDescription>
              Konflikt məlumatları yüklənmədi. Səhifəni yeniləyin və ya sistem administratoru ilə əlaqə saxlayın.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Konflikt Axtarış Sistemi
            </CardTitle>
            <CardDescription>
              Dərs cədvəlində avtomatik konflikt aşkarlanması və həll təklifləri
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runConflictDetection}
              disabled={detecting || isLoading || !scheduleId}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", detecting && "animate-spin")} />
              {detecting ? 'Yoxlanır...' : 'Yenidən Yoxla'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Conflict Summary */}
        {conflictGroups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {conflictGroups.map((group) => {
              const IconComponent = getConflictTypeIcon(group.type);
              return (
                <Card 
                  key={group.type} 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedConflictType === group.type && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedConflictType(
                    selectedConflictType === group.type ? 'all' : group.type
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        group.severity === 'critical' ? "bg-destructive/10" :
                        group.severity === 'high' ? "bg-destructive/10" :
                        group.severity === 'medium' ? "bg-warning/10" : "bg-secondary/10"
                      )}>
                        <IconComponent className={cn(
                          "h-4 w-4",
                          group.severity === 'critical' ? "text-destructive" :
                          group.severity === 'high' ? "text-destructive" :
                          group.severity === 'medium' ? "text-warning" : "text-secondary"
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{getConflictTypeLabel(group.type)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-bold">{group.count}</span>
                          <Badge variant={getSeverityColor(group.severity)} className="text-xs">
                            {getSeverityLabel(group.severity)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Filter Controls */}
        {conflictGroups.length > 0 && (
          <div className="flex items-center gap-4">
            <Button
              variant={selectedConflictType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedConflictType('all')}
            >
              Hamısı ({conflicts?.length || 0})
            </Button>
            {conflictGroups.map((group) => (
              <Button
                key={group.type}
                variant={selectedConflictType === group.type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedConflictType(group.type)}
              >
                {getConflictTypeLabel(group.type)} ({group.count})
              </Button>
            ))}
          </div>
        )}

        <Separator />

        {/* Conflict List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Konfliktlər yüklənir...</span>
          </div>
        ) : filteredConflicts.length > 0 ? (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {filteredConflicts.map((conflict) => {
                const IconComponent = getConflictTypeIcon(conflict.conflict_type);
                return (
                  <Card key={conflict.id} className="border-l-4 border-l-destructive">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          conflict.severity === 'critical' ? "bg-destructive/10" :
                          conflict.severity === 'high' ? "bg-destructive/10" :
                          conflict.severity === 'medium' ? "bg-warning/10" : "bg-secondary/10"
                        )}>
                          <IconComponent className={cn(
                            "h-4 w-4",
                            conflict.severity === 'critical' ? "text-destructive" :
                            conflict.severity === 'high' ? "text-destructive" :
                            conflict.severity === 'medium' ? "text-warning" : "text-secondary"
                          )} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-sm">
                                {getConflictTypeLabel(conflict.conflict_type)}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {conflict.description}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Badge variant={getSeverityColor(conflict.severity)} className="text-xs">
                                {getSeverityLabel(conflict.severity)}
                              </Badge>
                              {conflict.status && (
                                <Badge variant="outline" className="text-xs">
                                  {conflict.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {conflict.details && (
                            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground">
                                <strong>Ətraflı:</strong> {conflict.details}
                              </p>
                            </div>
                          )}

                          {conflict.suggestion && (
                            <div className="mt-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                              <p className="text-xs text-primary">
                                <strong>Təklif:</strong> {conflict.suggestion}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>
                                Aşkarlandı: {format(new Date(conflict.detected_at), 'dd MMM yyyy HH:mm', { locale: az })}
                              </span>
                              {conflict.auto_detected && (
                                <Badge variant="outline" className="text-xs">
                                  Avtomatik
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleIgnoreConflict(conflict.id)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Nəzərə Alma
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleResolveConflict(conflict.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Həll Et
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Konflikt Tapılmadı</h3>
            <p className="text-muted-foreground">
              {selectedConflictType === 'all' 
                ? 'Dərs cədvəlində heç bir konflikt aşkarlanmadı' 
                : `${getConflictTypeLabel(selectedConflictType)} tipində konflikt yoxdur`
              }
            </p>
            {scheduleId && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={runConflictDetection}
                disabled={detecting}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", detecting && "animate-spin")} />
                Yenidən Yoxla
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};