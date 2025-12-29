import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { myRatingService } from '@/services/staffRating';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown, Minus, Award, Target, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { RatingSummary, RatingBreakdown, TrendData } from '@/types/staffRating';

export default function MyRating() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  // Get summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['my-rating-summary'],
    queryFn: () => myRatingService.getMySummary(),
  });

  // Get history (last 12 months)
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['my-rating-history', { months: 12 }],
    queryFn: () => myRatingService.getMyHistory({ months: 12 }),
  });

  // Get breakdown
  const { data: breakdownData, isLoading: breakdownLoading } = useQuery({
    queryKey: ['my-rating-breakdown', selectedPeriod],
    queryFn: () => myRatingService.getMyBreakdown(selectedPeriod || undefined),
    enabled: !!selectedPeriod || summary?.current_period !== undefined,
  });

  // Get peer comparison
  const { data: peerData } = useQuery({
    queryKey: ['my-peer-comparison', selectedPeriod],
    queryFn: () => myRatingService.getPeerComparison(selectedPeriod || undefined),
    enabled: !!selectedPeriod || summary?.current_period !== undefined,
  });

  // Get rank
  const { data: rankData } = useQuery({
    queryKey: ['my-rank', selectedPeriod],
    queryFn: () => myRatingService.getMyRank({
      period: selectedPeriod || undefined,
      category: 'overall',
    }),
    enabled: !!selectedPeriod || summary?.current_period !== undefined,
  });

  // Set default period
  useEffect(() => {
    if (summary && !selectedPeriod) {
      setSelectedPeriod(summary.current_period);
    }
  }, [summary, selectedPeriod]);

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Handle no data case
  if (!summary) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert>
          <AlertDescription>
            Sizin üçün hələ qiymətləndirmə məlumatı mövcud deyil.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const summaryData = summary as RatingSummary;
  const breakdown = breakdownData?.breakdown as RatingBreakdown;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mənim Qiymətləndirmələrim</h1>
          <p className="text-muted-foreground mt-2">
            Performans göstəriciləriniz və reytinq tarixiniz
          </p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {selectedPeriod ? formatPeriodLabel(selectedPeriod) : 'Dövr seçin'}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {generatePeriodOptions().map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Average */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cari Orta Bal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summaryData.current_average?.toFixed(2) || 'N/A'}
              <span className="text-lg text-muted-foreground ml-2">/ 5.00</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summaryData.current_period}
            </p>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dəyişiklik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {summaryData.trend === 'improving' && (
                <>
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">
                    +{summaryData.change?.toFixed(2)}
                  </span>
                </>
              )}
              {summaryData.trend === 'declining' && (
                <>
                  <TrendingDown className="h-6 w-6 text-red-600" />
                  <span className="text-2xl font-bold text-red-600">
                    {summaryData.change?.toFixed(2)}
                  </span>
                </>
              )}
              {summaryData.trend === 'stable' && (
                <>
                  <Minus className="h-6 w-6 text-gray-600" />
                  <span className="text-2xl font-bold text-gray-600">0.00</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summaryData.previous_period} ilə müqayisədə
            </p>
          </CardContent>
        </Card>

        {/* Rank */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reytinq
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rankData ? (
              <>
                <div className="text-3xl font-bold">
                  #{rankData.rank}
                  <span className="text-lg text-muted-foreground ml-2">
                    / {rankData.total_participants}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Top {rankData.top_percentage}%
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">Məlumat yoxdur</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peer Comparison Alert */}
      {peerData && (
        <Alert className={peerData.difference >= 0 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
          <Target className="h-4 w-4" />
          <AlertDescription>
            Sizin orta balınız ({peerData.user_average.toFixed(2)}) eyni rol daşıyan
            {' '}{peerData.peer_count} əməkdaşın ortalamasından ({peerData.peer_average.toFixed(2)})
            {' '}
            {peerData.difference >= 0 ? (
              <span className="font-semibold text-green-700">
                {peerData.difference.toFixed(2)} bal yüksəkdir
              </span>
            ) : (
              <span className="font-semibold text-orange-700">
                {Math.abs(peerData.difference).toFixed(2)} bal aşağıdır
              </span>
            )}
            . Siz {peerData.percentile}% percentile-də yerləşirsiniz.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="breakdown">Detallı Breakdown</TabsTrigger>
          <TabsTrigger value="categories">Kateqoriyalar</TabsTrigger>
          <TabsTrigger value="history">Tarixçə</TabsTrigger>
        </TabsList>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          {breakdownLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : breakdown ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Avtomatik Qiymətləndirmə</CardTitle>
                  <CardDescription>
                    {breakdown.period} dövrü üzrə performans göstəriciləri
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Final Score */}
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Ümumi Bal:</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {breakdown.final_score.toFixed(2)}
                    </span>
                  </div>

                  {/* Component Scores */}
                  <div className="space-y-3">
                    {/* Task Performance */}
                    <ComponentCard
                      title="Tapşırıq İcrası"
                      score={breakdown.task_performance.component_score}
                      weight={breakdown.task_performance.weight}
                      weightedScore={breakdown.task_performance.weighted_score}
                      details={
                        <>
                          {breakdown.task_performance.total > 0 ? (
                            <>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-green-600 font-semibold">
                                    {breakdown.task_performance.onTime}
                                  </span>
                                  {' '}vaxtında
                                  <div className="text-xs text-muted-foreground">
                                    ({breakdown.task_performance.onTimeRate}%)
                                  </div>
                                </div>
                                <div>
                                  <span className="text-yellow-600 font-semibold">
                                    {breakdown.task_performance.late}
                                  </span>
                                  {' '}gecikmiş
                                  <div className="text-xs text-muted-foreground">
                                    ({breakdown.task_performance.lateRate}%)
                                  </div>
                                </div>
                                <div>
                                  <span className="text-red-600 font-semibold">
                                    {breakdown.task_performance.incomplete}
                                  </span>
                                  {' '}yarımçıq
                                  <div className="text-xs text-muted-foreground">
                                    ({breakdown.task_performance.incompleteRate}%)
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {breakdown.task_performance.message}
                            </p>
                          )}
                        </>
                      }
                    />

                    {/* Survey Performance */}
                    <ComponentCard
                      title="Sorğu Cavabdehliyi"
                      score={breakdown.survey_performance.component_score}
                      weight={breakdown.survey_performance.weight}
                      weightedScore={breakdown.survey_performance.weighted_score}
                      details={
                        <>
                          {breakdown.survey_performance.total > 0 ? (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="font-semibold">
                                  {breakdown.survey_performance.completed}
                                </span>
                                {' '}tamamlanmış
                                <div className="text-xs text-muted-foreground">
                                  ({breakdown.survey_performance.completionRate}%)
                                </div>
                              </div>
                              <div>
                                <span className="font-semibold">
                                  {breakdown.survey_performance.onTime}
                                </span>
                                {' '}vaxtında
                                <div className="text-xs text-muted-foreground">
                                  ({breakdown.survey_performance.onTimeRate}%)
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {breakdown.survey_performance.message}
                            </p>
                          )}
                        </>
                      }
                    />

                    {/* Document Activity */}
                    <ComponentCard
                      title="Sənəd Fəaliyyəti"
                      score={breakdown.document_activity.component_score}
                      weight={breakdown.document_activity.weight}
                      weightedScore={breakdown.document_activity.weighted_score}
                      details={
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="font-semibold">
                              {breakdown.document_activity.uploads}
                            </span>
                            {' '}yüklənmiş
                          </div>
                          <div>
                            <span className="font-semibold">
                              {breakdown.document_activity.shares}
                            </span>
                            {' '}paylaşılmış
                          </div>
                          <div>
                            <span className="font-semibold">
                              {breakdown.document_activity.downloads}
                            </span>
                            {' '}yüklənilmə
                          </div>
                        </div>
                      }
                    />

                    {/* Link Management */}
                    <ComponentCard
                      title="Link İdarəetməsi"
                      score={breakdown.link_management.component_score}
                      weight={breakdown.link_management.weight}
                      weightedScore={breakdown.link_management.weighted_score}
                      details={
                        <>
                          {breakdown.link_management.total > 0 ? (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="font-semibold">
                                  {breakdown.link_management.active}
                                </span>
                                {' '}aktiv link
                                <div className="text-xs text-muted-foreground">
                                  ({breakdown.link_management.activeRate}%)
                                </div>
                              </div>
                              <div>
                                <span className="font-semibold">
                                  {breakdown.link_management.access_count}
                                </span>
                                {' '}giriş
                                <div className="text-xs text-muted-foreground">
                                  ({breakdown.link_management.accessRate}% gözlənilən)
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {breakdown.link_management.message}
                            </p>
                          )}
                        </>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <AlertDescription>
                Seçilmiş dövr üçün avtomatik qiymətləndirmə mövcud deyil
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Kateqoriyalar üzrə Qiymətləndirmə</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(summaryData.by_category).map(([category, score]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span className="font-medium capitalize">
                      {category.replace('_', ' ')}
                    </span>
                    <Badge variant="secondary" className="text-base">
                      {score.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Reytinq Tarixçəsi</CardTitle>
              <CardDescription>
                Son 12 ay üzrə performans dinamikası
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : historyData?.trend && historyData.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={historyData.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="period"
                      tickFormatter={(value) => formatPeriodLabel(value)}
                    />
                    <YAxis
                      domain={[0, 5]}
                      ticks={[0, 1, 2, 3, 4, 5]}
                    />
                    <Tooltip
                      labelFormatter={(value) => formatPeriodLabel(value as string)}
                      formatter={(value: number) => [value.toFixed(2), 'Bal']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Ümumi Bal"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <p className="text-muted-foreground">Tarixçə məlumatı mövcud deyil</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Son 12 ay üzrə qiymətləndirmə məlumatı tapılmadı
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Component
function ComponentCard({
  title,
  score,
  weight,
  weightedScore,
  details,
}: {
  title: string;
  score: number;
  weight: number;
  weightedScore: number;
  details: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{title}</h4>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Çəki: {(weight * 100).toFixed(0)}%</Badge>
          <Badge>Bal: {score.toFixed(2)}</Badge>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        Çəkili bal: <span className="font-semibold">{weightedScore.toFixed(2)}</span>
      </div>
      <div className="pt-2 border-t">{details}</div>
    </div>
  );
}

// Utility Functions
function generatePeriodOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const now = new Date();

  // Last 12 months
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    options.push({
      value: period,
      label: formatPeriodLabel(period),
    });
  }

  return options;
}

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-');
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
    'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}
