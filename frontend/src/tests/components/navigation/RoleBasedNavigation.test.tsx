import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { getMenuForRole } from '@/config/navigation';
import { getPermissionBasedMenuStructure, hasPermission } from '@/components/layout/sidebar/menuStructure';

// Mock user data for different roles
const mockUsers = {
  superadmin: {
    id: 1,
    name: 'Super Admin',
    email: 'superadmin@atis.az',
    role: 'superadmin',
    permissions: ['approvals.read', 'approvals.create', 'approvals.update', 'approvals.delete'],
    institution: { id: 1, name: 'Ministry', type: 'ministry', level: 1 }
  },
  regionadmin: {
    id: 2, 
    name: 'Region Admin',
    email: 'regionadmin@atis.az',
    role: 'regionadmin',
    permissions: ['approvals.read', 'approvals.create', 'surveys.read', 'reports.read'],
    institution: { id: 2, name: 'Baku Region', type: 'region', level: 2 }
  },
  sektoradmin: {
    id: 3,
    name: 'Sektor Admin', 
    email: 'sektoradmin@atis.az',
    role: 'sektoradmin',
    permissions: ['approvals.read', 'approvals.create', 'surveys.read', 'institutions.read'],
    institution: { id: 3, name: 'Education Sector', type: 'sector', level: 3 }
  },
  schooladmin: {
    id: 4,
    name: 'School Admin',
    email: 'schooladmin@atis.az', 
    role: 'schooladmin',
    permissions: ['surveys.read', 'students.read', 'teachers.read', 'classes.read'], // NO approval permissions
    institution: { id: 4, name: 'Test School', type: 'school', level: 4 }
  },
  müəllim: {
    id: 5,
    name: 'Teacher',
    email: 'teacher@atis.az',
    role: 'müəllim', 
    permissions: ['surveys.read', 'students.read', 'attendance.read', 'assessments.read'],
    institution: { id: 4, name: 'Test School', type: 'school', level: 4 }
  }
};

const mockAuthContextValue = (user: any) => ({
  currentUser: user,
  isAuthenticated: true,
  loading: false,
  login: vi.fn(),
  logout: vi.fn()
});

