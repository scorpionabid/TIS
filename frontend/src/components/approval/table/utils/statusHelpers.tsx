import React from 'react';
import { Badge } from '../../../ui/badge';
import { CheckCircle, XCircle, Clock, Edit, RefreshCw } from 'lucide-react';

/**
 * Get status dot component for response status
 */
export const getStatusDot = (status: string) => {
  const statusConfig = {
    draft: {
      dotColor: 'bg-black',
      label: 'Qaralama',
      tooltip: 'Hələ tamamlanmayıb'
    },
    submitted: {
      dotColor: 'bg-blue-600',
      label: 'Təqdim edildi',
      tooltip: 'Təsdiq gözlənilir'
    },
    approved: {
      dotColor: 'bg-green-600',
      label: 'Təsdiqləndi',
      tooltip: 'Rəsmi olaraq təsdiqlənib'
    },
    rejected: {
      dotColor: 'bg-red-600',
      label: 'Rədd edildi',
      tooltip: 'Təkrar işləmə tələb olunur'
    },
    returned: {
      dotColor: 'bg-amber-600',
      label: 'Geri qaytarıldı',
      tooltip: 'Yenidən işləmə üçün qaytarılıb'
    },
  } as const;

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <div
      className={`w-3 h-3 rounded-full ${config.dotColor} ring-2 ring-white shadow-sm cursor-help`}
      title={`${config.label} - ${config.tooltip}`}
    />
  );
};

/**
 * Get status badge with icon for response status
 */
export const getStatusBadge = (status: string) => {
  const statusConfig = {
    draft: { 
      className: 'bg-black text-white hover:bg-black/80', 
      icon: Edit, 
      text: 'Qaralama' 
    },
    submitted: { 
      className: 'bg-blue-600 text-white hover:bg-blue-700', 
      icon: Clock, 
      text: 'Təqdim edilib' 
    },
    approved: { 
      className: 'bg-green-600 text-white hover:bg-green-700', 
      icon: CheckCircle, 
      text: 'Təsdiqləndi' 
    },
    rejected: { 
      className: 'bg-red-600 text-white hover:bg-red-700', 
      icon: XCircle, 
      text: 'Rədd edildi' 
    },
    returned: { 
      className: 'bg-amber-600 text-white hover:bg-amber-700', 
      icon: RefreshCw, 
      text: 'Geri qaytarıldı' 
    },
  } as const;

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <Badge className={`flex items-center gap-1 border-none ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.text}
    </Badge>
  );
};

/**
 * Get approval status badge for approval workflow status
 */
export const getApprovalStatusBadge = (status?: string) => {
  if (!status) return null;

  const statusConfig = {
    pending: { variant: 'default', icon: Clock, text: 'Gözləyir' },
    in_progress: { variant: 'default', icon: RefreshCw, text: 'İcrada' },
    approved: { variant: 'success', icon: CheckCircle, text: 'Təsdiqləndi' },
    rejected: { variant: 'destructive', icon: XCircle, text: 'Rədd edildi' },
    returned: { variant: 'secondary', icon: RefreshCw, text: 'Geri qaytarıldı' },
  } as const;

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant as any} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.text}
    </Badge>
  );
};

/**
 * Get progress bar color based on percentage
 */
export const getProgressColor = (percentage: number): string => {
  if (percentage >= 80) return 'bg-emerald-500';
  if (percentage >= 60) return 'bg-blue-500';
  if (percentage >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
};

/**
 * Format approval workflow status for display
 */
export const formatApprovalStatus = (status?: string): string => {
  const statusMap = {
    pending: 'Gözləyir',
    in_progress: 'İcrada',
    approved: 'Təsdiqləndi',
    rejected: 'Rədd edildi',
    returned: 'Geri qaytarıldı'
  };

  return statusMap[status as keyof typeof statusMap] || 'Naməlum';
};