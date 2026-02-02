import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  RotateCcw,
  User,
  Building2,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { TaskSubDelegation, AssignmentStatus } from '@/services/tasks';

interface SubDelegationTrackerProps {
  delegations: TaskSubDelegation[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

const statusConfig = {
  pending: {
    label: 'Gözləyir',
    color: 'yellow',
    icon: Clock,
  },
  accepted: {
    label: 'Qəbul edildi',
    color: 'blue',
    icon: CheckCircle,
  },
  in_progress: {
    label: 'İcrada',
    color: 'indigo',
    icon: RotateCcw,
  },
  completed: {
    label: 'Tamamlandı',
    color: 'green',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Ləğv edildi',
    color: 'red',
    icon: XCircle,
  },
};

const getStatusIcon = (status: AssignmentStatus) => {
  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = config?.icon || AlertCircle;
  return <Icon className="h-4 w-4" />;
};

const getStatusColor = (status: AssignmentStatus) => {
  const config = statusConfig[status as keyof typeof statusConfig];
  return config?.color || 'gray';
};

const getStatusLabel = (status: AssignmentStatus) => {
  const config = statusConfig[status as keyof typeof statusConfig];
  return config?.label || status;
};

export const SubDelegationTracker: React.FC<SubDelegationTrackerProps> = ({
  delegations,
  onRefresh,
  isLoading = false,
}) => {
  // Calculate overall progress
  const activeDelegations = delegations.filter(d => d.status !== 'cancelled');
  const totalProgress = activeDelegations.length > 0
    ? Math.round(activeDelegations.reduce((sum, d) => sum + d.progress, 0) / activeDelegations.length)
    : 0;

  const completedCount = activeDelegations.filter(d => d.status === 'completed').length;
  const totalCount = activeDelegations.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">
          📊 Yönləndirmə Statusu
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {completedCount}/{totalCount} tamamlandı
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RotateCcw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Yenilə
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Ümumi progress</span>
            <span className="font-medium">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>

        {/* Delegations List */}
        <div className="space-y-3">
          {delegations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Yönləndirmələr yoxdur</p>
            </div>
          ) : (
            delegations.map((delegation) => (
              <Card key={delegation.id} className="border-l-4 border-l-gray-200">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      {/* User Info */}
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {delegation.delegatedToUser?.name || 'İstifadəçi'}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {delegation.delegatedToUser?.email}
                        </Badge>
                      </div>

                      {/* Institution */}
                      {delegation.delegatedToInstitution && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Building2 className="h-3 w-3" />
                          <span>{delegation.delegatedToInstitution.name}</span>
                        </div>
                      )}

                      {/* Status and Progress */}
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(delegation.status)}
                          <span className="text-sm font-medium">
                            Status: {getStatusLabel(delegation.status)}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs border-${getStatusColor(delegation.status)}-200`}
                        >
                          {getStatusLabel(delegation.status)}
                        </Badge>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Progress</span>
                          <span>{delegation.progress}%</span>
                        </div>
                        <Progress value={delegation.progress} className="h-1" />
                      </div>

                      {/* Dates */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {delegation.deadline && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Deadline: {format(new Date(delegation.deadline), 'dd.MM.yyyy HH:mm', { locale: az })}
                            </span>
                          </div>
                        )}
                        {delegation.completed_at && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>
                              Tamamlama: {format(new Date(delegation.completed_at), 'dd.MM.yyyy HH:mm', { locale: az })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {delegation.delegation_notes && (
                        <div className="p-2 bg-gray-50 rounded text-sm">
                          <span className="font-medium">Yönləndirmə qeydləri:</span>
                          <p className="mt-1 text-gray-600">{delegation.delegation_notes}</p>
                        </div>
                      )}

                      {/* Completion Notes */}
                      {delegation.completion_notes && (
                        <div className="p-2 bg-green-50 rounded text-sm">
                          <span className="font-medium text-green-800">Tamamlama qeydləri:</span>
                          <p className="mt-1 text-green-700">{delegation.completion_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="ml-4">
                      <Badge
                        variant="outline"
                        className={`border-${getStatusColor(delegation.status)}-200`}
                      >
                        {getStatusIcon(delegation.status)}
                        <span className="ml-1">{getStatusLabel(delegation.status)}</span>
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {delegations.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {delegations.filter(d => d.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Gözləyir</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {delegations.filter(d => d.status === 'in_progress').length}
              </div>
              <div className="text-sm text-gray-600">İcrada</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {delegations.filter(d => d.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Tamamlandı</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {delegations.filter(d => d.status === 'cancelled').length}
              </div>
              <div className="text-sm text-gray-600">Ləğv edildi</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
