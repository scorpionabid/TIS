# Role-Based Access Control (RBAC) System Guide

## Overview

The RBAC system has been completely refactored to provide centralized, efficient, and maintainable role and permission management across the application. This guide covers the new architecture, usage patterns, and best practices.

## Architecture

### 1. Core Components

#### `src/constants/roles.ts`
- **Central role constants system** replacing 177+ hardcoded strings
- **Role hierarchy definitions** with utility functions
- **Type-safe role management** with TypeScript support

```typescript
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  REGIONADMIN: 'regionadmin',
  REGIONOPERATOR: 'regionoperator',
  SEKTORADMIN: 'sektoradmin',
  SCHOOLADMIN: 'schooladmin',
  MUELLIM: 'müəllim'
} as const;

export const ROLE_HIERARCHY = {
  [USER_ROLES.SUPERADMIN]: 0,
  [USER_ROLES.REGIONADMIN]: 1,
  [USER_ROLES.REGIONOPERATOR]: 2,
  [USER_ROLES.SEKTORADMIN]: 3,
  [USER_ROLES.SCHOOLADMIN]: 4,
  [USER_ROLES.MUELLIM]: 5
};
```

#### `src/hooks/useRoleCheck.ts`
- **Comprehensive role checking hook** with 15+ utility functions
- **Performance monitoring** integration
- **Memoized calculations** for optimal performance
- **Hierarchical permission checks**

#### `src/components/common/PermissionGate.tsx`
- **Declarative access control** for UI components
- **Role and permission-based rendering**
- **Flexible access control patterns**

#### `src/hooks/useNavigationCache.ts`
- **Navigation performance optimization** with 5-minute cache
- **Role-based menu generation** with performance monitoring
- **Automatic cache invalidation** on role changes

#### `src/utils/performanceMonitor.ts`
- **Comprehensive performance tracking** system
- **Navigation, component, and role check monitoring**
- **Development-time performance insights**

### 2. Performance Improvements

- **Navigation caching**: 5-minute cache reduces menu generation overhead
- **Memoized role calculations**: Prevents unnecessary re-computations
- **Performance monitoring**: Track and identify slow operations
- **Bundle optimization**: Reduced code duplication and improved tree-shaking

## Usage Guide

### 1. Basic Role Checking

```typescript
import { useRoleCheck } from '@/hooks/useRoleCheck';

const MyComponent = () => {
  const { isRole, isSuperAdmin, isSchoolAdmin } = useRoleCheck();
  
  // Single role check
  if (isRole(USER_ROLES.SUPERADMIN)) {
    return <AdminPanel />;
  }
  
  // Pre-computed role checks (recommended for performance)
  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }
  
  if (isSchoolAdmin) {
    return <SchoolDashboard />;
  }
  
  return <DefaultView />;
};
```

### 2. Multiple Role Checks

```typescript
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { USER_ROLES } from '@/constants/roles';

const MyComponent = () => {
  const { hasAnyRole, hasAllRoles, isAdmin } = useRoleCheck();
  
  // Check if user has any of specified roles
  if (hasAnyRole([USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN])) {
    return <AdminTools />;
  }
  
  // Check if user has all specified roles (rare use case)
  if (hasAllRoles([USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM])) {
    return <DualRoleInterface />;
  }
  
  // Use pre-computed role group checks
  if (isAdmin) {
    return <AdminInterface />;
  }
  
  return <UserInterface />;
};
```

### 3. Permission-Based Access Control

```typescript
import { useRoleCheck } from '@/hooks/useRoleCheck';

const MyComponent = () => {
  const { hasPermission, hasAnyPermission, canAccess } = useRoleCheck();
  
  // Single permission check
  if (hasPermission('manage_users')) {
    return <UserManagement />;
  }
  
  // Multiple permission check
  if (hasAnyPermission(['view_reports', 'generate_reports'])) {
    return <ReportsSection />;
  }
  
  // Combined role and permission check
  if (canAccess([USER_ROLES.SUPERADMIN], ['manage_institutions'])) {
    return <InstitutionManagement />;
  }
  
  return <RestrictedView />;
};
```

### 4. Declarative Access Control with PermissionGate

