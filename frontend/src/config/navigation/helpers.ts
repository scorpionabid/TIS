import { UserRole, USER_ROLES } from '@/constants/roles';
import { SidebarPanel } from '@/types/sidebar';
import { MenuItem, MenuGroup } from './types';

/**
 * Schooladmin üçün "Akademik İzləmə" qrupunu "İdarəetmə"-dən əvvələ çəkir.
 * Digər rollar üçün sıra dəyişmir.
 */
function reorderGroupsForRole(groups: MenuGroup[], role: UserRole): MenuGroup[] {
  if (role !== USER_ROLES.SCHOOLADMIN) return groups;

  const managementIdx = groups.findIndex(g => g.id === 'management');
  const academicIdx   = groups.findIndex(g => g.id === 'academic');

  if (managementIdx === -1 || academicIdx === -1 || academicIdx <= managementIdx) {
    return groups;
  }

  const result = [...groups];
  const [academic] = result.splice(academicIdx, 1);
  result.splice(managementIdx, 0, academic);
  return result;
}

/**
 * Recursively filter menu items based on the user's role and permission set.
 * Items without a `roles` array are visible to all roles.
 * Items with `permissions` apply `permissionMatch` logic (default: 'any').
 */
function filterMenuItems(
  items: MenuItem[],
  role: UserRole,
  permissions: string[],
): MenuItem[] {
  return items
    .filter((item) => {
      const roleAllowed = !item.roles || item.roles.includes(role);
      if (!roleAllowed) return false;
      if (!item.permissions || item.permissions.length === 0) return true;

      const matchType = item.permissionMatch ?? 'any';
      if (matchType === 'all') {
        return item.permissions.every((p) => permissions.includes(p));
      }
      return item.permissions.some((p) => permissions.includes(p));
    })
    .map((item) => ({
      ...item,
      children: item.children
        ? filterMenuItems(item.children, role, permissions)
        : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0);
}

function findChildMenuItem(items: MenuItem[], path: string): MenuItem | null {
  for (const item of items) {
    if (item.path === path) return item;
    if (item.children) {
      const found = findChildMenuItem(item.children, path);
      if (found) return found;
    }
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getMenuForRole(
  config: MenuGroup[],
  role: UserRole,
  permissions: string[] = [],
): MenuGroup[] {
  const groups = config
    .filter((group) => !group.roles || group.roles.includes(role))
    .map((group) => ({
      ...group,
      items: filterMenuItems(group.items, role, permissions),
    }))
    .filter((group) => group.items.length > 0);

  return reorderGroupsForRole(groups, role);
}

export function getMenuForRoleAndPanel(
  config: MenuGroup[],
  role: UserRole,
  panel: SidebarPanel,
  permissions: string[] = [],
): MenuGroup[] {
  const groups = config
    .filter((group) => group.panel === panel)
    .filter((group) => !group.roles || group.roles.includes(role))
    .map((group) => ({
      ...group,
      items: filterMenuItems(group.items, role, permissions),
    }))
    .filter((group) => group.items.length > 0);

  return reorderGroupsForRole(groups, role);
}

export function findMenuItem(
  config: MenuGroup[],
  path: string,
): MenuItem | null {
  for (const group of config) {
    for (const item of group.items) {
      if (item.path === path) return item;
      if (item.children) {
        const found = findChildMenuItem(item.children, path);
        if (found) return found;
      }
    }
  }
  return null;
}
