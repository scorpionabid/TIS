/**
 * AnalyticsOverview - Overview tab content for TableAnalytics
 */

import React from 'react';
import { Building2, Users, BarChart, TrendingUp, CheckCircle2, Clock, XCircle, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TableAnalyticsSummary } from '@/types/reportTable';
import { SimpleBarChart } from './SimpleBarChart';
import { StatCard } from './StatCard';

interface AnalyticsOverviewProps {
  analytics: TableAnalyticsSummary;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({
  analytics,
}) => {
  const { summary } = analytics;
  
  // Status distribution data for chart
  const statusData = [
    { label: 'Qaralama', value: summary.responses.draft, color: '#6b7280' },
    { label: 'Göndərilib', value: summary.responses.submitted, color: '#f59e0b' },
    { label: 'Təsdiqləndi', value: summary.responses.approved, color: '#10b981' },
  ].filter(d => d.value > 0);
  
  // Row status data
  const rowStatusData = [
    { label: 'Ümumi', value: summary.rows.total, color: '#6366f1' },
    { label: 'Göndərilib', value: summary.rows.submitted, color: '#f59e0b' },
    { label: 'Təsdiqləndi', value: summary.rows.approved, color: '#10b981' },
    { label: 'Rədd edildi', value: summary.rows.rejected, color: '#ef4444' },
    { label: 'Gözləyir', value: summary.rows.pending_approval, color: '#3b82f6' },
  ].filter(d => d.value > 0);
  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Müəssisələr"
          value={`${summary.responded_institutions}/${summary.target_institutions}`}
          icon={<Building2 className="h-4 w-4 text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          label="İştirak %"
          value={`${summary.participation_rate.toFixed(1)}%`}
          icon={<Users className="h-4 w-4 text-emerald-600" />}
          color="bg-emerald-50"
        />
        <StatCard
          label="Ümumi sətir"
          value={summary.rows.total}
          icon={<BarChart className="h-4 w-4 text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard
          label="Göndərilib"
          value={summary.responses.submitted}
          icon={<Send className="h-4 w-4 text-orange-600" />}
          color="bg-orange-50"
        />
      </div>

      {/* Charts and Info */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Response Status Distribution */}
        <div className="border rounded-lg p-4">
          <SimpleBarChart
            data={statusData}
            labelKey="label"
            valueKey="value"
            title="Cavab status paylanması"
          />
        </div>
        
        {/* Row Status Distribution */}
        <div className="border rounded-lg p-4">
          <SimpleBarChart
            data={rowStatusData}
            labelKey="label"
            valueKey="value"
            title="Sətir status paylanması"
          />
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-amber-700 font-medium">Gözləyir</span>
          </div>
          <p className="text-2xl font-bold text-amber-800">{summary.rows.pending_approval}</p>
          <p className="text-xs text-amber-600">təsdiq gözləyən sətir</p>
        </div>
        
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs text-emerald-700 font-medium">Təsdiqləndi</span>
          </div>
          <p className="text-2xl font-bold text-emerald-800">{summary.rows.approved}</p>
          <p className="text-xs text-emerald-600">təsdiqlənmiş sətir</p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-xs text-red-700 font-medium">Rədd edildi</span>
          </div>
          <p className="text-2xl font-bold text-red-800">{summary.rows.rejected}</p>
          <p className="text-xs text-red-600">rədd edilmiş sətir</p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsOverview;
