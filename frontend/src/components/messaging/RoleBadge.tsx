import { cn } from '@/lib/utils';
import { getRoleDisplayName } from '@/constants/roles';
import type { UserRole } from '@/constants/roles';

const ROLE_COLOR_MAP: Record<string, string> = {
  regionadmin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  regionoperator: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  sektoradmin: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  schooladmin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_COLOR_MAP[role] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', cls)}>
      {getRoleDisplayName(role as UserRole)}
    </span>
  );
}
