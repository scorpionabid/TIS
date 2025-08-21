import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Settings, 
  Download, 
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Users,
  BookOpen
} from 'lucide-react';
import { scheduleService } from '@/services/schedule';
import { useAuth } from '@/contexts/AuthContext';
import { ScheduleBuilder } from '@/components/schedules/ScheduleBuilder';
import { ScheduleView } from '@/components/schedules/ScheduleView';
import { ConflictDetector } from '@/components/schedules/ConflictDetector';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface SchoolScheduleManagementProps {}

export default function SchoolScheduleManagement({}: SchoolScheduleManagementProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'builder' | 'conflicts'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch school schedules
  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['school-schedules', user?.institution_id, statusFilter, searchTerm],
    queryFn: async () => {
      return scheduleService.getSchedules({
        status: statusFilter === 'all' ? undefined : statusFilter,
        institution_id: user?.institution_id,
        search: searchTerm || undefined,
      });
    },
    enabled: !!user?.institution_id,
  });

  // Fetch schedule statistics
  const { data: statsData } = useQuery({
    queryKey: ['schedule-statistics', user?.institution_id],
    queryFn: () => scheduleService.getScheduleStatistics(),
    enabled: !!user?.institution_id,
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleId: number) => scheduleService.deleteSchedule(scheduleId),
    onSuccess: () => {
      toast.success('Cədvəl uğurla silindi');
      queryClient.invalidateQueries({ queryKey: ['school-schedules'] });
    },
    onError: (error: any) => {
      toast.error('Cədvəl silinərkən xəta baş verdi');
    },
  });

  // Generate schedule mutation
  const generateScheduleMutation = useMutation({
    mutationFn: (data: any) => scheduleService.generateSchedule(data),
    onSuccess: () => {
      toast.success('Cədvəl uğurla yaradıldı');
      queryClient.invalidateQueries({ queryKey: ['school-schedules'] });
    },
    onError: (error: any) => {
      toast.error('Cədvəl yaradılarkən xəta baş verdi');
    },
  });

  const schedules = schedulesData?.data || [];
  const stats = statsData?.data || {
    total_schedules: 0,
    active_schedules: 0,
    pending_approval: 0,
    total_slots: 0,
    teachers_with_schedules: 0,
    classes_with_schedules: 0,
  };

  const filteredSchedules = schedules.filter(schedule =>
    searchTerm === '' || 
    schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteSchedule = (schedule: any) => {
    if (schedule.status === 'active') {
      toast.error('Aktiv cədvəl silinə bilməz');
      return;
    }
    
    if (confirm(`"${schedule.name}" cədvəlini silmək istədiyinizdən əminsiniz?`)) {
      deleteScheduleMutation.mutate(schedule.id);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'approved': return 'secondary';
      case 'pending_review': return 'outline';
      case 'draft': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'approved': return 'Təsdiqlənib';
      case 'pending_review': return 'Gözləməde';
      case 'draft': return 'Layihə';
      case 'inactive': return 'Deaktiv';
      default: return status;
    }
  };

  if (schedulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cədvəl İdarəetməsi</h1>
          <p className="text-gray-600">Məktəb cədvəllərini yaradın və idarə edin</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setSelectedTab('builder')}
            disabled={generateScheduleMutation.isPending}
          >
            <Settings className="h-4 w-4 mr-2" />
            Avtomatik Yaradın
          </Button>
          
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Cədvəl
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Yeni Cədvəl Yaradın</DialogTitle>
              </DialogHeader>
              <ScheduleBuilder 
                onSave={() => {
                  setShowCreateModal(false);
                  queryClient.invalidateQueries({ queryKey: ['school-schedules'] });
                }}
                onCancel={() => setShowCreateModal(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Ümumi cədvəl</p>
                <p className="text-2xl font-bold">{stats.total_schedules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Aktiv</p>
                <p className="text-2xl font-bold">{stats.active_schedules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Gözləməde</p>
                <p className="text-2xl font-bold">{stats.pending_approval}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Dərs saatı</p>
                <p className="text-2xl font-bold">{stats.total_slots}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-sm text-gray-600">Müəllim</p>
                <p className="text-2xl font-bold">{stats.teachers_with_schedules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-teal-600" />
              <div>
                <p className="text-sm text-gray-600">Sinif</p>
                <p className="text-2xl font-bold">{stats.classes_with_schedules}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b">
        <Button
          variant={selectedTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('overview')}
          className="pb-2"
        >
          Ümumi Baxış
        </Button>
        <Button
          variant={selectedTab === 'builder' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('builder')}
          className="pb-2"
        >
          Cədvəl Yaradıcısı
        </Button>
        <Button
          variant={selectedTab === 'conflicts' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('conflicts')}
          className="pb-2"
        >
          Konflikt Yoxlama
        </Button>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cədvəl Siyahısı</CardTitle>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cədvəl axtarın..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="pending_review">Gözləməde</SelectItem>
                    <SelectItem value="draft">Layihə</SelectItem>
                    <SelectItem value="inactive">Deaktiv</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  İxrac et
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {filteredSchedules.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Cədvəl tapılmadı</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Axtarış kriteriyalarınıza uyğun cədvəl tapılmadı.'
                    : 'Hələ heç bir cədvəl yaradılmayıb.'
                  }
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  İlk cədvəli yaradın
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSchedules.map((schedule) => (
                  <div key={schedule.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{schedule.name}</h3>
                          <Badge variant={getStatusBadgeVariant(schedule.status)}>
                            {getStatusText(schedule.status)}
                          </Badge>
                          <Badge variant="outline">{schedule.type}</Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          <p>Müddət: {schedule.effective_from} - {schedule.effective_to || 'Müddətsiz'}</p>
                          {schedule.notes && <p>Qeyd: {schedule.notes}</p>}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Yaradıb: {schedule.creator?.first_name} {schedule.creator?.last_name}</span>
                          <span>Tarix: {new Date(schedule.created_at).toLocaleDateString('az-AZ')}</span>
                          {schedule.approved_by && (
                            <span>Təsdiqləyib: {schedule.approver?.first_name} {schedule.approver?.last_name}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSchedule(schedule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSchedule(schedule)}
                          disabled={schedule.status === 'active' || deleteScheduleMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedTab === 'builder' && (
        <Card>
          <CardHeader>
            <CardTitle>Avtomatik Cədvəl Yaradıcısı</CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduleBuilder 
              onSave={() => queryClient.invalidateQueries({ queryKey: ['school-schedules'] })}
              isGenerating={generateScheduleMutation.isPending}
            />
          </CardContent>
        </Card>
      )}

      {selectedTab === 'conflicts' && (
        <Card>
          <CardHeader>
            <CardTitle>Konflikt Yoxlama</CardTitle>
          </CardHeader>
          <CardContent>
            <ConflictDetector schedules={filteredSchedules} />
          </CardContent>
        </Card>
      )}

      {/* Schedule Detail Modal */}
      {selectedSchedule && (
        <Dialog open={!!selectedSchedule} onOpenChange={() => setSelectedSchedule(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{selectedSchedule.name}</DialogTitle>
            </DialogHeader>
            <ScheduleView 
              schedule={selectedSchedule} 
              onClose={() => setSelectedSchedule(null)}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['school-schedules'] });
                setSelectedSchedule(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}