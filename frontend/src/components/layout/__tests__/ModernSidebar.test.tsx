import { describe, it, expect } from 'vitest';
import { applyInstitutionTypeFilter } from '../ModernSidebar';
import { MenuGroup } from '@/config/navigation';

describe('applyInstitutionTypeFilter', () => {
  const mockMenuGroups: MenuGroup[] = [
    {
      id: 'general',
      label: 'General',
      items: [
        { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: '' as any, roles: [] }
      ]
    },
    {
      id: 'preschool',
      label: 'Preschool',
      items: [
        { id: 'preschool-groups', label: 'Preschool Groups', path: '/preschool-groups', icon: '' as any, roles: [] },
        { id: 'preschool-attendance-entry', label: 'Preschool Attendance', path: '/preschool-attendance', icon: '' as any, roles: [] }
      ]
    }
  ];

  it('hides preschool items for regular schools', () => {
    const result = applyInstitutionTypeFilter(mockMenuGroups, 'school');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('general');
    expect(result[0].items[0].id).toBe('dashboard');
    
    // Ensure preschool groups are not present
    const hasPreschoolItems = result.some(group => 
      group.items.some(item => item.id === 'preschool-groups' || item.id === 'preschool-attendance-entry')
    );
    expect(hasPreschoolItems).toBe(false);
  });

  it('shows preschool items for kindergartens', () => {
    const result = applyInstitutionTypeFilter(mockMenuGroups, 'kindergarten');

    expect(result).toHaveLength(2);
    
    const preschoolGroup = result.find(g => g.id === 'preschool');
    expect(preschoolGroup).toBeDefined();
    expect(preschoolGroup?.items.some(i => i.id === 'preschool-groups')).toBe(true);
    expect(preschoolGroup?.items.some(i => i.id === 'preschool-attendance-entry')).toBe(true);
  });

  it('shows preschool items for preschool_centers', () => {
    const result = applyInstitutionTypeFilter(mockMenuGroups, 'preschool_center');
    const preschoolGroup = result.find(g => g.id === 'preschool');
    expect(preschoolGroup).toBeDefined();
  });

  it('shows preschool items for nurseries', () => {
    const result = applyInstitutionTypeFilter(mockMenuGroups, 'nursery');
    const preschoolGroup = result.find(g => g.id === 'preschool');
    expect(preschoolGroup).toBeDefined();
  });

  it('hides preschool items when institution type is undefined', () => {
    const result = applyInstitutionTypeFilter(mockMenuGroups, undefined);
    const hasPreschoolItems = result.some(group => 
      group.items.some(item => item.id === 'preschool-groups')
    );
    expect(hasPreschoolItems).toBe(false);
  });
});
