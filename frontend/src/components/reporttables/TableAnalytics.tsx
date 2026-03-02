/**
 * TableAnalytics - Analytics and charts for report table data
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Download,
  Calendar,
  Building2,
  Users,
  Loader2,
  BarChart,
  Activity,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ReportTable, ReportTableResponse, ReportTableColumn } from '@/types/reportTable';
import { reportTableService } from '@/services/reportTables';

interface TableAnalyticsProps {
  table: ReportTable;
  trigger?: React.ReactNode;
}

// Simple bar chart component
function SimpleBarChart({ data, labelKey, valueKey, title }: { 
  data: Array<{ label: string; value: number; color?: string }>;
  labelKey: string;
  valueKey: string;
  title: string;
}) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm">{title}</h4>
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 truncate max-w-[150px]">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ 
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stats card
function StatCard({ label, value, icon, color }: { 
  label: string; 
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white border rounded-lg p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export function TableAnalytics({ table, trigger }: TableAnalyticsProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: responsesData, isLoading } = useQuery({
    queryKey: ['table-analytics', table.id],
    queryFn: () => reportTableService.getAllResponses(table.id),
    enabled: open,
  });

  const responses: ReportTableResponse[] = responsesData || [];

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!responses.length) return null;

    // Submission stats
    const submitted = responses.filter(r => r.status === 'submitted').length;
    const draft = responses.filter(r => r.status === 'draft').length;
    const totalRows = responses.reduce((acc, r) => acc + (r.rows?.length || 0), 0);
    
    // Institution participation
    const institutionCount = responses.length;
    const targetCount = table.target_institutions?.length || 0;
    const participationRate = targetCount > 0 ? (institutionCount / targetCount) * 100 : 0;

    // Column analytics (for number columns)
    const numberColumns = table.columns?.filter(col => col.type === 'number') || [];
    const columnStats = numberColumns.map(col => {
      const values: number[] = [];
      responses.forEach(r => {
        r.rows?.forEach(row => {
          const val = parseFloat(String(row[col.key]));
          if (!isNaN(val)) values.push(val);
        });
      });

      if (values.length === 0) return null;

      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      return {
        column: col,
        count: values.length,
        sum,
        avg,
        min,
        max,
      };
    }).filter(Boolean);

    // Status distribution
    const statusDistribution = [
      { label: 'Göndərilib', value: submitted, color: '#10b981' },
      { label: 'Qaralama', value: draft, color: '#6b7280' },
    ];

    return {
      submitted,
      draft,
      totalRows,
      institutionCount,
      targetCount,
      participationRate,
      columnStats,
      statusDistribution,
    };
  }, [responses, table]);

  const handleExport = () => {
    if (!analytics) return;
    
    const report = {
      table: table.title,
      generatedAt: new Date().toISOString(),
      summary: {
        totalInstitutions: analytics.institutionCount,
        targetInstitutions: analytics.targetCount,
        participationRate: `${analytics.participationRate.toFixed(1)}%`,
        totalResponses: analytics.submitted + analytics.draft,
        submitted: analytics.submitted,
        draft: analytics.draft,
        totalRows: analytics.totalRows,
      },
      columnStats: analytics.columnStats,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${table.id}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Analitik hesabat yükləndi');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            Analitika
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Cədvəl analitikası
            <span className="text-sm font-normal text-gray-500">({table.title})</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="gap-1">
              <Activity className="h-4 w-4" /> Ümumi
            </TabsTrigger>
            <TabsTrigger value="columns" className="gap-1">
              <BarChart className="h-4 w-4" /> Sütunlar
            </TabsTrigger>
            <TabsTrigger value="institutions" className="gap-1">
              <Building2 className="h-4 w-4" /> Müəssisələr
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : !analytics ? (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Hələ kifayət qədər məlumat yoxdur</p>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard
                      label="Müəssisələr"
                      value={`${analytics.institutionCount}/${analytics.targetCount}`}
                      icon={<Building2 className="h-4 w-4 text-blue-600" />}
                      color="bg-blue-50"
                    />
                    <StatCard
                      label="İştirak %"
                      value={`${analytics.participationRate.toFixed(1)}%`}
                      icon={<Users className="h-4 w-4 text-emerald-600" />}
                      color="bg-emerald-50"
                    />
                    <StatCard
                      label="Ümumi sətir"
                      value={analytics.totalRows}
                      icon={<BarChart className="h-4 w-4 text-purple-600" />}
                      color="bg-purple-50"
                    />
                    <StatCard
                      label="Göndərilib"
                      value={analytics.submitted}
                      icon={<TrendingUp className="h-4 w-4 text-orange-600" />}
                      color="bg-orange-50"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <SimpleBarChart
                        data={analytics.statusDistribution}
                        labelKey="label"
                        valueKey="value"
                        title="Status paylanması"
                      />
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-3">Cədvəl məlumatları</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Sütun sayı:</dt>
                          <dd className="font-medium">{table.columns?.length || 0}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Maksimum sətir:</dt>
                          <dd className="font-medium">{table.max_rows}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Son tarix:</dt>
                          <dd className="font-medium">
                            {table.deadline 
                              ? new Date(table.deadline).toLocaleDateString('az-AZ')
                              : 'Yoxdur'
                            }
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Rəqəm sütunları:</dt>
                          <dd className="font-medium">
                            {table.columns?.filter(c => c.type === 'number').length || 0}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </TabsContent>

                {/* Columns Tab */}
                <TabsContent value="columns" className="mt-0 space-y-4">
                  {analytics.columnStats.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Rəqəm tipli sütun tapılmadı</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {analytics.columnStats.map((stat: any) => (
                        <div key={stat.column.key} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{stat.column.label}</h4>
                            <Badge variant="outline">{stat.count} dəyər</Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-gray-500 text-xs">Cəm</p>
                              <p className="font-medium">{stat.sum.toLocaleString('az-AZ')}</p>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-gray-500 text-xs">Orta</p>
                              <p className="font-medium">{stat.avg.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-gray-500 text-xs">Minimum</p>
                              <p className="font-medium">{stat.min.toLocaleString('az-AZ')}</p>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-gray-500 text-xs">Maksimum</p>
                              <p className="font-medium">{stat.max.toLocaleString('az-AZ')}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Institutions Tab */}
                <TabsContent value="institutions" className="mt-0">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Müəssisə</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-right">Sətir sayı</th>
                          <th className="px-3 py-2 text-right">Son yeniləmə</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {responses.map((response) => (
                          <tr key={response.id}>
                            <td className="px-3 py-2">
                              {response.institution?.name || 'Unknown'}
                            </td>
                            <td className="px-3 py-2">
                              <Badge 
                                variant={response.status === 'submitted' ? 'default' : 'secondary'}
                                className={response.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' : ''}
                              >
                                {response.status === 'submitted' ? 'Göndərilib' : 'Qaralama'}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {response.rows?.length || 0}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-500">
                              {response.updated_at 
                                ? new Date(response.updated_at).toLocaleDateString('az-AZ')
                                : '-'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Bağla
          </Button>
          <Button 
            size="sm" 
            onClick={handleExport}
            disabled={!analytics || isLoading}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            Hesabat yüklə
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TableAnalytics;
