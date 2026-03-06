import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  CheckCircle, 
  RotateCcw, 
  AlertCircle, 
  XCircle,
  User,
  Building2,
  Calendar,
  Filter,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { taskService, TaskSubDelegation, AssignmentStatus } from '@/services/tasks';
import { SubDelegationTracker } from '@/components/tasks/SubDelegationTracker';

interface DelegationStats {
  total: number;
  pending: number;
  accepted: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  average_progress: number;
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

export default function MyDelegations() {
  const [delegations, setDelegations] = useState<TaskSubDelegation[]>([]);
  const [stats, setStats] = useState<DelegationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  // Fetch delegations
  const fetchDelegations = async () => {
    try {
      setIsLoading(true);
      const [delegationsData, statsData] = await Promise.all([
        taskService.getMyDelegations(),
        taskService.getMyDelegationStats(),
      ]);

      setDelegations(delegationsData.data || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching delegations:', error);
      toast({
        title: 'Xəta',
        description: 'Yönləndirmələr yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter delegations
  const filteredDelegations = delegations.filter((delegation) => {
    const matchesSearch = 
      delegation.delegatedToUser?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delegation.task?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delegation.delegatedToInstitution?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || delegation.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Get delegations by status for tabs
  const getDelegationsByStatus = (status: AssignmentStatus | 'all') => {
    if (status === 'all') return filteredDelegations;
    return filteredDelegations.filter(d => d.status === status);
  };

  useEffect(() => {
    fetchDelegations();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mənim Yönləndirmələrim</h1>
          <p className="text-gray-600">Sizə yönləndirilmiş tapşırıqlar</p>
        </div>
        <Button onClick={fetchDelegations} disabled={isLoading}>
          <RotateCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Yenilə
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Ümumi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Gözləyir</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.accepted}</div>
              <p className="text-xs text-muted-foreground">Qəbul edildi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-indigo-600">{stats.in_progress}</div>
              <p className="text-xs text-muted-foreground">İcrada</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">Tamamlandı</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{Math.round(stats.average_progress)}%</div>
              <p className="text-xs text-muted-foreground">Orta progress</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Tapşırıq və ya istifadəçi axtar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün statuslar</SelectItem>
                  <SelectItem value="pending">Gözləyir</SelectItem>
                  <SelectItem value="accepted">Qəbul edildi</SelectItem>
                  <SelectItem value="in_progress">İcrada</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="cancelled">Ləğv edildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delegations List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">
            Bütün ({getDelegationsByStatus('all').length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Gözləyir ({getDelegationsByStatus('pending').length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Qəbul edildi ({getDelegationsByStatus('accepted').length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            İcrada ({getDelegationsByStatus('in_progress').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Tamamlandı ({getDelegationsByStatus('completed').length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Ləğv edildi ({getDelegationsByStatus('cancelled').length})
          </TabsTrigger>
        </TabsList>

        {(['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {getDelegationsByStatus(status).length === 0 ? (
              <Card>
                <CardContent className="pt-12 text-center">
                  <Clock className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {status === 'all' ? 'Yönləndirmə yoxdur' : `${getStatusLabel(status)} yönləndirmə yoxdur`}
                  </h3>
                  <p className="text-gray-500">
                    {status === 'all' 
                      ? 'Hələ-hansı yönləndirmə tapılmadı'
                      : `Bu statusda yönləndirmə tapılmadı`
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {getDelegationsByStatus(status).map((delegation) => (
                  <Card key={delegation.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Task Title */}
                          <div>
                            <h3 className="font-semibold text-lg">
                              {delegation.task?.title || 'Tapşırıq'}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline">
                                {getStatusIcon(delegation.status)}
                                <span className="ml-1">{getStatusLabel(delegation.status)}</span>
                              </Badge>
                              <Badge variant="secondary">
                                Progress: {delegation.progress}%
                              </Badge>
                            </div>
                          </div>

                          {/* Delegated By */}
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>Yönləndirən:</span>
                            <span className="font-medium">
                              {delegation.delegatedByUser?.name || 'Bilinməyən'}
                            </span>
                            {delegation.delegatedByUser?.email && (
                              <span>({delegation.delegatedByUser.email})</span>
                            )}
                          </div>

                          {/* Dates */}
                          <div className="flex items-center space-x-6 text-sm text-gray-500">
                            {delegation.deadline && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  Deadline: {format(new Date(delegation.deadline), 'dd.MM.yyyy HH:mm', { locale: az })}
                                </span>
                              </div>
                            )}
                            {delegation.accepted_at && (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-blue-500" />
                                <span>
                                  Qəbul: {format(new Date(delegation.accepted_at), 'dd.MM.yyyy HH:mm', { locale: az })}
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
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm font-medium text-blue-800 mb-1">Yönləndirmə qeydləri:</p>
                              <p className="text-sm text-blue-700">{delegation.delegation_notes}</p>
                            </div>
                          )}

                          {delegation.completion_notes && (
                            <div className="p-3 bg-green-50 rounded-lg">
                              <p className="text-sm font-medium text-green-800 mb-1">Tamamlama qeydləri:</p>
                              <p className="text-sm text-green-700">{delegation.completion_notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Institution */}
                        {delegation.delegatedToInstitution && (
                          <div className="ml-4 text-right">
                            <div className="flex items-center space-x-1 text-sm text-gray-600">
                              <Building2 className="h-4 w-4" />
                              <span>{delegation.delegatedToInstitution.name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
