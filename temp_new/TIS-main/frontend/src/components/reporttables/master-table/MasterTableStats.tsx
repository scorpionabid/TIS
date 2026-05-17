/**
 * MasterTableStats - Header stats cards showing summary metrics
 */

import React from 'react';

interface MasterTableStatsProps {
  filteredCount: number;
  totalCount: number;
  submittedCount: number;
  pendingCount: number;
  approvedCount: number;
}

export const MasterTableStats: React.FC<MasterTableStatsProps> = ({
  filteredCount,
  totalCount,
  submittedCount,
  pendingCount,
  approvedCount,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Institutions */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="text-sm text-gray-500">Məktəblər</div>
        <div className="text-2xl font-bold">{filteredCount}</div>
        <div className="text-xs text-gray-400">cəmi {totalCount}</div>
      </div>

      {/* Submitted */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="text-sm text-gray-500">Təqdim edilmiş</div>
        <div className="text-2xl font-bold text-emerald-600">{submittedCount}</div>
      </div>

      {/* Pending */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="text-sm text-gray-500">Gözləyən</div>
        <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
      </div>

      {/* Approved */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="text-sm text-gray-500">Təsdiqlənmiş</div>
        <div className="text-2xl font-bold text-blue-600">{approvedCount}</div>
      </div>
    </div>
  );
};

export default MasterTableStats;
