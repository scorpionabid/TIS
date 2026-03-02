/**
 * AnalyticsOverview - Overview tab content for TableAnalytics
 */

import React from 'react';
import { Building2, Users, BarChart, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ReportTable } from '@/types/reportTable';
import type { TableAnalyticsData } from './useTableAnalytics';
import { SimpleBarChart } from './SimpleBarChart';
import { StatCard } from './StatCard';

interface AnalyticsOverviewProps {
  analytics: TableAnalyticsData;
  table: ReportTable;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({
  analytics,
  table,
}) => {
  return (
    <div className="space-y-4">
      {/* Stats Grid */}
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

      {/* Charts and Info */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Status Distribution Chart */}
        <div className="border rounded-lg p-4">
          <SimpleBarChart
            data={analytics.statusDistribution}
            labelKey="label"
            valueKey="value"
            title="Status paylanması"
          />
        </div>

        {/* Table Info */}
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
                  : 'Yoxdur'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Rəqəm sütunları:</dt>
              <dd className="font-medium">
                {table.columns?.filter((c) => c.type === 'number').length || 0}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsOverview;
