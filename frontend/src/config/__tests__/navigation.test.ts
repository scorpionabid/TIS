import { describe, it, expect } from 'vitest';
import { improvedNavigationConfig } from '../navigation';
import { USER_ROLES } from '@/constants/roles';

describe('Navigation Configuration', () => {
  it('has correct roles and permissions for preschool groups', () => {
    let preschoolGroupsItem;
    
    for (const group of improvedNavigationConfig) {
      const item = group.items.find((i) => i.id === 'preschool-groups');
      if (item) {
        preschoolGroupsItem = item;
        break;
      }
    }

    expect(preschoolGroupsItem).toBeDefined();
    expect(preschoolGroupsItem?.roles).toContain(USER_ROLES.SUPERADMIN);
    expect(preschoolGroupsItem?.roles).toContain(USER_ROLES.SCHOOLADMIN);
    expect(preschoolGroupsItem?.permissions).toContain('preschool.groups.manage');
    expect(preschoolGroupsItem?.permissionMatch).toBe('any');
  });

  it('has correct roles and permissions for preschool attendance entry', () => {
    let attendanceEntryItem;
    
    for (const group of improvedNavigationConfig) {
      const item = group.items.find((i) => i.id === 'preschool-attendance-entry');
      if (item) {
        attendanceEntryItem = item;
        break;
      }
    }

    expect(attendanceEntryItem).toBeDefined();
    expect(attendanceEntryItem?.roles).toContain(USER_ROLES.SUPERADMIN);
    expect(attendanceEntryItem?.roles).toContain(USER_ROLES.SCHOOLADMIN);
    expect(attendanceEntryItem?.permissions).toContain('preschool.attendance.write');
    expect(attendanceEntryItem?.permissionMatch).toBe('any');
  });

  it('has correct roles and permissions for preschool attendance reports', () => {
    let reportsItem;
    
    for (const group of improvedNavigationConfig) {
      const item = group.items.find((i) => i.id === 'preschool-attendance-reports');
      if (item) {
        reportsItem = item;
        break;
      }
    }

    expect(reportsItem).toBeDefined();
    expect(reportsItem?.roles).toContain(USER_ROLES.SUPERADMIN);
    expect(reportsItem?.roles).toContain(USER_ROLES.REGIONADMIN);
    expect(reportsItem?.roles).toContain(USER_ROLES.REGIONOPERATOR);
    expect(reportsItem?.roles).toContain(USER_ROLES.SEKTORADMIN);
    expect(reportsItem?.permissions).toContain('preschool.attendance.reports');
    expect(reportsItem?.permissionMatch).toBe('any');
  });
});
