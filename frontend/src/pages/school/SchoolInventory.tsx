import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Search,
  Filter,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Plus,
  Eye,
  Edit,
  TrendingUp,
  MapPin,
  Calendar,
  Tool,
  RefreshCw
} from 'lucide-react';
import { schoolAdminService, schoolAdminKeys } from '@/services/schoolAdmin';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const SchoolInventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [conditionFilter, setConditionFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');

  // Fetch inventory data
  const { 
    data: inventoryData, 
    isLoading: inventoryLoading,
    refetch: refetchInventory
  } = useQuery({
    queryKey: schoolAdminKeys.inventory(),
    queryFn: () => schoolAdminService.getInventoryItems({
      category: categoryFilter || undefined,
      condition: conditionFilter || undefined,
      location: locationFilter || undefined,
    }),
    refetchOnWindowFocus: false,
  });

  // Fetch inventory statistics
  const { 
    data: statistics,
    isLoading: statisticsLoading 
  } = useQuery({
    queryKey: schoolAdminKeys.inventoryStats(),
    queryFn: () => schoolAdminService.getInventoryStatistics(),
    refetchOnWindowFocus: false,
  });

  const handleRefresh = async () => {
    try {
      await refetchInventory();
      toast.success('İnventar məlumatları yeniləndi');
    } catch (error) {
      toast.error('Yeniləmə zamanı xəta baş verdi');
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'success';
      case 'good': return 'default';
      case 'fair': return 'warning';
      case 'poor': return 'destructive';
      default: return 'secondary';
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'Əla';
      case 'good': return 'Yaxşı';
      case 'fair': return 'Orta';
      case 'poor': return 'Pis';
      default: return condition;
    }
  };

  const filteredItems = inventoryData?.items?.filter((item: any) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (inventoryLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">İnventar məlumatları yüklənir...</p>
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
          <h1 className="text-3xl font-bold text-foreground">İnventar İdarəetməsi</h1>
          <p className="text-muted-foreground">
            Məktəb avadanlıqları və təchizatın idarə edilməsi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenilə
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Əlavə Et
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ümumi Məhsullar</p>
                  <p className="text-2xl font-bold">{statistics.overview?.total_items || 0}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ümumi Dəyər</p>
                  <p className="text-2xl font-bold">{statistics.overview?.total_value?.toLocaleString() || 0} ₼</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">İstifadədə</p>
                  <p className="text-2xl font-bold">{statistics.overview?.items_in_use || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Texniki Xidmət</p>
                  <p className="text-2xl font-bold text-orange-600">{statistics.overview?.maintenance_due || 0}</p>
                </div>
                <Tool className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="items" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items">Məhsullar</TabsTrigger>
          <TabsTrigger value="statistics">Statistika</TabsTrigger>
          <TabsTrigger value="maintenance">Texniki Xidmət</TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Məhsul adı və ya kateqoriyasını axtarın..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Kateqoriya" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Hamısı</SelectItem>
                      <SelectItem value="İT Avadanlıqları">İT Avadanlıqları</SelectItem>
                      <SelectItem value="Təqdimat Avadanlıqları">Təqdimat</SelectItem>
                      <SelectItem value="Elm Avadanlıqları">Elm</SelectItem>
                      <SelectItem value="Mebel">Mebel</SelectItem>
                      <SelectItem value="İdman">İdman</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={conditionFilter} onValueChange={setConditionFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Vəziyyət" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Hamısı</SelectItem>
                      <SelectItem value="excellent">Əla</SelectItem>
                      <SelectItem value="good">Yaxşı</SelectItem>
                      <SelectItem value="fair">Orta</SelectItem>
                      <SelectItem value="poor">Pis</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Grid */}
          <div className="grid gap-6">
            {filteredItems.length > 0 ? (
              filteredItems.map((item: any) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-primary/10 rounded-lg">
                            <Package className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold">{item.name}</h3>
                            <p className="text-muted-foreground">{item.category}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {item.available_quantity}/{item.total_quantity} əlçatan
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{item.location}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getConditionColor(item.condition)}>
                          {getConditionText(item.condition)}
                        </Badge>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Dəyər</p>
                          <p className="font-semibold">{item.total_value?.toLocaleString()} ₼</p>
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
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Heç bir məhsul tapılmadı</h3>
                    <p className="text-muted-foreground mb-4">
                      Axtarış kriteriyalarınızı dəyişdirin və ya yeni məhsul əlavə edin
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      İlk məhsulu əlavə edin
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6">
          {statistics && (
            <div className="grid gap-6">
              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Kateqoriyalar üzrə Paylanma
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {statistics.by_category?.map((category: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">{category.category}</p>
                          <p className="text-sm text-muted-foreground">{category.count} məhsul</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{category.value?.toLocaleString()} ₼</p>
                          <p className="text-sm text-muted-foreground">{category.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Condition Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Vəziyyət üzrə Paylanma</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {statistics.by_condition?.map((condition: any, index: number) => (
                      <div key={index} className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className={cn(
                          "w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center",
                          condition.condition === 'excellent' ? 'bg-green-100 text-green-600' :
                          condition.condition === 'good' ? 'bg-blue-100 text-blue-600' :
                          condition.condition === 'fair' ? 'bg-orange-100 text-orange-600' :
                          'bg-red-100 text-red-600'
                        )}>
                          <span className="text-2xl font-bold">{condition.count}</span>
                        </div>
                        <p className="font-medium">{getConditionText(condition.condition)}</p>
                        <p className="text-sm text-muted-foreground">{condition.percentage}%</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Yaxınlaşan Texniki Xidmət
                </CardTitle>
                <CardDescription>
                  Texniki xidmətə ehtiyacı olan avadanlıqlar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statistics?.upcoming_maintenance?.length > 0 ? (
                  <div className="space-y-3">
                    {statistics.upcoming_maintenance.map((maintenance: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          <div>
                            <p className="font-medium">{maintenance.item}</p>
                            <p className="text-sm text-muted-foreground">{maintenance.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{maintenance.due_date}</p>
                          <Badge variant="warning">Gözləyir</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Hazırda texniki xidmətə ehtiyacı olan avadanlıq yoxdur
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Sona çatan Qarantiya Müddətləri
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statistics?.expiring_warranties?.length > 0 ? (
                  <div className="space-y-3">
                    {statistics.expiring_warranties.map((warranty: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{warranty.item}</p>
                          <p className="text-sm text-muted-foreground">
                            Son tarix: {warranty.expires}
                          </p>
                        </div>
                        <Badge variant={warranty.days_remaining <= 30 ? "destructive" : "warning"}>
                          {warranty.days_remaining} gün
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Yaxın zamanda sona çatacaq qarantiya yoxdur
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};