/**
 * TableEntryCompactCard - Small card component for table list view
 * Displays table info in a compact card format for the school admin list
 */

import { useMemo } from 'react';
import { Clock, CheckCircle, Archive, BarChart3, ChevronRight, CheckCircle2, Hourglass, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportTable } from '@/types/reportTable';
import { Badge } from '@/components/ui/badge';

interface TableEntryCompactCardProps {
  table: ReportTable;
  isSelected?: boolean;
  onClick: () => void;
}

type DeadlineUrgency = 'none' | 'ok' | 'warning' | 'critical' | 'overdue';

export function TableEntryCompactCard({ table, isSelected, onClick }: TableEntryCompactCardProps) {
  const status = table.my_response_status;
  const rowStats = table.my_response_row_stats;

  // Calculate percentages for segmented progress bar
  const stats = useMemo(() => {
    if (!rowStats || rowStats.total === 0) {
      return { pending: 0, approved: 0, rejected: 0, total: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 };
    }

    const total = rowStats.total;
    const submitted = rowStats.submitted || 0;
    const approved = rowStats.approved || 0;
    const rejected = rowStats.rejected || 0;
    const pending = rowStats.pending || Math.max(0, submitted - approved - rejected);

    return {
      pending: Math.round((pending / total) * 100),
      approved: Math.round((approved / total) * 100),
      rejected: Math.round((rejected / total) * 100),
      total,
      pendingCount: pending,
      approvedCount: approved,
      rejectedCount: rejected,
    };
  }, [rowStats]);

  const fillPercent = useMemo(() => {
    if (!rowStats || rowStats.total === 0) return 0;
    return Math.round((rowStats.completed / rowStats.total) * 100);
  }, [rowStats]);

  // Deadline urgency calculation
  const { urgency, deadlineDays } = useMemo((): { urgency: DeadlineUrgency; deadlineDays: number | null } => {
    if (!table.deadline || table.status === 'archived') return { urgency: 'none', deadlineDays: null };
    const days = Math.ceil((new Date(table.deadline).getTime() - Date.now()) / 86400000);
    if (days < 0) return { urgency: 'overdue', deadlineDays: days };
    if (days <= 2) return { urgency: 'critical', deadlineDays: days };
    if (days <= 7) return { urgency: 'warning', deadlineDays: days };
    return { urgency: 'ok', deadlineDays: days };
  }, [table.deadline, table.status]);

  const isCompleted = status === 'submitted' && fillPercent === 100;
  const isInProgress = status === 'submitted' && fillPercent < 100;
  const notStarted = !status && (!rowStats || rowStats.completed === 0);

  const hasPendingRows = stats.pendingCount > 0;
  const hasApprovedRows = stats.approvedCount > 0;
  const hasRejectedRows = stats.rejectedCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all duration-200 group',
        'hover:shadow-md hover:-translate-y-0.5',
        isSelected
          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
          : urgency === 'overdue'
          ? 'bg-red-50/40 border-red-300 hover:border-red-400'
          : urgency === 'critical'
          ? 'bg-orange-50/30 border-orange-300 hover:border-orange-400'
          : urgency === 'warning'
          ? 'border-amber-200 bg-white hover:border-amber-300'
          : 'bg-white border-gray-200 hover:border-emerald-300'
      )}
    >
      {/* Header - Title & Badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2 flex-1 min-w-0">
          {table.title}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          {table.fixed_rows && table.fixed_rows.length > 0 && (
            <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">
              Stabil
            </Badge>
          )}
          {urgency === 'overdue' && (
            <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700 border-red-200 gap-0.5">
              <AlertTriangle className="h-2.5 w-2.5" />
              Keçib
            </Badge>
          )}
          <ChevronRight className={cn(
            'h-4 w-4 shrink-0 transition-transform',
            isSelected ? 'text-emerald-600 rotate-90' : 'text-gray-300 group-hover:text-emerald-400'
          )} />
        </div>
      </div>

      {/* Description (if exists) */}
      {table.description && (
        <p className="text-xs text-gray-500 line-clamp-1 mb-3">
          {table.description}
        </p>
      )}

      {/* Progress Section */}
      {rowStats && rowStats.total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1 text-gray-500">
              <BarChart3 className="h-3 w-3" />
              <span className="font-medium">{rowStats.completed}/{rowStats.total}</span>
            </span>
            <div className="flex items-center gap-2">
              {hasPendingRows && (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <Hourglass className="h-3 w-3" />
                  {stats.pendingCount} gözləyir
                </span>
              )}
              {hasApprovedRows && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  {stats.approvedCount} təsdiq
                </span>
              )}
              <span className={cn(
                'font-semibold',
                fillPercent === 100 ? 'text-emerald-600' : 'text-gray-600'
              )}>
                {fillPercent}%
              </span>
            </div>
          </div>

          {/* Segmented Progress Bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
            {stats.pending > 0 && (
              <div
                className="h-full bg-amber-400 transition-all duration-500"
                style={{ width: `${stats.pending}%` }}
                title={`Təsdiq gözləyir: ${stats.pendingCount} sətir`}
              />
            )}
            {stats.approved > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${stats.approved}%` }}
                title={`Təsdiqlənmiş: ${stats.approvedCount} sətir`}
              />
            )}
            {stats.rejected > 0 && (
              <div
                className="h-full bg-red-400 transition-all duration-500"
                style={{ width: `${stats.rejected}%` }}
                title={`Rədd edilmiş: ${stats.rejectedCount} sətir`}
              />
            )}
            {(stats.pending + stats.approved + stats.rejected < 100) && (
              <div className="h-full bg-gray-100 flex-1" />
            )}
          </div>

          {(hasPendingRows || hasApprovedRows || hasRejectedRows) && (
            <div className="flex items-center gap-3 mt-2 text-[10px]">
              {hasPendingRows && (
                <span className="flex items-center gap-1 text-amber-600">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  Gözləyir {stats.pendingCount}
                </span>
              )}
              {hasApprovedRows && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Təsdiq {stats.approvedCount}
                </span>
              )}
              {hasRejectedRows && (
                <span className="flex items-center gap-1 text-red-600">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  Rədd {stats.rejectedCount}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer - Status & Deadline */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
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

        {/* Deadline with urgency color */}
        {table.deadline && table.status !== 'archived' && (
          <span className={cn(
            'text-xs font-medium',
            urgency === 'overdue' ? 'text-red-600' :
            urgency === 'critical' ? 'text-orange-600' :
            urgency === 'warning' ? 'text-amber-600' :
            'text-gray-400'
          )}>
            {urgency === 'overdue'
              ? 'Son tarix keçib!'
              : urgency === 'critical' && deadlineDays !== null
              ? `${deadlineDays} gün qalıb`
              : new Date(table.deadline).toLocaleDateString('az-AZ', {
                  day: 'numeric',
                  month: 'short',
                })}
          </span>
        )}

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
