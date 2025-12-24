import { describe, it, expect } from 'vitest';

import { buildModuleAccess } from '@/utils/permissions/moduleAccess';

const createUser = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 1,
    role: 'superadmin',
    ...overrides,
  }) as any;

const defaultAccess = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canPublish: false,
  canManage: false,
  canShare: false,
  hasAccess: false,
};

describe('buildModuleAccess', () => {
  it('returns default access map when user is missing', () => {
    const result = buildModuleAccess(null, 'reports');
    expect(result).toStrictEqual(defaultAccess);
  });

  it('grants role-based access for admin roles', () => {
    const result = buildModuleAccess(createUser({ role: 'regionadmin' }), 'reports');

    expect(result.canView).toBe(true);
    expect(result.hasAccess).toBe(true);
    expect(result.canCreate).toBe(false);
  });

  it('falls back to fine-grained permissions when role is insufficient', () => {
    const teacher = createUser({ role: 'teacher' });
    const result = buildModuleAccess(teacher, 'reports', perm => perm === 'reports.read');

    expect(result.canView).toBe(true);
    expect(result.hasAccess).toBe(true);
  });

  it('respects region-operator flags for module actions', () => {
    const regionOperator = createUser({
      role: 'regionoperator',
      region_operator_permissions: { can_view_links: true },
    });

    const viewOnly = buildModuleAccess(regionOperator, 'links');
    expect(viewOnly.canView).toBe(true);
    expect(viewOnly.canCreate).toBe(false);
    expect(viewOnly.hasAccess).toBe(true);

    const withCreateFlag = buildModuleAccess(
      createUser({
        role: 'regionoperator',
        region_operator_permissions: {
          can_view_links: true,
          can_create_links: true,
        },
      }),
      'links'
    );

    expect(withCreateFlag.canCreate).toBe(true);
  });
});
