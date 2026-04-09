import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  BarChart3,
  Trophy,
  Target,
  AlertTriangle,
  TrendingUp,
  Info,
  History,
  TrendingDown,
  Medal,
} from 'lucide-react';
import { reportTableService } from '@/services/reportTables';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function MyReportTableStatistics() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['my-report-table-statistics'],
    queryFn: () => reportTableService.getMyStatistics(),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12 bg-red-50 rounded-xl border border-red-100">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="text-red-700 font-medium">Məlumatları yükləyərkən xəta baş verdi</p>
        <p className="text-red-500 text-sm mt-1">Zəhmət olmasa səhifəni yeniləyin və ya bir az sonra təkrar cəhd edin.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Göndərilib</Badge>;
      case 'draft':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="h-3 w-3 mr-1" /> Qaralama</Badge>;
      case 'not_started':
      default:
        return <Badge variant="outline" className="text-gray-400 border-dashed border-gray-300">Başlanmayıb</Badge>;
    }
  };

  const getRatingColor = (percentage: number) => {
    if (percentage >= 80) return 'text-emerald-600';
    if (percentage >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getRankDisplay = (rank: number | null | undefined, total: number | null | undefined) => {
    if (!rank || !total) return null;
    if (rank === 1) return { label: `${rank} / ${total}`, color: 'text-yellow-600', bg: 'bg-yellow-50', ring: 'ring-yellow-200' };
    if (rank === 2) return { label: `${rank} / ${total}`, color: 'text-gray-500', bg: 'bg-gray-50', ring: 'ring-gray-200' };
    if (rank === 3) return { label: `${rank} / ${total}`, color: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' };
    return { label: `${rank} / ${total}`, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200' };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white col-span-2 sm:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Ümumi Reytinq Balı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total_final_score}</div>
            <p className="text-xs text-emerald-100 mt-1">Cəmi {stats.total_tables} cədvəl üzrə</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Ortalama Keyfiyyət
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getRatingColor(stats.avg_rating_percentage)}`}>
              {stats.avg_rating_percentage}%
            </div>
            <p className="text-xs text-gray-400 mt-1">Təsdiqlənmiş sətir nisbəti</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Doldurulma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">
              {stats.filled_tables} / {stats.total_tables}
            </div>
            <p className="text-xs text-gray-400 mt-1">Aktiv hesabat cədvəlləri</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <History className="h-4 w-4 text-orange-500" />
              Cərimə / Bonus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-red-500">-{stats.total_penalty}</div>
              <div className="w-px h-8 bg-gray-100" />
              <div className="text-2xl font-bold text-emerald-500">+{stats.total_bonus}</div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Gecikmə, rədd, geri, sürət</p>
          </CardContent>
        </Card>

        {/* Sector rank */}
        {(() => {
          const r = getRankDisplay(stats.rank_in_sector, stats.total_sector_schools);
          return (
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Medal className="h-4 w-4 text-indigo-500" />
                  Sektor üzrə yer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {r ? (
                  <>
                    <div className={`text-3xl font-bold ${r.color}`}>{r.label}</div>
                    <p className="text-xs text-gray-400 mt-1">Sektordakı məktəblər arasında</p>
                  </>
                ) : (
                  <div className="text-sm text-gray-400 mt-1">Məlumat yoxdur</div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Region rank */}
        {(() => {
          const r = getRankDisplay(stats.rank_in_region, stats.total_region_schools);
          return (
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Medal className="h-4 w-4 text-purple-500" />
                  Region üzrə yer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {r ? (
                  <>
                    <div className={`text-3xl font-bold ${r.color}`}>{r.label}</div>
                    <p className="text-xs text-gray-400 mt-1">Regiondakı məktəblər arasında</p>
                  </>
                ) : (
                  <div className="text-sm text-gray-400 mt-1">Məlumat yoxdur</div>
                )}
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Detailed Table */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50 border-b py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              Cədvəllər üzrə göstəricilər
            </CardTitle>
            <div className="text-xs text-gray-500 flex items-center gap-4">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> 80%+ Yaxşı</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> 60%+ Orta</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> 60%- Zəif</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="w-[300px]">Cədvəl adı</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Sətir sayı</TableHead>
                  <TableHead className="text-center">Təsdiq</TableHead>
                  <TableHead className="text-center">Rədd/Geri</TableHead>
                  <TableHead className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 mx-auto">
                          Bonus/Cərimə <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Gecikmə zamanı mənfi bal, vaxtından <br/> tez doldurulduqda müsbət xal əlavə olunur.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right font-bold w-[100px]">Bal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.tables.map((table: any) => (
                  <TableRow key={table.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium text-gray-900">{table.title}</TableCell>
                    <TableCell>{getStatusBadge(table.status)}</TableCell>
                    <TableCell className="text-center font-semibold text-gray-600">{table.row_count}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-emerald-600 font-bold">{table.approved_count}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {table.rejected_count > 0 && (
                          <span className="text-red-500 text-xs font-medium flex items-center gap-0.5">
                            <AlertTriangle className="h-3 w-3" /> {table.rejected_count}
                          </span>
                        )}
                        {table.returned_count > 0 && (
                          <span className="text-amber-500 text-xs font-medium flex items-center gap-0.5">
                            <TrendingDown className="h-3 w-3" /> {table.returned_count}
                          </span>
                        )}
                        {table.rejected_count === 0 && table.returned_count === 0 && (
                          <span className="text-gray-300">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {table.penalty > 0 && (
                          <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[10px] px-1.5 py-0">
                            -{table.penalty}
                          </Badge>
                        )}
                        {table.bonus > 0 && (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px] px-1.5 py-0">
                            +{table.bonus}
                          </Badge>
                        )}
                        {table.penalty === 0 && table.bonus === 0 && (
                          <span className="text-gray-300 text-xs">Yoxdur</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-base font-bold ${getRatingColor(table.rating_percentage)}`}>
                          {table.final_score}
                        </span>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              table.rating_percentage >= 80 ? 'bg-emerald-500' : 
                              table.rating_percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${table.rating_percentage}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Alert className="bg-blue-50 border-blue-100 text-blue-800">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-xs">
          <strong>Hesablama qaydası:</strong> Cədvəl balı = (Təsdiqlənmiş sətir / Cəmi sətir) - Gecikmə cəriməsi + Sürət bonusu. 
          Hər cədvəl üzrə maksimum bal 1.0-dir. Ballar hər 1 saatdan bir və ya cədvəl təsdiqləndikdə avtomatik yenilənir.
        </AlertDescription>
      </Alert>
    </div>
  );
}
