/**
 * Navigation Debug Logger
 * Uses centralized DebugContext for navigation debugging
 *
 * This file provides logging utilities that work with the debug context
 * but can also be used standalone (falls back to console if context unavailable)
 */

// Type definition for standalone usage
interface NavigationDebugData {
  itemId?: string;
  itemLabel?: string;
  itemPath?: string;
  requiredRoles?: string[];
  userRole?: string;
  roleAllowed?: boolean;
  requiredPermissions?: string[];
  userPermissions?: string[];
  permissionsLength?: number;
  hasAttendanceRead?: boolean;
  required?: string[];
  hasAll?: boolean;
  hasAny?: boolean;
}

class NavigationDebugLogger {
  private isDev = process.env.NODE_ENV === 'development';

  /**
   * Log navigation filter debug info
   */
  logFilter(data: NavigationDebugData): void {
    if (!this.isDev) return;

    // Only log attendance-related items to reduce noise
    if (!data.itemId?.includes('attendance') && !data.itemPath?.includes('attendance')) {
      return;
    }

    console.log('🔍 Navigation Filter Debug:', {
      itemId: data.itemId,
      itemLabel: data.itemLabel,
      itemPath: data.itemPath,
      requiredRoles: data.requiredRoles,
      userRole: data.userRole,
      roleAllowed: data.roleAllowed,
      requiredPermissions: data.requiredPermissions,
      userPermissions: data.userPermissions,
      permissionsLength: data.permissionsLength,
      hasAttendanceRead: data.hasAttendanceRead,
    });
  }

  /**
   * Log permission match result (ALL mode)
   */
  logPermissionMatchAll(data: NavigationDebugData): void {
    if (!this.isDev) return;

    // Only log attendance-related items
    if (!data.itemId?.includes('attendance')) {
      return;
    }

    console.log('🔍 Permission Match (ALL):', {
      itemId: data.itemId,
      required: data.required,
      hasAll: data.hasAll,
    });
  }

  /**
   * Log permission match result (ANY mode)
   */
  logPermissionMatchAny(data: NavigationDebugData): void {
    if (!this.isDev) return;

    // Only log attendance-related items
    if (!data.itemId?.includes('attendance')) {
      return;
    }

    console.log('🔍 Permission Match (ANY):', {
      itemId: data.itemId,
      required: data.required,
      hasAny: data.hasAny,
    });
  }

  /**
   * Log menu generation
   */
  logMenuGeneration(data: {
    userRole: string;
    permissionsCount: number;
    permissions: string[];
    panel?: string;
    hasAttendanceRead?: boolean;
  }): void {
    if (!this.isDev) return;

    console.log('🗺️ Navigation Cache: Getting menu', {
      userRole: data.userRole,
      permissionsCount: data.permissionsCount,
      permissions: data.permissions,
      panel: data.panel,
      hasAttendanceRead: data.hasAttendanceRead,
    });
  }

  /**
   * Log panel-specific menu generation
   */
  logPanelMenu(data: {
    userRole: string;
    panel: string;
    permissionsCount: number;
    permissions: string[];
    hasAttendanceRead?: boolean;
  }): void {
    if (!this.isDev) return;

    console.log('🗺️ Navigation Cache: Getting panel menu', {
      userRole: data.userRole,
      panel: data.panel,
      permissionsCount: data.permissionsCount,
      permissions: data.permissions,
      hasAttendanceRead: data.hasAttendanceRead,
    });
  }
}

// Export singleton instance
export const navDebugLogger = new NavigationDebugLogger();

// Export individual functions for convenience
export const logNavigationFilter = (data: NavigationDebugData) =>
  navDebugLogger.logFilter(data);

export const logPermissionMatchAll = (data: NavigationDebugData) =>
  navDebugLogger.logPermissionMatchAll(data);

export const logPermissionMatchAny = (data: NavigationDebugData) =>
  navDebugLogger.logPermissionMatchAny(data);

export const logMenuGeneration = (data: {
  userRole: string;
  permissionsCount: number;
  permissions: string[];
  panel?: string;
  hasAttendanceRead?: boolean;
}) => navDebugLogger.logMenuGeneration(data);

export const logPanelMenu = (data: {
  userRole: string;
  panel: string;
  permissionsCount: number;
  permissions: string[];
  hasAttendanceRead?: boolean;
}) => navDebugLogger.logPanelMenu(data);
