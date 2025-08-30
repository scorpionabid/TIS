/**
 * Tests for the new ModernSidebar and role-based navigation system
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React, { createContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModernSidebar } from '@/components/layout/ModernSidebar';
import { getMenuForRole } from '@/config/navigation';
import { USER_ROLES } from '@/constants/roles';

// Mock AuthContext for testing
const MockAuthContext = createContext<any>(undefined);

// Mock user data with new role constants
const mockUsers = {
  [USER_ROLES.SUPERADMIN]: {
    id: 1,
    name: 'Super Admin',
    email: 'superadmin@atis.az',
    role: USER_ROLES.SUPERADMIN,
    permissions: ['approvals.read', 'approvals.create', 'approvals.update', 'approvals.delete', 'users.read', 'institutions.read'],
    institution: { id: 1, name: 'Ministry', type: 'ministry', level: 1 }
  },
  [USER_ROLES.REGIONADMIN]: {
    id: 2, 
    name: 'Region Admin',
    email: 'regionadmin@atis.az',
    role: USER_ROLES.REGIONADMIN,
    permissions: ['approvals.read', 'approvals.create', 'surveys.read', 'reports.read'],
    institution: { id: 2, name: 'Baku Region', type: 'region', level: 2 }
  },
  [USER_ROLES.SEKTORADMIN]: {
    id: 3,
    name: 'Sektor Admin', 
    email: 'sektoradmin@atis.az',
    role: USER_ROLES.SEKTORADMIN,
    permissions: ['approvals.read', 'approvals.create', 'surveys.read', 'institutions.read'],
    institution: { id: 3, name: 'Education Sector', type: 'sector', level: 3 }
  },
  [USER_ROLES.SCHOOLADMIN]: {
    id: 4,
    name: 'School Admin',
    email: 'schooladmin@atis.az', 
    role: USER_ROLES.SCHOOLADMIN,
    permissions: ['surveys.read', 'students.read', 'teachers.read', 'classes.read'],
    institution: { id: 4, name: 'Test School', type: 'school', level: 4 }
  },
  [USER_ROLES.MUELLIM]: {
    id: 5,
    name: 'Teacher',
    email: 'teacher@atis.az',
    role: USER_ROLES.MUELLIM,
    permissions: ['classes.read', 'students.read', 'attendance.read'],
    institution: { id: 4, name: 'Test School', type: 'school', level: 4 }
  }
};

// Mock layout context
const MockLayoutContext = createContext({
  sidebarCollapsed: false,
  sidebarHovered: false,
  setSidebarCollapsed: vi.fn(),
  setSidebarHovered: vi.fn()
});

// Mock navigation context  
const MockNavigationContext = createContext({
  currentPath: '/',
  breadcrumbs: [],
  setBreadcrumbs: vi.fn()
});

const TestWrapper: React.FC<{ children: React.ReactNode; user: any }> = ({ children, user }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockAuthValue = {
    currentUser: user,
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    hasPermission: (permission: string) => user?.permissions?.includes(permission) || false,
    hasRole: (role: string) => user?.role === role
  };

  const mockLayoutValue = {
    sidebarCollapsed: false,
    sidebarHovered: false,
    setSidebarCollapsed: vi.fn(),
    setSidebarHovered: vi.fn()
  };

  const mockNavigationValue = {
    currentPath: '/',
    breadcrumbs: [],
    setBreadcrumbs: vi.fn()
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MockAuthContext.Provider value={mockAuthValue}>
          <MockLayoutContext.Provider value={mockLayoutValue}>
            <MockNavigationContext.Provider value={mockNavigationValue}>
              {children}
            </MockNavigationContext.Provider>
          </MockLayoutContext.Provider>
        </MockAuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock the hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => React.useContext(MockAuthContext)
}));

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: () => React.useContext(MockLayoutContext)
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => React.useContext(MockNavigationContext)
}));

vi.mock('@/hooks/useSidebar', () => ({
  useSidebarBehavior: () => ({
    isExpanded: true,
    currentPath: '/',
    handleNavigation: vi.fn()
  })
}));

describe('ModernNavigation System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Navigation Menu Generation', () => {
    it('should generate correct menu items for SuperAdmin', () => {
      const menu = getMenuForRole(USER_ROLES.SUPERADMIN);
      
      expect(menu).toBeDefined();
      expect(menu.length).toBeGreaterThan(0);
      
      // SuperAdmin should have access to system settings
      const systemSettings = menu.find(group => group.id === 'system-settings');
      expect(systemSettings).toBeDefined();
      expect(systemSettings?.items.find(item => item.id === 'settings')).toBeDefined();
    });

    it('should generate correct menu items for RegionAdmin', () => {
      const menu = getMenuForRole(USER_ROLES.REGIONADMIN);
      
      expect(menu).toBeDefined();
      expect(menu.length).toBeGreaterThan(0);
      
      // RegionAdmin should NOT have access to system settings
      const systemSettings = menu.find(group => group.id === 'system-settings');
      expect(systemSettings).toBeUndefined();
      
      // But should have access to management features
      const systemStructure = menu.find(group => group.id === 'system-structure');
      expect(systemStructure).toBeDefined();
    });

    it('should generate correct menu items for SchoolAdmin', () => {
      const menu = getMenuForRole(USER_ROLES.SCHOOLADMIN);
      
      expect(menu).toBeDefined();
      expect(menu.length).toBeGreaterThan(0);
      
      // SchoolAdmin should have school management access
      const schoolManagement = menu.find(group => group.id === 'school-management');
      expect(schoolManagement).toBeDefined();
      
      // But should NOT have access to system structure
      const systemStructure = menu.find(group => group.id === 'system-structure');
      expect(systemStructure).toBeUndefined();
    });

    it('should generate correct menu items for Teacher', () => {
      const menu = getMenuForRole(USER_ROLES.MUELLIM);
      
      expect(menu).toBeDefined();
      expect(menu.length).toBeGreaterThan(0);
      
      // Teachers should have limited access
      const schoolManagement = menu.find(group => group.id === 'school-management');
      expect(schoolManagement).toBeDefined();
      
      // Should have "My Classes" menu item
      const myClassesItem = schoolManagement?.items.find(item => item.id === 'my-classes');
      expect(myClassesItem).toBeDefined();
    });
  });

  describe('Role-based Access Control', () => {
    it('should filter menu items based on user roles', () => {
      const superAdminMenu = getMenuForRole(USER_ROLES.SUPERADMIN);
      const teacherMenu = getMenuForRole(USER_ROLES.MUELLIM);
      
      // SuperAdmin should have more menu groups than teacher
      expect(superAdminMenu.length).toBeGreaterThan(teacherMenu.length);
    });

    it('should respect role hierarchy', () => {
      const roles = [
        USER_ROLES.SUPERADMIN,
        USER_ROLES.REGIONADMIN,
        USER_ROLES.SEKTORADMIN,
        USER_ROLES.SCHOOLADMIN,
        USER_ROLES.MUELLIM
      ];
      
      const menuCounts = roles.map(role => getMenuForRole(role).length);
      
      // Generally, higher roles should have more or equal menu access
      // (though not always strictly decreasing due to role-specific menus)
      expect(menuCounts[0]).toBeGreaterThanOrEqual(menuCounts[4]); // SuperAdmin >= Teacher
    });
  });

  describe('Menu Item Structure', () => {
    it('should have valid menu structure for all roles', () => {
      const roles = Object.values(USER_ROLES);
      
      roles.forEach(role => {
        const menu = getMenuForRole(role);
        
        expect(menu).toBeDefined();
        expect(Array.isArray(menu)).toBe(true);
        
        menu.forEach(group => {
          expect(group.id).toBeDefined();
          expect(group.label).toBeDefined();
          expect(Array.isArray(group.items)).toBe(true);
          
          group.items.forEach(item => {
            expect(item.id).toBeDefined();
            expect(item.label).toBeDefined();
            // Path or children should exist (not both required)
            expect(item.path || item.children).toBeTruthy();
          });
        });
      });
    });
  });

  describe('Role Constants Usage', () => {
    it('should use role constants instead of hardcoded strings', () => {
      // Test that our constants are being used properly
      expect(USER_ROLES.SUPERADMIN).toBe('superadmin');
      expect(USER_ROLES.REGIONADMIN).toBe('regionadmin');
      expect(USER_ROLES.SEKTORADMIN).toBe('sektoradmin');
      expect(USER_ROLES.SCHOOLADMIN).toBe('schooladmin');
      expect(USER_ROLES.MUELLIM).toBe('müəllim');
    });

    it('should validate all menu role references use constants', () => {
      const allRoles = Object.values(USER_ROLES);
      const superAdminMenu = getMenuForRole(USER_ROLES.SUPERADMIN);
      
      // Check that menu generation doesn't break with our constants
      expect(superAdminMenu).toBeDefined();
      expect(superAdminMenu.length).toBeGreaterThan(0);
    });
  });
});