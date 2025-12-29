import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/staffRating';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trophy, TrendingUp, Users, BarChart3, Download } from 'lucide-react';
import type { DashboardOverview, LeaderboardEntry } from '@/types/staffRating';
import { CATEGORY_LABELS } from '@/types/staffRating';

export default function RatingDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(getCurrentPeriod());
  const [leaderboardCategory, setLeaderboardCategory] = useState<string>('overall');
  const [leaderboardType, setLeaderboardType] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const { toast } = useToast();

  // Get overview
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['rating-dashboard-overview', selectedPeriod],
    queryFn: () => dashboardService.getOverview(selectedPeriod),
  });

  // Get leaderboard
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['rating-leaderboard', selectedPeriod, leaderboardCategory, leaderboardType],
    queryFn: () => dashboardService.getLeaderboard({
      period: selectedPeriod,
      category: leaderboardCategory,
      rating_type: leaderboardType === 'all' ? undefined : leaderboardType,
      limit: 20,
    }),
  });

  const overviewData = overview as DashboardOverview;
  const leaderboard = leaderboardData?.leaderboard as LeaderboardEntry[];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Call export API (returns blob)
      const response = await dashboardService.export(selectedPeriod, 'xlsx');

      // Create blob from response
      const blob = new Blob([response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `staff-rating-dashboard-${selectedPeriod}.xlsx`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Uğurlu',
        description: 'Dashboard uğurla export edildi',
      });
    } catch (error: any) {
      console.error('Export failed:', error);
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Export zamanı xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Qiymətləndirmə Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Personal statistikası və performans göstəriciləri
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Dövr seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={getCurrentPeriod()}>Cari ay</SelectItem>
              <SelectItem value={getPreviousPeriod(1)}>Keçən ay</SelectItem>
              <SelectItem value={getPreviousPeriod(2)}>2 ay əvvəl</SelectItem>
              <SelectItem value={getCurrentQuarter()}>Cari rüb</SelectItem>
              <SelectItem value={getCurrentYear()}>Cari il</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? 'Export edilir...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Overview Statistics */}
      {overviewLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : overviewData ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Ümumi Personal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {overviewData.overview.total_staff}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {overviewData.overview.total_ratings} qiymətləndirmə
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Orta Bal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {overviewData.overview.average_score.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  / 5.00 maksimum
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Manual Orta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {overviewData.overview.manual_average.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Əl ilə verilmiş qiymətlər
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avtomatik Orta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {overviewData.overview.automatic_average.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Sistem tərəfindən hesablanmış
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="distribution" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="distribution">Bölgü</TabsTrigger>
              <TabsTrigger value="leaderboard">Liderlər</TabsTrigger>
              <TabsTrigger value="roles">Rollar üzrə</TabsTrigger>
              <TabsTrigger value="categories">Kateqoriyalar</TabsTrigger>
            </TabsList>

            {/* Score Distribution */}
            <TabsContent value="distribution" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Bal Bölgüsü</CardTitle>
                  <CardDescription>
                    Personalın performans səviyyələri üzrə paylanması
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <ScoreDistributionBar
                      label="Əla (4.5-5.0)"
                      count={overviewData.score_distribution.excellent}
                      total={overviewData.overview.total_staff}
                      color="bg-green-500"
                    />
                    <ScoreDistributionBar
                      label="Yaxşı (3.5-4.49)"
                      count={overviewData.score_distribution.good}
                      total={overviewData.overview.total_staff}
                      color="bg-blue-500"
                    />
                    <ScoreDistributionBar
                      label="Orta (2.5-3.49)"
                      count={overviewData.score_distribution.average}
                      total={overviewData.overview.total_staff}
                      color="bg-yellow-500"
                    />
                    <ScoreDistributionBar
                      label="Zəif (1.5-2.49)"
                      count={overviewData.score_distribution.below_average}
                      total={overviewData.overview.total_staff}
                      color="bg-orange-500"
                    />
                    <ScoreDistributionBar
                      label="Çox zəif (<1.5)"
                      count={overviewData.score_distribution.poor}
                      total={overviewData.overview.total_staff}
                      color="bg-red-500"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Leaderboard */}
            <TabsContent value="leaderboard" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Top 20 Lider
                      </CardTitle>
                      <CardDescription>Ən yüksək performans göstərənlər</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={leaderboardCategory} onValueChange={setLeaderboardCategory}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overall">Ümumi</SelectItem>
                          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={leaderboardType} onValueChange={setLeaderboardType}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Hamısı</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="automatic">Avtomatik</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {leaderboardLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : leaderboard && leaderboard.length > 0 ? (
                    <div className="space-y-2">
                      {leaderboard.map((entry) => (
                        <LeaderboardRow key={entry.rank} entry={entry} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Məlumat tapılmadı
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* By Role */}
            <TabsContent value="roles" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Rollar üzrə Statistika</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overviewData.by_role.map((roleData) => (
                      <div
                        key={roleData.role}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold capitalize">{roleData.role}</p>
                          <p className="text-sm text-muted-foreground">
                            {roleData.count} nəfər
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-lg">
                          {roleData.average.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* By Category */}
            <TabsContent value="categories" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Kateqoriyalar üzrə Statistika</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overviewData.by_category.map((catData) => (
                      <div
                        key={catData.category}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold">
                            {CATEGORY_LABELS[catData.category] || catData.category}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {catData.count} qiymətləndirmə
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-lg">
                          {catData.average.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}

// Helper Components
function ScoreDistributionBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`${color} h-3 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="text-2xl font-bold w-12 text-center">
          {getMedalIcon(entry.rank)}
        </div>
        <div>
          <p className="font-semibold">{entry.staff.name}</p>
          <p className="text-sm text-muted-foreground">{entry.staff.email}</p>
          {entry.institution && (
            <p className="text-xs text-muted-foreground">{entry.institution.name}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <Badge className="text-lg px-3 py-1">{entry.score.toFixed(2)}</Badge>
        <p className="text-xs text-muted-foreground mt-1 capitalize">
          {entry.rating_type}
        </p>
      </div>
    </div>
  );
}

// Utility Functions
function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getPreviousPeriod(monthsAgo: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getCurrentQuarter(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${quarter}`;
}

function getCurrentYear(): string {
  return String(new Date().getFullYear());
}
