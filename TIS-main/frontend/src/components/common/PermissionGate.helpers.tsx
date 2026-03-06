import React from 'react';
import PermissionGate from './PermissionGate';
import type { UserRole } from '@/constants/roles';

type GateProps = { children: React.ReactNode; fallback?: React.ReactNode };

export const AdminGate: React.FC<GateProps> = ({ children, fallback }) => (
  <PermissionGate
    roles={['superadmin', 'regionadmin', 'sektoradmin'] as UserRole[]}
    fallback={fallback}
    showFallback={!!fallback}
  >
    {children}
  </PermissionGate>
);

export const SuperAdminGate: React.FC<GateProps> = ({ children, fallback }) => (
  <PermissionGate
    roles={['superadmin'] as UserRole[]}
    fallback={fallback}
    showFallback={!!fallback}
  >
    {children}
  </PermissionGate>
);

export const SchoolGate: React.FC<GateProps> = ({ children, fallback }) => (
  <PermissionGate
    roles={['superadmin', 'schooladmin'] as UserRole[]}
    fallback={fallback}
    showFallback={!!fallback}
  >
    {children}
  </PermissionGate>
);

export const TeacherGate: React.FC<GateProps> = ({ children, fallback }) => (
  <PermissionGate
    roles={['superadmin', 'schooladmin', 'müəllim'] as UserRole[]}
    fallback={fallback}
    showFallback={!!fallback}
  >
    {children}
  </PermissionGate>
);
