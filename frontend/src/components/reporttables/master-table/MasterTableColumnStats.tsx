/**
 * MasterTableColumnStats - Column statistics display with tooltips
 */

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ColumnStat } from './types';

interface MasterTableColumnStatsProps {
  stats: Record<string, ColumnStat>;
}

export const MasterTableColumnStats: React.FC<MasterTableColumnStatsProps> = ({ stats }) => {
  return (
    <div className="bg-slate-50 p-4 rounded-lg border">
      <h4 className="text-sm font-medium mb-3">Sütun statistikası:</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Object.entries(stats).map(([key, stat]) => (
          <TooltipProvider key={key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-white p-3 rounded border cursor-help">
                  <div className="text-xs text-gray-500 truncate">{stat.label}</div>
                  <div className="text-lg font-semibold">{stat.total.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">ortalama: {stat.average?.toFixed(1)}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p><strong>{stat.label}</strong></p>
                  <p>Cəmi: {stat.total.toLocaleString()}</p>
                  <p>Ortalama: {stat.average?.toFixed(2)}</p>
                  <p>Min: {stat.min}, Maks: {stat.max}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
};

export default MasterTableColumnStats;
