import {
  Activity,
  CheckCircle2,
  Clock,
  Target,
  Archive,
  AlertCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled' | 'archived';
export type ActivityStatus = 'pending' | 'in_progress' | 'checking' | 'completed' | 'stuck';
export type ActivityPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ProjectStatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}

export interface ActivityStatusConfig {
  label: string;
  color: string;
  textColor: string;
}

export interface ActivityPriorityConfig {
  label: string;
  color: string;
}

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, ProjectStatusConfig> = {
  active:    { label: 'Aktiv',       icon: Activity,    color: 'text-success',         bg: 'bg-success/10',     border: 'border-success/20' },
  completed: { label: 'Tamamlanıb',  icon: CheckCircle2, color: 'text-primary',        bg: 'bg-primary/10',     border: 'border-primary/20' },
  on_hold:   { label: 'Gözləmədə',  icon: Clock,        color: 'text-warning',         bg: 'bg-warning/10',     border: 'border-warning/20' },
  cancelled: { label: 'Ləğv edilib', icon: Target,       color: 'text-muted-foreground', bg: 'bg-muted/30',      border: 'border-border/40' },
  archived:  { label: 'Arxivdə',    icon: Archive,      color: 'text-accent-foreground', bg: 'bg-accent/20',    border: 'border-accent/30' },
};

export const ACTIVITY_STATUS_CONFIG: Record<ActivityStatus, ActivityStatusConfig> = {
  pending:     { label: 'Gözləyir',   color: 'bg-warning/10',     textColor: 'text-warning' },
  in_progress: { label: 'İcradadır',  color: 'bg-primary/10',     textColor: 'text-primary' },
  checking:    { label: 'Yoxlanılır', color: 'bg-accent/20',      textColor: 'text-accent-foreground' },
  completed:   { label: 'Tamamlandı', color: 'bg-success/10',     textColor: 'text-success' },
  stuck:       { label: 'Problem var', color: 'bg-destructive/10', textColor: 'text-destructive' },
};

export const ACTIVITY_PRIORITY_CONFIG: Record<ActivityPriority, ActivityPriorityConfig> = {
  low:      { label: 'Aşağı',  color: 'text-primary' },
  medium:   { label: 'Orta',   color: 'text-warning' },
  high:     { label: 'Yüksək', color: 'text-warning' },
  critical: { label: 'Kritik', color: 'text-destructive' },
};

export const ACTIVITY_GROUP_CONFIG: Record<ActivityStatus, { title: string; color: string }> = {
  pending:     { title: 'Gözləyən İşlər',    color: 'bg-warning/10 text-warning border-warning/20' },
  in_progress: { title: 'İcradakı İşlər',   color: 'bg-primary/10 text-primary border-primary/20' },
  checking:    { title: 'Yoxlama Mərhələsi', color: 'bg-accent/20 text-accent-foreground border-accent/30' },
  completed:   { title: 'Tamamlanmış İşlər', color: 'bg-success/10 text-success border-success/20' },
  stuck:       { title: 'Problemli İşlər',   color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function formatProjectDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const clean = dateStr.includes('.') ? dateStr.split('.')[0] : dateStr;
  const date = new Date(clean);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '.');
}
