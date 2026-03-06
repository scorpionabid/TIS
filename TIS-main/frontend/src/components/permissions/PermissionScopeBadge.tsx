import { Badge } from '@/components/ui/badge';
import type { Permission } from '@/services/permissions';

interface PermissionScopeBadgeProps {
  scope: Permission['scope'];
  className?: string;
}

const scopeStyles: Record<Permission['scope'], string> = {
  global: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
  system: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200',
  regional: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
  sector: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  institution: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200',
  classroom: 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200',
};

const scopeLabels: Record<Permission['scope'], string> = {
  global: 'Sistem',
  system: 'System',
  regional: 'Regional',
  sector: 'Sektor',
  institution: 'Məktəb',
  classroom: 'Sinif',
};

const scopeDescriptions: Record<Permission['scope'], string> = {
  global: 'Yalnız SuperAdmin (Level 1)',
  system: 'SuperAdmin + RegionAdmin (Level 1-2)',
  regional: 'Regional Admin + Sektor Admin (Level 1-4)',
  sector: 'Sektor səviyyəsi (Level 1-6)',
  institution: 'Məktəb səviyyəsi (Level 1-8)',
  classroom: 'Bütün rollər (Level 1-10)',
};

export function PermissionScopeBadge({ scope, className }: PermissionScopeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`${scopeStyles[scope]} ${className || ''}`}
      title={scopeDescriptions[scope]}
    >
      {scopeLabels[scope]}
    </Badge>
  );
}

export { scopeLabels, scopeStyles, scopeDescriptions };
