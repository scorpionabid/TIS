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
  Building2,
  Calendar,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { taskService, TaskSubDelegation, AssignmentStatus } from '@/services/tasks';

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

const getStatusLabel = (status: AssignmentStatus) => {
  const config = statusConfig[status as keyof typeof statusConfig];
  return config?.label || status;
};

export function MyDelegationsTab() {
  const [delegations, setDelegations] = useState<TaskSubDelegation[]>([]);
  const [stats, setStats] = useState<DelegationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

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

  const filteredDelegations = delegations.filter((delegation) => {
    const matchesSearch = 
      delegation.delegatedToUser?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delegation.task?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delegation.delegatedToInstitution?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || delegation.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getDelegationsByStatus = (status: AssignmentStatus | 'all') => {
    if (status === 'all') return filteredDelegations;
    return filteredDelegations.filter(d => d.status === status);
  };

  useEffect(() => {
    fetchDelegations();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
        <RotateCcw className="h-8 w-8 animate-spin" />
        Yönləndirmələr yüklənir...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="shadow-none border-0 bg-muted/40 text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Ümumi</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-0 bg-yellow-50 dark:bg-yellow-900/20 text-center text-yellow-800 dark:text-yellow-300">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs opacity-70">Gözləyir</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-0 bg-blue-50 dark:bg-blue-900/20 text-center text-blue-800 dark:text-blue-300">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.accepted}</div>
              <p className="text-xs opacity-70">Qəbul edildi</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-0 bg-indigo-50 dark:bg-indigo-900/20 text-center text-indigo-800 dark:text-indigo-300">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.in_progress}</div>
              <p className="text-xs opacity-70">İcrada</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-0 bg-green-50 dark:bg-green-900/20 text-center text-green-800 dark:text-green-300">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs opacity-70">Tamamlandı</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-0 bg-muted/40 text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{Math.round(stats.average_progress)}%</div>
              <p className="text-xs text-muted-foreground">Orta progress</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Tapşırıq və ya istifadəçi axtar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-full sm:w-48 h-9 text-sm">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto p-1 bg-muted/50">
          <TabsTrigger value="all" className="py-2 px-3 text-xs md:text-sm">Bütün ({getDelegationsByStatus('all').length})</TabsTrigger>
          <TabsTrigger value="pending" className="py-2 px-3 text-xs md:text-sm">Gözləyir ({getDelegationsByStatus('pending').length})</TabsTrigger>
          <TabsTrigger value="accepted" className="py-2 px-3 text-xs md:text-sm">Qəbul edildi ({getDelegationsByStatus('accepted').length})</TabsTrigger>
          <TabsTrigger value="in_progress" className="py-2 px-3 text-xs md:text-sm">İcrada ({getDelegationsByStatus('in_progress').length})</TabsTrigger>
          <TabsTrigger value="completed" className="py-2 px-3 text-xs md:text-sm">Tamamlandı ({getDelegationsByStatus('completed').length})</TabsTrigger>
          <TabsTrigger value="cancelled" className="py-2 px-3 text-xs md:text-sm">Ləğv edildi ({getDelegationsByStatus('cancelled').length})</TabsTrigger>
        </TabsList>

        {(['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
          <TabsContent key={status} value={status} className="mt-4 space-y-4">
            {getDelegationsByStatus(status).length === 0 ? (
              <Card className="border-dashed shadow-none">
                <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
                  <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 opacity-20" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">Məlumat tapılmadı</h3>
                  <p className="text-sm">Bu statusda hər hansı yönləndirmə yoxdur</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {getDelegationsByStatus(status).map((delegation) => (
                  <Card key={delegation.id} className="group hover:border-primary/50 transition-colors shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="space-y-3 flex-1">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                {delegation.task?.title || 'Adsız Tapşırıq'}
                              </h3>
                              <Badge variant="outline" className={`bg-slate-50 text-xs border-${statusConfig[delegation.status as keyof typeof statusConfig]?.color || 'gray'}-200`}>
                                {getStatusIcon(delegation.status)}
                                <span className="ml-1">{getStatusLabel(delegation.status)}</span>
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-muted-foreground font-medium">
                              <div className="flex items-center gap-1.5">
                                <span className="p-1 rounded-full bg-primary/10">
                                  <Building2 className="h-3.5 w-3.5 text-primary" />
                                </span>
                                {delegation.delegatedToInstitution?.name || 'Müəssisə yoxdur'}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${delegation.progress}%` }} />
                                </div>
                                <span>{delegation.progress}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 pt-2 border-t border-muted">
                            <div className="space-y-1.5">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Yönləndirən</p>
                              <div className="flex items-center gap-2 text-sm">
                                <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold">
                                  {delegation.delegatedByUser?.name?.charAt(0) || 'U'}
                                </div>
                                <span className="font-medium">{delegation.delegatedByUser?.name || 'Bilinməyən istifadəçi'}</span>
                              </div>
                            </div>
                            {delegation.deadline && (
                              <div className="space-y-1.5">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Son Tarix</p>
                                <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {format(new Date(delegation.deadline), 'dd MMMM yyyy HH:mm', { locale: az })}
                                </div>
                              </div>
                            )}
                          </div>

                          {(delegation.delegation_notes || delegation.completion_notes) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                              {delegation.delegation_notes && (
                                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-md border border-amber-100 dark:border-amber-900/30">
                                  <p className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-500 mb-1">Yönləndirmə Qeydi</p>
                                  <p className="text-xs text-amber-900 dark:text-amber-400 line-clamp-2">{delegation.delegation_notes}</p>
                                </div>
                              )}
                              {delegation.completion_notes && (
                                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                                  <p className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-500 mb-1">Tamamlama Qeydi</p>
                                  <p className="text-xs text-emerald-900 dark:text-emerald-400 line-clamp-2">{delegation.completion_notes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 self-end md:self-center">
                          <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold hover:bg-primary/5 hover:text-primary">
                            Detallara bax
                          </Button>
                        </div>
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
}