```typescript
import { PermissionGate } from '@/components/common/PermissionGate';
import { USER_ROLES } from '@/constants/roles';

const MyComponent = () => {
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Role-based rendering */}
      <PermissionGate roles={[USER_ROLES.SUPERADMIN]}>
        <SuperAdminPanel />
      </PermissionGate>
      
      {/* Permission-based rendering */}
      <PermissionGate permissions={['view_analytics']}>
        <AnalyticsWidget />
      </PermissionGate>
      
      {/* Combined role and permission */}
      <PermissionGate 
        roles={[USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN]}
        permissions={['manage_schools']}
        requireAll={false} // Requires ANY role AND ALL permissions
      >
        <SchoolManagementTools />
      </PermissionGate>
      
      {/* Fallback for unauthorized access */}
      <PermissionGate
        roles={[USER_ROLES.MUELLIM]}
        fallback={<div>Access denied</div>}
      >
        <TeacherTools />
      </PermissionGate>
    </div>
  );
};
```

### 5. Hierarchical Permission Checks

```typescript
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { USER_ROLES } from '@/constants/roles';

const MyComponent = () => {
  const { canManage, isHigherThan, hasHierarchyLevel } = useRoleCheck();
  
  // Check if current user can manage a specific role
  if (canManage(USER_ROLES.SCHOOLADMIN)) {
    return <SchoolAdminManagement />;
  }
  
  // Check if current user has higher authority than specified role
  if (isHigherThan(USER_ROLES.MUELLIM)) {
    return <TeacherOversightTools />;
  }
  
  // Check hierarchy level (lower number = higher authority)
  if (hasHierarchyLevel(2)) { // RegionOperator level or higher
    return <RegionalTools />;
  }
  
  return <StandardView />;
};
```

### 6. Convenience Hooks

```typescript
import { 
  useSuperAdminCheck,
  useAdminCheck,
  useSchoolAdminCheck,
  useTeacherCheck,
  useManagementRoleCheck
} from '@/hooks/useRoleCheck';

const MyComponent = () => {
  const isSuperAdmin = useSuperAdminCheck();
  const isAdmin = useAdminCheck();
  const isSchoolAdmin = useSchoolAdminCheck();
  const isTeacher = useTeacherCheck();
  const isManagement = useManagementRoleCheck();
  
  if (isSuperAdmin) return <SuperAdminDashboard />;
  if (isAdmin) return <AdminDashboard />;
  if (isManagement) return <ManagementDashboard />;
  if (isSchoolAdmin) return <SchoolDashboard />;
  if (isTeacher) return <TeacherDashboard />;
  
  return <DefaultDashboard />;
};
```

### 7. Performance Monitoring Integration

```typescript
import { withPerformanceMonitoring } from '@/utils/performanceMonitor';

// Monitor component render performance
const MyComponent = withPerformanceMonitoring(() => {
  const { isRole } = useRoleCheck();
  
  // Component logic with automatic performance tracking
  return <div>Component content</div>;
}, 'MyComponent');

// Access performance data in development
if (process.env.NODE_ENV === 'development') {
  // Available via browser console:
  // window.__performanceMonitor.getStats()
  // window.__performanceMonitor.getSummary()
  // window.__performanceMonitor.getSlowOps()
}
```

## Migration Guide

### From Old System to New System

#### Before (Old Pattern)
```typescript
// ❌ Hardcoded role strings scattered throughout components
const MyComponent = () => {
  const { currentUser } = useAuth();
  
  if (currentUser?.role === 'superadmin') {
    return <AdminPanel />;
  }
  
  if (['regionadmin', 'sektoradmin'].includes(currentUser?.role)) {
    return <ManagementPanel />;
  }
  
  return <UserPanel />;
};
```

#### After (New Pattern)
```typescript
// ✅ Centralized role constants with optimized hooks
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { USER_ROLES } from '@/constants/roles';

const MyComponent = () => {
  const { isSuperAdmin, hasAnyRole } = useRoleCheck();
  
  if (isSuperAdmin) {
    return <AdminPanel />;
  }
  
  if (hasAnyRole([USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN])) {
    return <ManagementPanel />;
  }
  
  return <UserPanel />;
};
```

