import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, User, Lock } from 'lucide-react';
import { PermissionSource } from '@/types/permissions';

interface PermissionBadgeProps {
  source: PermissionSource;
  className?: string;
}

const BADGE_CONFIG = {
  [PermissionSource.ROLE]: {
    icon: Shield,
    label: 'Role',
    className: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  [PermissionSource.DIRECT]: {
    icon: User,
    label: 'Direct',
    className: 'bg-green-100 text-green-800 border-green-300',
  },
  [PermissionSource.INHERITED]: {
    icon: Lock,
    label: 'Inherited',
    className: 'bg-gray-100 text-gray-800 border-gray-300',
  },
};

export function PermissionBadge({ source, className = '' }: PermissionBadgeProps) {
  const config = BADGE_CONFIG[source];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} ${className} text-xs`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
