import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, GitCompare, TrendingUp, Target, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { OverviewTab } from './tabs/OverviewTab';
import { ComparisonTab } from './tabs/ComparisonTab';
import { TrendsTab } from './tabs/TrendsTab';
import { DeepDiveTab } from './tabs/DeepDiveTab';
import { AnalysisFiltersComponent, type AnalysisFilters } from './filters/AnalysisFilters';

export function GradeBookAnalysis() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<AnalysisFilters>({
    status: 'active',
  });
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    toast({
      title: 'Export hazırlanır',
      description: `${activeTab} məlumatları export edilir...`,
    });
    // TODO: Implement actual export
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Nəticə Analizi</h1>
          <p className="text-slate-500 mt-1">Qiymətləndirmə nəticələrinin hərtərəfli təhlili</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <AnalysisFiltersComponent filters={filters} onFiltersChange={setFilters} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Ümumi</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <GitCompare className="w-4 h-4" />
            <span className="hidden sm:inline">Müqayisə</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Trend</span>
          </TabsTrigger>
          <TabsTrigger value="deep-dive" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Dərin Təhlil</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab filters={filters} loading={loading} setLoading={setLoading} />
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <ComparisonTab filters={filters} loading={loading} setLoading={setLoading} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <TrendsTab filters={filters} loading={loading} setLoading={setLoading} />
        </TabsContent>

        <TabsContent value="deep-dive" className="space-y-4">
          <DeepDiveTab filters={filters} loading={loading} setLoading={setLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
