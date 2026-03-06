/**
 * Shared Status Badge components for Report Tables
 * Consolidates status display logic across multiple components
 */

import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export type ResponseStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type RowStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'default';
}

/**
 * Response-level status badge
 * Shows: Göndərilib (submitted) or Qaralama (draft)
 */
export function ResponseStatusBadge({ status, size = 'default' }: StatusBadgeProps) {
  const isSmall = size === 'sm';
  const className = isSmall ? 'text-xs' : '';

  if (status === 'submitted') {
    return (
      <Badge className={`bg-emerald-100 text-emerald-700 border-emerald-200 ${className}`}>
        Göndərilib
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={`text-gray-500 ${className}`}>
      Qaralama
    </Badge>
  );
}

interface RowStatusBadgeProps {
  status?: RowStatus | string;
  rejectionReason?: string;
  size?: 'sm' | 'default';
}

/**
 * Row-level status badge with detailed states
 * Shows: Gözləyir, Təsdiqləndi, Rədd edildi, or — (draft)
 */
export function RowStatusBadge({
  status,
  rejectionReason,
  size = 'default',
}: RowStatusBadgeProps) {
  const isSmall = size === 'sm';
  const baseClasses = isSmall
    ? 'text-xs gap-1 whitespace-nowrap'
    : 'gap-1 whitespace-nowrap';

  if (!status || status === 'draft') {
    return <span className="text-xs text-gray-400">—</span>;
  }

  if (status === 'submitted') {
    return (
      <Badge className={`bg-amber-100 text-amber-700 border-amber-200 ${baseClasses}`}>
        <Clock className="h-3 w-3" /> Gözləyir
      </Badge>
    );
  }

  if (status === 'approved') {
    return (
      <Badge className={`bg-emerald-100 text-emerald-700 border-emerald-200 ${baseClasses}`}>
        <CheckCircle2 className="h-3 w-3" /> Təsdiqləndi
      </Badge>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge className={`bg-red-100 text-red-700 border-red-200 ${baseClasses}`}>
          <XCircle className="h-3 w-3" /> Rədd edildi
        </Badge>
        {rejectionReason && (
          <p className="text-xs text-red-500 italic leading-tight max-w-[180px]">
            {rejectionReason}
          </p>
        )}
      </div>
    );
  }

  return null;
}

interface ProcessingStatusBadgeProps {
  isPending: boolean;
  label: string;
}

/**
 * Processing/loading status badge
 */
export function ProcessingStatusBadge({ isPending, label }: ProcessingStatusBadgeProps) {
  if (isPending) {
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Gözləyir...
      </Badge>
    );
  }
  return <Badge variant="outline">{label}</Badge>;
}
