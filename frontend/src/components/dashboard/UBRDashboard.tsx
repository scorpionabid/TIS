import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar,
  Clock,
  Users,
  MapPin,
  Trophy,
  Camera,
  Plane,
  Music,
  Palette,
  BookOpen,
  Plus,
  Edit,
  Eye,
  RefreshCw,
  Star,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
  CalendarDays,
  Globe,
  Heart
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { schoolAdminService, schoolAdminKeys } from '@/services/schoolAdmin';
import { formatDistanceToNow, format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Event {
  id: number;
  title: string;
  type: 'academic' | 'cultural' | 'sports' | 'exam' | 'trip' | 'competition';
  date: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  participants: number;
  location: string;
  priority: 'low' | 'medium' | 'high';
}

export const UBRDashboard: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard stats
  const { 
    data: stats, 
    isLoading: statsLoading,
    refetch: refetchStats 
  } = useQuery({
    queryKey: [...schoolAdminKeys.dashboardStats(), 'ubr'],
    queryFn: () => schoolAdminService.getDashboardStats(),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
      ]);
      toast.success('Məlumatlar yeniləndi');
    } catch (error) {
      toast.error('Yeniləmə zamanı xəta baş verdi');
    } finally {
      setRefreshing(false);
    }
  };

  // Mock data for events
  const upcomingEvents: Event[] = [
    {
      id: 1,
      title: "Respublika Tarix Olimpiadası",
      type: "competition",
      date: "2024-08-20",
      status: "planned",
      participants: 15,
      location: "Bakı",
      priority: "high"
    },
    {
      id: 2,
      title: "Milli Kitab Günü Tədbiri",
      type: "cultural",
      date: "2024-08-18",
      status: "active",
      participants: 120,
      location: "Məktəb Aktı",
      priority: "medium"
    },
    {
      id: 3,
      title: "Şəhidlər Xiyabanına Ekskursiya",
      type: "trip",
      date: "2024-08-25",
      status: "planned",
      participants: 45,
      location: "Bakı",
      priority: "medium"
    }
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'competition': return Trophy;
      case 'cultural': return Palette;
      case 'sports': return Users;
      case 'trip': return Plane;
      case 'academic': return BookOpen;
      case 'exam': return FileText;
      default: return Calendar;
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'competition': return 'Yarış';
      case 'cultural': return 'Mədəni';
      case 'sports': return 'İdman';
      case 'trip': return 'Ekskursiya';
      case 'academic': return 'Akademik';
      case 'exam': return 'İmtahan';
      default: return 'Tədbir';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'active': return 'warning';
      case 'planned': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  if (statsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Dashboard yüklənir...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tədbir İdarəetməsi</h1>
          <p className="text-muted-foreground">
            Tədris-Bilimlər Referenti - Tədbir planlaması və məktəb fəaliyyətləri
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Yenilə
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Tədbir
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Bu Ay Tədbirləri"
          value={upcomingEvents.length}
          icon={Calendar}
          variant="primary"
        />
        <StatsCard
          title="Aktiv Layihələr"
          value={upcomingEvents.filter(e => e.status === 'active').length}
          icon={Star}
          variant="warning"
        />
        <StatsCard
          title="İştirakçı Sayı"
          value={upcomingEvents.reduce((sum, e) => sum + e.participants, 0)}
          icon={Users}
          variant="success"
        />
        <StatsCard
          title="Uğur Göstəricisi"
          value="92%"
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Qazanılan Mükafatlar</p>
                  <p className="text-xl font-semibold">7</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Plane className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Planlaşdırılan Ekskursiyalar</p>
                  <p className="text-xl font-semibold">3</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Heart className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">İştirakçı Məmnuniyyəti</p>
                  <p className="text-xl font-semibold">4.8/5</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="events" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="events">Tədbir Təqvimi</TabsTrigger>
          <TabsTrigger value="planning">Layihə Planlaması</TabsTrigger>
          <TabsTrigger value="resources">Resurs İdarəetməsi</TabsTrigger>
          <TabsTrigger value="reports">Nəticələr və Hesabatlar</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Calendar */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Yaxınlaşan Tədbirlər
                    </CardTitle>
                    <CardDescription>
                      Bu ay planlaşdırılan fəaliyyətlər
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Tam təqvim
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingEvents.map((event) => {
                  const EventIcon = getEventIcon(event.type);
                  return (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={cn(
                        "p-2 rounded-lg",
                        event.priority === 'high' ? "bg-destructive/10" :
                        event.priority === 'medium' ? "bg-warning/10" : "bg-secondary/10"
                      )}>
                        <EventIcon className={cn(
                          "h-4 w-4",
                          event.priority === 'high' ? "text-destructive" :
                          event.priority === 'medium' ? "text-warning" : "text-secondary"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {format(new Date(event.date), 'dd MMM yyyy', { locale: az })}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {event.participants} iştirakçı
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {event.location}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant={getPriorityColor(event.priority)} className="text-xs">
                          {event.priority}
                        </Badge>
                        <Badge variant={getStatusColor(event.status)} className="text-xs">
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Sürətli Əməliyyatlar
                </CardTitle>
                <CardDescription>
                  Tədbir planlaması üçün tez-tez istifadə olunan funksiyalar
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Yarış Təşkil Et</p>
                    <p className="text-xs text-muted-foreground">Olimpiada/müsabiqə</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <Plane className="h-5 w-5" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Ekskursiya Planla</p>
                    <p className="text-xs text-muted-foreground">Təhsil səfəri</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <Palette className="h-5 w-5" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Mədəni Tədbir</p>
                    <p className="text-xs text-muted-foreground">Bayram/konsert</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Akademik Fəaliyyət</p>
                    <p className="text-xs text-muted-foreground">Elmi layihə</p>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aktiv Layihələr</CardTitle>
              <CardDescription>Hazırda icra edilən tədbir layihələri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    name: "Yaradıcılıq Həftəsi 2024",
                    progress: 75,
                    deadline: "2024-09-15",
                    team: 8,
                    status: "in_progress"
                  },
                  {
                    name: "STEAM Layihəsi",
                    progress: 45,
                    deadline: "2024-10-20",
                    team: 12,
                    status: "planning"
                  },
                  {
                    name: "Ekoloji Təmizlik Kampaniyası",
                    progress: 90,
                    deadline: "2024-08-30",
                    team: 6,
                    status: "completing"
                  }
                ].map((project, idx) => (
                  <div key={idx} className="p-4 rounded-lg border hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Son tarix: {format(new Date(project.deadline), 'dd MMM yyyy', { locale: az })}
                        </p>
                      </div>
                      <Badge variant={getStatusColor(project.status)}>
                        {project.status === 'in_progress' ? 'Davam edir' : 
                         project.status === 'planning' ? 'Planlaşdırılır' : 'Tamamlanır'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Tamamlanma</span>
                        <span className="text-sm font-medium">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{project.team} nəfər komanda</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resurs İdarəetməsi</CardTitle>
              <CardDescription>Tədbirlər üçün lazım olan resurslar və rezervasiyalar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    name: "Məktəb Aktı",
                    type: "room",
                    availability: 85,
                    icon: Globe,
                    bookings: 12
                  },
                  {
                    name: "Laboratoriya",
                    type: "room",
                    availability: 60,
                    icon: BookOpen,
                    bookings: 8
                  },
                  {
                    name: "İdman Zalı",
                    type: "room",
                    availability: 40,
                    icon: Trophy,
                    bookings: 15
                  },
                  {
                    name: "Projektor və Avadanlıq",
                    type: "equipment",
                    availability: 70,
                    icon: Camera,
                    bookings: 6
                  },
                  {
                    name: "Nəqliyyat",
                    type: "transport",
                    availability: 90,
                    icon: Plane,
                    bookings: 3
                  },
                  {
                    name: "Musiqi Alətləri",
                    type: "equipment",
                    availability: 95,
                    icon: Music,
                    bookings: 2
                  }
                ].map((resource, idx) => (
                  <Card key={idx} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <resource.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{resource.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {resource.bookings} rezervasiya
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Əlçatanlıq</span>
                          <span className="text-xs font-medium">{resource.availability}%</span>
                        </div>
                        <Progress value={resource.availability} className="h-2" />
                      </div>
                      
                      <Button variant="ghost" size="sm" className="w-full mt-3">
                        <Calendar className="h-4 w-4 mr-2" />
                        Rezerv Et
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nəticələr və Hesabatlar</CardTitle>
              <CardDescription>Tədbir nəticələri və performans analizi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <TrendingUp className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">İştirak Statistikası</p>
                    <p className="text-sm text-muted-foreground">Tədbir iştirakçı analizi</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <Trophy className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">Uğur Hesabatı</p>
                    <p className="text-sm text-muted-foreground">Qazanılan nailiyyətlər</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">Büdcə Analizi</p>
                    <p className="text-sm text-muted-foreground">Xərc və gəlir hesabatı</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <CalendarDays className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">İllik Proqram</p>
                    <p className="text-sm text-muted-foreground">Akademik il tədbir planı</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};