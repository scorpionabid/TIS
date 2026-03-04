/**
 * AnalyticsInstitutions - Institutions list tab content
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Building2, BarChart3, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import type { TableAnalyticsSummary, AnalyticsSectorStat } from '@/types/reportTable';
import { Progress } from '@/components/ui/progress';

interface AnalyticsInstitutionsProps {
  analytics: TableAnalyticsSummary;
}

export const AnalyticsInstitutions: React.FC<AnalyticsInstitutionsProps> = ({
  analytics,
}) => {
  const { summary, sectors } = analytics;

  if (sectors.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium text-gray-600">Hələ cavab yoxdur</p>
        <p className="text-sm mt-1">
          Bu cədvələ hələ heç bir məktəb cavab verməyib.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-600 mb-1">Hədəf müəssisələr</p>
          <p className="text-xl font-bold text-blue-700">{summary.target_institutions}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
          <p className="text-xs text-emerald-600 mb-1">Cavab verənlər</p>
          <p className="text-xl font-bold text-emerald-700">{summary.responded_institutions}</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
          <p className="text-xs text-purple-600 mb-1">İştirak faizi</p>
          <p className="text-xl font-bold text-purple-700">{summary.participation_rate.toFixed(1)}%</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
          <p className="text-xs text-amber-600 mb-1">Ümumi sətir</p>
          <p className="text-xl font-bold text-amber-700">{summary.rows.total}</p>
        </div>
      </div>

      {/* Sector Breakdown */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h4 className="font-medium text-sm">Sektorlar üzrə icmal</h4>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Sektor</th>
              <th className="px-4 py-2 text-center">Məktəb sayı</th>
              <th className="px-4 py-2 text-center">Cavab verən</th>
              <th className="px-4 py-2 text-center">Göndərilib</th>
              <th className="px-4 py-2 text-right">İştirak %</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sectors.map((sector: AnalyticsSectorStat) => {
              const participationRate = sector.total_schools > 0
                ? Math.round((sector.responded / sector.total_schools) * 100)
                : 0;
              return (
                <tr key={sector.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{sector.name}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      {sector.total_schools}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className="text-blue-700 bg-blue-50">
                      {sector.responded}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {sector.submitted}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={participationRate} className="h-2 w-20" />
                      <span className="text-xs font-medium text-gray-600 w-10 text-right">
                        {participationRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsInstitutions;
