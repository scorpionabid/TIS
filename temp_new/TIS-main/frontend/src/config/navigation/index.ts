/**
 * Navigation configuration barrel.
 *
 * All external imports should use `@/config/navigation` — this file is the
 * single public surface.  The internal split into workMenu / managementMenu /
 * helpers is an implementation detail.
 */

export type { MenuItem, MenuGroup } from './types';
export * from './roleSets';

import { workMenuGroups } from './workMenu';
import { managementMenuGroups } from './managementMenu';
import {
  getMenuForRole as _getMenuForRole,
  getMenuForRoleAndPanel as _getMenuForRoleAndPanel,
  findMenuItem as _findMenuItem,
} from './helpers';
import { UserRole } from '@/constants/roles';
import { SidebarPanel } from '@/types/sidebar';
import { MenuGroup } from './types';

// ─── Combined Config ──────────────────────────────────────────────────────────

export const improvedNavigationConfig: MenuGroup[] = [
  ...workMenuGroups,
  ...managementMenuGroups,
];

/** Canonical export — same data, descriptive alias kept for consumers */
export const universalNavigationConfig = improvedNavigationConfig;

// ─── Helper Functions (legacy signatures — config is bound internally) ────────

export const getMenuForRole = (
  role: UserRole,
  permissions: string[] = [],
): MenuGroup[] => _getMenuForRole(improvedNavigationConfig, role, permissions);

export const getMenuForRoleAndPanel = (
  role: UserRole,
  panel: SidebarPanel,
  permissions: string[] = [],
): MenuGroup[] =>
  _getMenuForRoleAndPanel(improvedNavigationConfig, role, panel, permissions);

export const getManagementMenuForRole = (
  role: UserRole,
  permissions: string[] = [],
): MenuGroup[] =>
  _getMenuForRoleAndPanel(improvedNavigationConfig, role, 'management', permissions);

export const getWorkMenuForRole = (
  role: UserRole,
  permissions: string[] = [],
): MenuGroup[] =>
  _getMenuForRoleAndPanel(improvedNavigationConfig, role, 'work', permissions);

export const findMenuItem = (path: string) =>
  _findMenuItem(improvedNavigationConfig, path);
