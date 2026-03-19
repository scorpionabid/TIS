import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { gradeBookAuditService, AuditLog } from '@/services/gradeBookAudit';
import { Clock, User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GradeHistoryProps {
  gradeBookId: number;
  studentId?: number;
  cellId?: number;
}

export function GradeHistory({ gradeBookId, studentId, cellId }: GradeHistoryProps) {
  const [showAll, setShowAll] = useState(false);

  const { data: auditLogs, isLoading, error } = useQuery({
    queryKey: ['grade-history', gradeBookId, studentId, cellId],
    queryFn: async () => {
      if (cellId) {
        const response = await gradeBookAuditService.getCellHistory(cellId);
        return response.data || [];
      }
      if (studentId) {
        const response = await gradeBookAuditService.getStudentHistory(gradeBookId, studentId);
        return response.data || [];
      }
      const response = await gradeBookAuditService.getAuditLogs(gradeBookId);
      return response.data?.data || [];
    },
  });

  const displayedLogs = showAll ? auditLogs : auditLogs?.slice(0, 10);

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'update':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'bulk_update':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'column_archive':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return 'Yeni';
      case 'update':
        return 'Dəyişiklik';
      case 'bulk_update':
        return 'Toplu';
      case 'column_archive':
        return 'Arxiv';
      default:
        return actionType;
    }
  };

  const getScoreChangeIndicator = (oldScore: number | null, newScore: number | null) => {
    if (oldScore === null || newScore === null) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    const diff = newScore - oldScore;
    if (diff > 0) {
      return <span className="text-green-500 text-xs">↑ {diff}</span>;
    } else if (diff < 0) {
      return <span className="text-red-500 text-xs">↓ {Math.abs(diff)}</span>;
    }
    return <span className="text-gray-400 text-xs">=</span>;
  };

  if (isLoading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-slate-600">Yüklənir...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-600">Tarixçə yüklənərkən xəta baş verdi</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Bal Tarixçəsi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-slate-500 text-center py-8">
            Hələ heç bir dəyişiklik qeyd edilməyib
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Bal Tarixçəsi
          <Badge variant="outline" className="ml-2">
            {auditLogs.length} dəyişiklik
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y divide-slate-100">
            {displayedLogs?.map((log: AuditLog) => (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={cn('text-xs', getActionColor(log.action_type))}
                      >
                        {getActionLabel(log.action_type)}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        {new Date(log.created_at).toLocaleString('az-AZ', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium">
                        {log.user?.first_name} {log.user?.last_name}
                      </span>
                    </div>

                    {log.student && (
                      <div className="text-sm text-slate-600 mb-2">
                        <span className="font-medium">
                          {log.student.last_name} {log.student.first_name}
                        </span>
                        {log.column && (
                          <span className="text-slate-400 ml-2">
                            ({log.column.column_label})
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      {log.old_score !== null && (
                        <span className="text-slate-400 line-through">
                          {log.old_score}
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                      <span className={cn(
                        'font-semibold',
                        log.new_score !== null && log.new_score >= 80
                          ? 'text-green-600'
                          : log.new_score !== null && log.new_score >= 60
                          ? 'text-yellow-600'
                          : log.new_score !== null && log.new_score >= 30
                          ? 'text-orange-600'
                          : 'text-red-600'
                      )}>
                        {log.new_score ?? '-'}
                      </span>
                      {getScoreChangeIndicator(log.old_score, log.new_score)}
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 text-right">
                    <div>{log.ip_address}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {auditLogs.length > 10 && !showAll && (
          <div className="p-4 border-t border-slate-100">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAll(true)}
            >
              Daha çox göstər ({auditLogs.length - 10} ədəd)
            </Button>
          </div>
        )}

        {showAll && auditLogs.length > 10 && (
          <div className="p-4 border-t border-slate-100">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAll(false)}
            >
              Daha az göstər
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
