import { improvedNavigationConfig, MenuGroup, MenuItem } from '@/config/navigation';

const flattenMenuItems = (groups: MenuGroup[]): MenuItem[] => {
  const items: MenuItem[] = [];

  groups.forEach(group => {
    group.items.forEach(item => {
      items.push(item);

      if (item.children) {
        items.push(...item.children);
      }
    });
  });

  return items;
};

export const hasPermission = (permissions: string[], permission: string): boolean => {
  return permissions.includes(permission);
};

export const getPermissionBasedMenuStructure = (permissions: string[]): MenuItem[] => {
  const items = flattenMenuItems(improvedNavigationConfig);

  return items.filter(item => {
    const requiresApproval = item.path === '/approvals' || item.label?.includes('Təsdiq');

    if (requiresApproval) {
      return hasPermission(permissions, 'approvals.read');
    }

    return true;
  });
};
