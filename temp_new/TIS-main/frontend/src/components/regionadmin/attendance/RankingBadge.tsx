import React from 'react';
import { Medal, Trophy, Flame, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankingBadgeProps {
  rank: number;
  isLate?: boolean;
  className?: string;
  showIcon?: boolean;
}

export function RankingBadge({ rank, isLate, className, showIcon = true }: RankingBadgeProps) {
  // İlk 3 medal
  if (rank === 1) {
    return (
      <div className={cn('inline-flex items-center gap-1 font-bold', className)}>
        {showIcon && <Medal className="h-5 w-5 text-yellow-500" />}
        <span className="text-yellow-600">🥇 1</span>
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div className={cn('inline-flex items-center gap-1 font-bold', className)}>
        {showIcon && <Medal className="h-5 w-5 text-slate-400" />}
        <span className="text-slate-500">🥈 2</span>
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div className={cn('inline-flex items-center gap-1 font-bold', className)}>
        {showIcon && <Medal className="h-5 w-5 text-amber-600" />}
        <span className="text-amber-700">🥉 3</span>
      </div>
    );
  }

  // 4-10 arası "Top 10" badge
  if (rank <= 10) {
    return (
      <div className={cn('inline-flex items-center gap-1 font-semibold', className)}>
        {showIcon && <Flame className="h-4 w-4 text-orange-500" />}
        <span className="text-orange-600">{rank}</span>
      </div>
    );
  }

  // Gecikmə ilə dolduranlar üçün xüsusi badge
  if (isLate) {
    return (
      <div className={cn('inline-flex items-center gap-1 text-slate-400', className)}>
        {showIcon && <Clock className="h-3 w-3" />}
        <span>{rank}</span>
      </div>
    );
  }

  // Normal rəqəm
  return (
    <span className={cn('text-slate-600 font-medium', className)}>
      {rank}
    </span>
  );
}

// Doldurma vaxtı üçün badge
interface SubmissionTimeBadgeProps {
  submittedAt: string | null;
  deadline: string | null;
  isLate: boolean;
  lateMinutes: number;
  className?: string;
}

export function SubmissionTimeBadge({
  submittedAt,
  deadline,
  isLate,
  lateMinutes,
  className,
}: SubmissionTimeBadgeProps) {
  if (!submittedAt) {
    return (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500', className)}>
        Doldurulmayıb
      </span>
    );
  }

  const time = new Date(submittedAt).toLocaleTimeString('az-AZ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isLate) {
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700', className)}>
        <Clock className="h-3 w-3" />
        {time}
        <span className="text-red-500">(+{lateMinutes} dəq)</span>
      </span>
    );
  }

  // Ən tez dolduranlar üçün xüsusi vurğulama
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700', className)}>
      <Zap className="h-3 w-3" />
      {time}
    </span>
  );
}

// Status badge
interface StatusBadgeProps {
  status: 'on_time' | 'late' | 'not_submitted';
  lateMinutes?: number;
  className?: string;
}

export function StatusBadge({ status, lateMinutes, className }: StatusBadgeProps) {
  switch (status) {
    case 'on_time':
      return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700', className)}>
          <Trophy className="h-3 w-3 mr-1" />
          Vaxtında
        </span>
      );
    case 'late':
      return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700', className)}>
          <Clock className="h-3 w-3 mr-1" />
          Gecikmə {lateMinutes ? `(${lateMinutes} dəq)` : ''}
        </span>
      );
    case 'not_submitted':
      return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500', className)}>
          Gözləyir
        </span>
      );
    default:
      return null;
  }
}

// Növə tipi badge
interface ShiftTypeBadgeProps {
  shiftType: 'morning' | 'evening' | null;
  className?: string;
}

export function ShiftTypeBadge({ shiftType, className }: ShiftTypeBadgeProps) {
  if (!shiftType) {
    return (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500', className)}>
        -/-
      </span>
    );
  }

  const isMorning = shiftType === 'morning';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        isMorning
          ? 'bg-blue-100 text-blue-700'
          : 'bg-orange-100 text-orange-700',
        className
      )}
    >
      {isMorning ? 'Səhər' : 'Günorta'}
    </span>
  );
}
