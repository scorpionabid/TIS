/**
 * AnalyticsColumns - Columns analytics tab content
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { TableAnalyticsData } from './useTableAnalytics';

interface AnalyticsColumnsProps {
  analytics: TableAnalyticsData;
}

export const AnalyticsColumns: React.FC<AnalyticsColumnsProps> = ({ analytics }) => {
  if (analytics.columnStats.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Rəqəm tipli sütun tapılmadı</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {analytics.columnStats.map((stat) => (
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
  );
};

export default AnalyticsColumns;
