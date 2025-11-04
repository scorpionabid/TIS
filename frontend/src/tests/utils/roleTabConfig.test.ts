import { describe, expect, it } from 'vitest';

import {
  ROLE_TAB_CONFIG,
  canAccessRoleTab,
  getRoleTabConfig,
  getVisibleRoleTabs,
} from '@/components/modals/UserModal/utils/roleTabConfig';

describe('roleTabConfig helpers', () => {
  it('returns all role tabs for superadmin', () => {
    const tabs = getVisibleRoleTabs('superadmin');
    expect(tabs.sort()).toEqual(Object.keys(ROLE_TAB_CONFIG).sort());
  });

  it('restricts access for non-privileged roles', () => {
    const tabs = getVisibleRoleTabs('müəllim');
    expect(tabs).toHaveLength(0);
  });

  it('checks access for a specific tab', () => {
    expect(canAccessRoleTab('regionadmin', 'regionoperator')).toBe(true);
    expect(canAccessRoleTab('müəllim', 'regionoperator')).toBe(false);
  });

  it('returns config for known tab id', () => {
    const config = getRoleTabConfig('regionoperator');
    expect(config?.targetRoleName).toBe('regionoperator');
  });
});
