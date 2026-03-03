/**
 * TableEntryCompactCard - Small card component for table list view
 * Displays table info in a compact card format for the school admin list
 */

import { useMemo } from 'react';
import { Clock, CheckCircle, Archive, BarChart3, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportTable } from '@/types/reportTable';

interface TableEntryCompactCardProps {
  table: ReportTable;
  isSelected?: boolean;
  onClick: () => void;
}

export function TableEntryCompactCard({ table, isSelected, onClick }: TableEntryCompactCardProps) {
  const status = table.my_response_status;
  const rowStats = table.my_response_row_stats;
  
  const fillPercent = useMemo(() => {
    if (!rowStats || rowStats.total === 0) return 0;
    return Math.round((rowStats.completed / rowStats.total) * 100);
  }, [rowStats]);

  const isCompleted = status === 'submitted' && fillPercent === 100;
  const isInProgress = status === 'draft' || (rowStats && rowStats.completed > 0) || (status === 'submitted' && fillPercent < 100);
  const notStarted = !status && (!rowStats || rowStats.completed === 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-4 transition-all duration-200 group",
        "hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5",
        isSelected 
          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20' 
          : 'bg-white border-gray-200'
      )}
    >
      {/* Header - Title & Status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2 flex-1 min-w-0">
          {table.title}
        </h3>
        <ChevronRight className={cn(
          "h-4 w-4 shrink-0 transition-transform",
          isSelected ? "text-emerald-600 rotate-90" : "text-gray-300 group-hover:text-emerald-400"
        )} />
      </div>

      {/* Description (if exists) */}
      {table.description && (
        <p className="text-xs text-gray-500 line-clamp-1 mb-3">
          {table.description}
        </p>
      )}

      {/* Progress Bar */}
      {rowStats && rowStats.total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1 text-gray-500">
              <BarChart3 className="h-3 w-3" />
              <span className="font-medium">{rowStats.completed}/{rowStats.total}</span>
            </span>
            <span className={cn(
              "font-semibold",
              fillPercent === 100 ? 'text-emerald-600' : 'text-gray-600'
            )}>
              {fillPercent}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                fillPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-400 to-blue-500'
              )}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer - Status & Deadline */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          {/* Status Badge */}
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CheckCircle className="h-3.5 w-3.5" />
              Tamamlandı
            </span>
          ) : isInProgress ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
              <Clock className="h-3.5 w-3.5" />
              Davam edir
            </span>
          ) : notStarted ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              Başlanmayıb
            </span>
          ) : null}
        </div>

        {/* Deadline */}
        {table.deadline && table.status !== 'archived' && (
          <span className="text-xs text-gray-400">
            {new Date(table.deadline).toLocaleDateString('az-AZ', { 
              day: 'numeric', 
              month: 'short' 
            })}
          </span>
        )}
        
        {/* Archived badge */}
        {table.status === 'archived' && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Archive className="h-3.5 w-3.5" />
            Arxiv
          </span>
        )}
      </div>
    </button>
  );
}
