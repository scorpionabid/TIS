import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Search, 
  Download, 
  Filter,
  Building2,
  Users,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Eye
} from 'lucide-react';
import { scheduleService } from '@/services/schedule';
import { useAuth } from '@/contexts/AuthContext';
// import { regionAdminService } from '@/services/regionAdmin';

export default function RegionSchedules() {
  const { currentUser: user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);

  // Fetch regional institutions - mock data for testing
  const { data: institutionsData } = useQuery({
    queryKey: ['region-institutions', user?.institution_id],
    queryFn: () => Promise.resolve({ data: [] }),
    enabled: !!user?.institution_id,
  });

  // Fetch regional schedule overview
  const { data: scheduleOverview, isLoading } = useQuery({
    queryKey: ['region-schedule-overview', user?.institution_id, institutionFilter, statusFilter],
    queryFn: async () => {
      // This would be a new endpoint that aggregates schedule data across institutions
      const institutions = institutionsData?.data || [];
      const scheduleData = await Promise.all(
        institutions.map(async (institution) => {
          try {
            const schedules = await scheduleService.getSchedules({
              institution_id: institution.id,
              status: statusFilter === 'all' ? undefined : statusFilter,
            });
            return {
              institution,
              schedules: schedules.data || [],
              stats: calculateInstitutionStats(schedules.data || [])
            };
          } catch {
            return {
              institution,
              schedules: [],
              stats: { total: 0, active: 0, pending: 0, conflicts: 0 }
            };
          }
        })
      );
      return scheduleData;
    },
    enabled: !!institutionsData?.data,
  });

  // Fetch regional statistics
  const { data: regionalStats } = useQuery({
    queryKey: ['region-schedule-stats', user?.institution_id],
    queryFn: async () => {
      const overview = scheduleOverview || [];
      return calculateRegionalStats(overview);
    },
    enabled: !!scheduleOverview,
  });

  const institutions = institutionsData?.data || [];
  const overviewData = scheduleOverview || [];

  // Filter institutions based on search and institution filter
  const filteredOverview = overviewData.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.institution.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesInstitution = institutionFilter === 'all' || 
      item.institution.id.toString() === institutionFilter;
    
    return matchesSearch && matchesInstitution;
  });

  const stats = regionalStats || {
    totalInstitutions: 0,
    totalSchedules: 0,
    activeSchedules: 0,
    pendingApproval: 0,
    totalConflicts: 0,
    scheduleCoverage: 0,
    avgSchedulesPerInstitution: 0,
    institutionsWithIssues: 0
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Bölgə Cədvəl Nəzarəti</h1>
          <p className="text-gray-600">Bölgədəki bütün təşkilatların cədvəllərini izləyin</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Bölgə Hesabatı
          </Button>
        </div>
      </div>

      {/* Regional Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Təşkilat</p>
                <p className="text-2xl font-bold">{stats.totalInstitutions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ümumi Cədvəl</p>
                <p className="text-2xl font-bold">{stats.totalSchedules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Aktiv Cədvəl</p>
                <p className="text-2xl font-bold">{stats.activeSchedules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Gözləməde</p>
                <p className="text-2xl font-bold">{stats.pendingApproval}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Cədvəl Əhatəsi</span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold">{stats.scheduleCoverage}%</div>
            <div className="text-xs text-gray-500">Aktivlər/Ümumi</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Orta Cədvəl/Təşkilat</span>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">{stats.avgSchedulesPerInstitution}</div>
            <div className="text-xs text-gray-500">Hesabat dövründə</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Problem Olan</span>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold">{stats.institutionsWithIssues}</div>
            <div className="text-xs text-gray-500">Təşkilat</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Təşkilat Cədvəl Vəziyyəti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Təşkilat axtarın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Təşkilat seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün təşkilatlar</SelectItem>
                {institutions.map((institution) => (
                  <SelectItem key={institution.id} value={institution.id.toString()}>
                    {institution.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="pending_review">Gözləməde</SelectItem>
                <SelectItem value="draft">Layihə</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Institution Overview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredOverview.map((item) => (
              <Card key={item.institution.id} className="border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.institution.name}</CardTitle>
                      <p className="text-sm text-gray-600">{item.institution.type_name}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.stats.conflicts > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {item.stats.conflicts} konflikt
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedInstitution(item.institution)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{item.stats.total}</div>
                      <div className="text-xs text-gray-600">Ümumi</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{item.stats.active}</div>
                      <div className="text-xs text-gray-600">Aktiv</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{item.stats.pending}</div>
                      <div className="text-xs text-gray-600">Gözləməde</div>
                    </div>
                  </div>

                  {/* Latest Schedules */}
                  {item.schedules.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Son cədvəllər:</p>
                      {item.schedules.slice(0, 3).map((schedule) => (
                        <div key={schedule.id} className="flex items-center justify-between text-sm">
                          <span className="truncate flex-1">{schedule.name}</span>
                          <Badge 
                            variant={getStatusBadgeVariant(schedule.status)}
                            className="ml-2 text-xs"
                          >
                            {getStatusText(schedule.status)}
                          </Badge>
                        </div>
                      ))}
                      {item.schedules.length > 3 && (
                        <p className="text-xs text-gray-500">+{item.schedules.length - 3} əlavə</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Cədvəl yoxdur</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredOverview.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Təşkilat tapılmadı</h3>
              <p className="text-gray-600">
                {searchTerm || institutionFilter !== 'all' 
                  ? 'Axtarış kriteriyalarınıza uyğun təşkilat tapılmadı.'
                  : 'Bu bölgədə hələ təşkilat yoxdur.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Institution Detail Modal */}
      {selectedInstitution && (
        <InstitutionScheduleModal
          institution={selectedInstitution}
          onClose={() => setSelectedInstitution(null)}
        />
      )}
    </div>
  );
}

// Helper function to calculate institution stats
function calculateInstitutionStats(schedules: any[]) {
  return {
    total: schedules.length,
    active: schedules.filter(s => s.status === 'active').length,
    pending: schedules.filter(s => s.status === 'pending_review').length,
    conflicts: schedules.filter(s => s.conflicts && s.conflicts.length > 0).length,
  };
}

// Helper function to calculate regional stats
function calculateRegionalStats(overviewData: any[]) {
  const totalInstitutions = overviewData.length;
  const totalSchedules = overviewData.reduce((sum, item) => sum + item.stats.total, 0);
  const activeSchedules = overviewData.reduce((sum, item) => sum + item.stats.active, 0);
  const pendingApproval = overviewData.reduce((sum, item) => sum + item.stats.pending, 0);
  const totalConflicts = overviewData.reduce((sum, item) => sum + item.stats.conflicts, 0);
  
  return {
    totalInstitutions,
    totalSchedules,
    activeSchedules,
    pendingApproval,
    totalConflicts,
    scheduleCoverage: totalSchedules > 0 ? Math.round((activeSchedules / totalSchedules) * 100) : 0,
    avgSchedulesPerInstitution: totalInstitutions > 0 ? Math.round(totalSchedules / totalInstitutions) : 0,
    institutionsWithIssues: overviewData.filter(item => 
      item.stats.conflicts > 0 || item.stats.pending > item.stats.active
    ).length,
  };
}

// Helper functions for status badges
function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active': return 'default';
    case 'approved': return 'secondary';
    case 'pending_review': return 'outline';
    case 'draft': return 'destructive';
    default: return 'outline';
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'active': return 'Aktiv';
    case 'approved': return 'Təsdiqlənib';
    case 'pending_review': return 'Gözləməde';
    case 'draft': return 'Layihə';
    case 'inactive': return 'Deaktiv';
    default: return status;
  }
}

// Institution Detail Modal Component (simplified)
function InstitutionScheduleModal({ institution, onClose }: { institution: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{institution.name} - Cədvəl Təfərrüatı</h2>
          <Button variant="outline" onClick={onClose}>Bağla</Button>
        </div>
        <div className="space-y-4">
          <p>Bu təşkilatın cədvəl məlumatları burada göstəriləcək...</p>
          {/* Institution-specific schedule details would go here */}
        </div>
      </div>
    </div>
  );
}