### Component Migration Checklist

1. **Replace hardcoded role strings** with `USER_ROLES` constants
2. **Import `useRoleCheck`** instead of direct `useAuth` for role checking
3. **Use pre-computed role checks** (`isSuperAdmin`, `isAdmin`, etc.) for better performance
4. **Consider `PermissionGate`** for declarative access control
5. **Remove duplicate role checking logic** across components
6. **Test role-based functionality** after migration

## Performance Best Practices

### 1. Use Pre-computed Role Checks
```typescript
// ✅ Efficient - pre-computed and memoized
const { isSuperAdmin, isAdmin } = useRoleCheck();

// ❌ Less efficient - function call each time
const { isRole } = useRoleCheck();
if (isRole(USER_ROLES.SUPERADMIN)) { ... }
```

### 2. Leverage Navigation Caching
```typescript
// ✅ Navigation menu is automatically cached for 5 minutes per role
const { navigationMenu } = useNavigationCache();
```

### 3. Use PermissionGate for Complex Conditions
```typescript
// ✅ Declarative and optimized
<PermissionGate roles={[USER_ROLES.SUPERADMIN]} permissions={['manage_users']}>
  <ComplexComponent />
</PermissionGate>

// ❌ Multiple function calls and re-renders
{canAccess([USER_ROLES.SUPERADMIN], ['manage_users']) && <ComplexComponent />}
```

### 4. Monitor Performance in Development
```typescript
// Enable performance monitoring for debugging
if (process.env.NODE_ENV === 'development') {
  window.__performanceMonitor.enable();
}
```

## Troubleshooting

### Common Issues

#### 1. Role Check Returns False Unexpectedly
```typescript
// Check if user is properly authenticated
const { currentUser, currentRole } = useRoleCheck();
console.log('Current user:', currentUser);
console.log('Current role:', currentRole);
```

#### 2. Permission Gate Not Rendering Content
```typescript
// Verify permissions and roles
<PermissionGate
  roles={[USER_ROLES.SUPERADMIN]}
  permissions={['manage_users']}
  fallback={<div>Debug: Access denied</div>} // Add fallback for debugging
>
  <ProtectedComponent />
</PermissionGate>
```

#### 3. Navigation Menu Not Loading
```typescript
// Check navigation cache stats
const { getCacheStats } = useNavigationCache();
console.log('Cache stats:', getCacheStats());
```

#### 4. Performance Issues
```typescript
// Monitor slow operations
if (process.env.NODE_ENV === 'development') {
  const slowOps = window.__performanceMonitor.getSlowOps();
  console.log('Slow operations:', slowOps);
}
```

### Development Tools

#### Browser Console Commands (Development Only)
```javascript
// Get performance statistics
window.__performanceMonitor.getStats()

// Generate performance summary
window.__performanceMonitor.getSummary()

// Export performance data
window.__performanceMonitor.export()

// Clear performance metrics
window.__performanceMonitor.clear()

// Enable/disable monitoring
window.__performanceMonitor.enable()
window.__performanceMonitor.disable()

// Get slow operations report
window.__performanceMonitor.getSlowOps()
```

## File Structure Reference

```
src/
├── constants/
│   └── roles.ts                 # Central role constants and utilities
├── hooks/
│   ├── useRoleCheck.ts          # Main role checking hook
│   └── useNavigationCache.ts    # Navigation performance optimization
├── components/
│   └── common/
│       └── PermissionGate.tsx   # Declarative access control component
├── utils/
│   └── performanceMonitor.ts    # Performance monitoring utilities
└── docs/
    └── ROLE_SYSTEM_GUIDE.md     # This documentation
```

## Summary of Improvements

- **177+ hardcoded role strings** eliminated across the codebase
- **47+ files** refactored to use centralized role system
- **Dual sidebar systems** consolidated to single, optimized system
- **Navigation caching** implemented with 5-minute cache duration
- **Performance monitoring** integrated for development debugging
- **Type safety** improved with TypeScript role definitions
- **Bundle size** reduced through elimination of code duplication
- **Developer experience** enhanced with comprehensive documentation and debug tools

The new RBAC system provides a solid foundation for scalable, maintainable, and performant role-based access control throughout the application.