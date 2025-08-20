import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Package,
  Wrench,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  Eye,
  RefreshCw,
  Truck,
  Settings,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Users,
  BarChart3,
  ShoppingCart,
  Building,
  Zap
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { schoolAdminService, schoolAdminKeys } from '@/services/schoolAdmin';
import { formatDistanceToNow, format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  condition: 'excellent' | 'good' | 'needs_repair' | 'damaged';
  location: string;
  last_maintenance: string;
  value: number;
}

interface MaintenanceRequest {
  id: number;
  item_name: string;
  issue: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  requested_date: string;
  location: string;
}

export const TesarrufatDashboard: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard stats
  const { 
    data: stats, 
    isLoading: statsLoading,
    refetch: refetchStats 
  } = useQuery({
    queryKey: [...schoolAdminKeys.dashboardStats(), 'tesarrufat'],
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

  // Mock data for inventory
  const inventoryItems: InventoryItem[] = [
    {
      id: 1,
      name: "Kompyuter",
      category: "Texnika",
      quantity: 45,
      condition: "good",
      location: "Kompyuter Sinfi",
      last_maintenance: "2024-07-15",
      value: 25000
    },
    {
      id: 2,
      name: "Projektor",
      category: "Avadanlıq",
      quantity: 8,
      condition: "excellent",
      location: "Müxtəlif Siniflər",
      last_maintenance: "2024-06-20",
      value: 12000
    },
    {
      id: 3,
      name: "Masa və Stul",
      category: "Mebel",
      quantity: 120,
      condition: "needs_repair",
      location: "Siniflər",
      last_maintenance: "2024-05-10",
      value: 8500
    }
  ];

  // Mock data for maintenance requests
  const maintenanceRequests: MaintenanceRequest[] = [
    {
      id: 1,
      item_name: "Kondisioner (301 sinif)",
      issue: "Soyutma problemi",
      priority: "high",
      status: "in_progress",
      requested_date: "2024-08-15",
      location: "301 sinif"
    },
    {
      id: 2,
      item_name: "Proyektor",
      issue: "Lampanın dəyişdirilməsi",
      priority: "medium",
      status: "pending",
      requested_date: "2024-08-16",
      location: "202 sinif"
    },
    {
      id: 3,
      item_name: "İnternetə çıxış",
      issue: "Şəbəkə problemi",
      priority: "urgent",
      status: "pending",
      requested_date: "2024-08-17",
      location: "İnformatika Sinfi"
    }
  ];

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'success';
      case 'good': return 'default';
      case 'needs_repair': return 'warning';
      case 'damaged': return 'destructive';
      default: return 'secondary';
    }
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'Əla';
      case 'good': return 'Yaxşı';
      case 'needs_repair': return 'Təmir lazım';
      case 'damaged': return 'Xarab';
      default: return 'Naməlum';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Təcili';
      case 'high': return 'Yüksək';
      case 'medium': return 'Orta';
      case 'low': return 'Aşağı';
      default: return 'Naməlum';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'in_progress': return 'Davam edir';
      case 'pending': return 'Gözləyir';
      default: return 'Naməlum';
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

  // Calculate stats for Təsərrüfat dashboard
  const totalAssets = inventoryItems.reduce((sum, item) => sum + item.value, 0);
  const pendingMaintenance = maintenanceRequests.filter(r => r.status === 'pending').length;
  const urgentRequests = maintenanceRequests.filter(r => r.priority === 'urgent').length;
  const assetUtilization = 78; // Mock data

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Təsərrüfat İdarəetməsi</h1>
          <p className="text-muted-foreground">
            İnventarizasiya, avadanlıq və təsərrüfat işlərinin idarəetməsi
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
            Yeni Avadanlıq
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Ümumi Aktivlər"
          value={`${(totalAssets / 1000).toFixed(0)}K ₼`}
          icon={Package}
          variant="primary"
        />
        <StatsCard
          title="Gözləyən Təmirlər"
          value={pendingMaintenance}
          icon={Wrench}
          variant={pendingMaintenance > 5 ? "warning" : "default"}
        />
        <StatsCard
          title="Təcili Sorğular"
          value={urgentRequests}
          icon={AlertTriangle}
          variant={urgentRequests > 0 ? "destructive" : "success"}
        />
        <StatsCard
          title="Avadanlıq İstifadəsi"
          value={`${assetUtilization}%`}
          icon={BarChart3}
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
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bu Ay Xərclər</p>
                  <p className="text-xl font-semibold">2.850 ₼</p>
                </div>
              </div>
              <div className="text-right">
                <TrendingDown className="h-4 w-4 text-success inline" />
                <span className="text-sm text-success">-12%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Wrench className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aktiv Təmirlər</p>
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
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tamamlanan Tapşırıqlar</p>
                  <p className="text-xl font-semibold">23</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory">İnventarizasiya</TabsTrigger>
          <TabsTrigger value="maintenance">Təmir və Baxım</TabsTrigger>
          <TabsTrigger value="purchases">Satınalmalar</TabsTrigger>
          <TabsTrigger value="reports">Hesabatlar</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      İnventarizasiya Siyahısı
                    </CardTitle>
                    <CardDescription>
                      Məktəbdəki avadanlıq və materiallların uçotu
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Tam siyahı
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {inventoryItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.category} • {item.location}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            Miqdar: {item.quantity}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            Dəyər: {item.value} ₼
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant={getConditionColor(item.condition)} className="text-xs">
                        {getConditionLabel(item.condition)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.last_maintenance), { addSuffix: true, locale: az })}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Kateqoriya üzrə Bölgü
                </CardTitle>
                <CardDescription>
                  Avadanlıq kateqoriyaları üzrə dəyər paylanması
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "Texnika", value: 25000, percentage: 55, icon: Building },
                  { name: "Mebel", value: 8500, percentage: 19, icon: Settings },
                  { name: "Avadanlıq", value: 12000, percentage: 26, icon: Wrench }
                ].map((category, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <category.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">{category.value} ₼</span>
                        <span className="text-xs text-muted-foreground ml-2">({category.percentage}%)</span>
                      </div>
                    </div>
                    <Progress value={category.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Təmir və Baxım Sorğuları</CardTitle>
              <CardDescription>Gözləyən və aktiv təmir işləri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {maintenanceRequests.map((request) => (
                  <div key={request.id} className="flex items-start gap-3 p-4 rounded-lg border hover:shadow-sm transition-shadow">
                    <div className={cn(
                      "p-2 rounded-lg",
                      request.priority === 'urgent' ? "bg-destructive/10" :
                      request.priority === 'high' ? "bg-warning/10" : "bg-secondary/10"
                    )}>
                      <Wrench className={cn(
                        "h-4 w-4",
                        request.priority === 'urgent' ? "text-destructive" :
                        request.priority === 'high' ? "text-warning" : "text-secondary"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{request.item_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{request.issue}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {request.location}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(request.requested_date), 'dd MMM', { locale: az })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant={getPriorityColor(request.priority)} className="text-xs">
                        {getPriorityLabel(request.priority)}
                      </Badge>
                      <Badge variant={getStatusColor(request.status)} className="text-xs">
                        {getStatusLabel(request.status)}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Satınalma İdarəetməsi</CardTitle>
              <CardDescription>Planlaşdırılan və gözləyən satınalmalar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <ShoppingCart className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">Yeni Satınalma</p>
                    <p className="text-sm text-muted-foreground">Avadanlıq sifarişi</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <Truck className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">Təchizatçı İdarəetməsi</p>
                    <p className="text-sm text-muted-foreground">Vendor bəzi əlaqələr</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <DollarSign className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">Büdcə Planlaması</p>
                    <p className="text-sm text-muted-foreground">Maliyyə planı</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">Müqavilə İdarəetməsi</p>
                    <p className="text-sm text-muted-foreground">Satınalma müqavilələri</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Təsərrüfat Hesabatları</CardTitle>
              <CardDescription>İnventarizasiya və maliyyə hesabatları</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <Package className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">İnventarizasiya Hesabatı</p>
                    <p className="text-sm text-muted-foreground">Avadanlıq uçotu</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <TrendingUp className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">Xərc Analizi</p>
                    <p className="text-sm text-muted-foreground">Maliyyə təhlili</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <Wrench className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">Təmir Statistikası</p>
                    <p className="text-sm text-muted-foreground">Baxım hesabatı</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                  <BarChart3 className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-medium">Əmlak Dəyəri</p>
                    <p className="text-sm text-muted-foreground">Aktivlərin qiymətləndirilməsi</p>
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