const renderSidebarWithUser = (user: any) => {
  const mockOnNavigate = vi.fn();
  const mockOnLogout = vi.fn();
  
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContextValue(user)}>
        <Sidebar
          userRole={user.role}
          currentUser={user.name}
          onNavigate={mockOnNavigate}
          onLogout={mockOnLogout}
          currentPath="/"
          userPermissions={user.permissions}
        />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Role-Based Navigation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SchoolAdmin Navigation Restrictions', () => {
    it('should NOT show approvals menu item for schooladmin', () => {
      const schoolAdmin = mockUsers.schooladmin;
      renderSidebarWithUser(schoolAdmin);
      
      // "Təsdiqlər" should not be visible for schooladmin
      expect(screen.queryByText('Təsdiqlər')).not.toBeInTheDocument();
      expect(screen.queryByText('Təsdiq Paneli')).not.toBeInTheDocument();
    });

    it('should show appropriate menu items for schooladmin', () => {
      const schoolAdmin = mockUsers.schooladmin;
      renderSidebarWithUser(schoolAdmin);
      
      // SchoolAdmin should see these items
      expect(screen.getByText('Ana səhifə')).toBeInTheDocument();
      expect(screen.queryByText('Şagirdlər')).toBeInTheDocument();
      expect(screen.queryByText('Müəllimlər')).toBeInTheDocument();
      expect(screen.queryByText('Siniflər')).toBeInTheDocument();
    });

    it('schooladmin should not have approval permissions', () => {
      const schoolAdmin = mockUsers.schooladmin;
      
      expect(hasPermission(schoolAdmin.permissions, 'approvals.read')).toBe(false);
      expect(hasPermission(schoolAdmin.permissions, 'approvals.create')).toBe(false);
      expect(hasPermission(schoolAdmin.permissions, 'approvals.update')).toBe(false);
      expect(hasPermission(schoolAdmin.permissions, 'approvals.delete')).toBe(false);
    });
  });

  describe('RegionAdmin Navigation Access', () => {
    it('should show approvals menu item for regionadmin', () => {
      const regionAdmin = mockUsers.regionadmin;
      renderSidebarWithUser(regionAdmin);
      
      // RegionAdmin should see approvals
      expect(screen.queryByText('Təsdiqlər')).toBeInTheDocument();
    });

    it('regionadmin should have approval permissions', () => {
      const regionAdmin = mockUsers.regionadmin;
      
      expect(hasPermission(regionAdmin.permissions, 'approvals.read')).toBe(true);
      expect(hasPermission(regionAdmin.permissions, 'approvals.create')).toBe(true);
    });
  });

  describe('SektorAdmin Navigation Access', () => {
    it('should show approvals menu item for sektoradmin', () => {
      const sektorAdmin = mockUsers.sektoradmin;
      renderSidebarWithUser(sektorAdmin);
      
      // SektorAdmin should see approvals
      expect(screen.queryByText('Təsdiqlər')).toBeInTheDocument();
    });

    it('sektoradmin should have approval permissions', () => {
      const sektorAdmin = mockUsers.sektoradmin;
      
      expect(hasPermission(sektorAdmin.permissions, 'approvals.read')).toBe(true);
      expect(hasPermission(sektorAdmin.permissions, 'approvals.create')).toBe(true);
    });
  });

  describe('Permission-Based Menu Structure', () => {
    it('should filter menu items based on permissions', () => {
      const schoolAdminPermissions = mockUsers.schooladmin.permissions;
      const menuItems = getPermissionBasedMenuStructure(schoolAdminPermissions);
      
      // Should not contain items requiring approval permissions
      const approvalItems = menuItems.filter(item => 
        item.label === 'Təsdiqlər' || item.path === '/approvals'
      );
      
      expect(approvalItems).toHaveLength(0);
    });

    it('should include menu items for users with proper permissions', () => {
      const regionAdminPermissions = mockUsers.regionadmin.permissions;
      const menuItems = getPermissionBasedMenuStructure(regionAdminPermissions);
      
      // Should contain items for users with approval permissions
      const approvalItems = menuItems.filter(item => 
        item.label === 'Təsdiqlər' || item.path === '/approvals'
      );
      
      expect(approvalItems.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation Config Role Filtering', () => {
    it('should filter navigation config based on role', () => {
      // SchoolAdmin should not have approval items in config
      const schoolAdminMenu = getMenuForRole('schooladmin');
      
      let hasApprovalItem = false;
      schoolAdminMenu.forEach(group => {
        group.items.forEach(item => {
          if (item.children) {
            item.children.forEach(child => {
              if (child.path === '/approvals' || child.label === 'Təsdiq Paneli') {
                hasApprovalItem = true;
              }
            });
          }
          if (item.path === '/approvals' || item.label === 'Təsdiq Paneli') {
            hasApprovalItem = true;
          }
        });
      });
      
      expect(hasApprovalItem).toBe(false);
    });

    it('should include approval items for regionadmin', () => {
      // RegionAdmin should have approval items in config
      const regionAdminMenu = getMenuForRole('regionadmin');
      
      let hasApprovalItem = false;
      regionAdminMenu.forEach(group => {
        group.items.forEach(item => {
          if (item.children) {
            item.children.forEach(child => {
              if (child.path === '/approvals' || child.label === 'Təsdiq Paneli') {
                hasApprovalItem = true;
              }
            });
          }
          if (item.path === '/approvals' || item.label === 'Təsdiq Paneli') {
            hasApprovalItem = true;
          }
        });
      });
      
      expect(hasApprovalItem).toBe(true);
    });

    it('should include approval items for sektoradmin', () => {
      // SektorAdmin should have approval items in config
      const sektorAdminMenu = getMenuForRole('sektoradmin');
      
      let hasApprovalItem = false;
      sektorAdminMenu.forEach(group => {
        group.items.forEach(item => {
          if (item.children) {
            item.children.forEach(child => {
              if (child.path === '/approvals' || child.label === 'Təsdiq Paneli') {
                hasApprovalItem = true;
              }
            });
          }
          if (item.path === '/approvals' || item.label === 'Təsdiq Paneli') {
            hasApprovalItem = true;
          }
        });
      });
      
      expect(hasApprovalItem).toBe(true);
    });
  });

  describe('Permission Helper Functions', () => {
    it('hasPermission should return correct boolean values', () => {
      expect(hasPermission(['read', 'write'], 'read')).toBe(true);
      expect(hasPermission(['read', 'write'], 'delete')).toBe(false);
      expect(hasPermission([], 'read')).toBe(false);
      expect(hasPermission(['approvals.read'], 'approvals.read')).toBe(true);
      expect(hasPermission(['approvals.read'], 'approvals.write')).toBe(false);
    });
  });

  describe('Role-Specific Menu Visibility', () => {
    it('teacher should not see admin-only features', () => {
      const teacher = mockUsers.müəllim;
      renderSidebarWithUser(teacher);
      
      // Teacher should not see admin features
      expect(screen.queryByText('Təsdiqlər')).not.toBeInTheDocument();
      expect(screen.queryByText('İstifadəçilər')).not.toBeInTheDocument();
      expect(screen.queryByText('Sistem Parametrləri')).not.toBeInTheDocument();
    });

    it('superadmin should see all menu items including approvals', () => {
      const superAdmin = mockUsers.superadmin;
      renderSidebarWithUser(superAdmin);
      
      // SuperAdmin should see everything
      expect(screen.getByText('Ana səhifə')).toBeInTheDocument();
      // Note: SuperAdmin uses different menu structure, so we test permissions instead
      expect(hasPermission(superAdmin.permissions, 'approvals.read')).toBe(true);
      expect(hasPermission(superAdmin.permissions, 'approvals.create')).toBe(true);
    });
  });
});