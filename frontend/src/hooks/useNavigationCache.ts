/**
 * Navigation Cache Hook
 * 
 * This hook provides caching functionality for navigation menus to improve performance.
 * It caches menu structures based on user roles and invalidates when roles change.
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMenuForRole, getMenuForRoleAndPanel, MenuGroup } from '@/config/navigation';
import { UserRole } from '@/constants/roles';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { SidebarPanel } from '@/types/sidebar';

interface NavigationCache {
  [key: string]: {
    data: MenuGroup[];
    timestamp: number;
    userRole: UserRole;
    permissions: string[];
    panel: string;
  };
}

// Global cache storage
const navigationCache: NavigationCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface UseNavigationOptions {
  panel?: SidebarPanel | 'all';
}

const PANEL_DEFAULT = 'all';

export const resetNavigationCache = () => {
  Object.keys(navigationCache).forEach(key => {
    delete navigationCache[key];
  });
  console.log('🗑️ Navigation: Global cache reset');
};

export const useNavigationCache = (options: UseNavigationOptions = {}) => {
  const { currentUser } = useAuth();
  const panelKey = options.panel ?? PANEL_DEFAULT;

  /**
   * Generate cache key based on user role and permissions
   */
  const getCacheKey = useCallback((role: UserRole, permissions: string[], panel: string) => {
    const permissionHash = permissions.sort().join(',');
    return `${role}:${permissionHash}:${panel}`;
  }, []);

  /**
   * Check if cache entry is valid
   */
  const isCacheValid = useCallback((cacheEntry: NavigationCache[string]) => {
    const now = Date.now();
    const isExpired = now - cacheEntry.timestamp > CACHE_DURATION;
    return !isExpired;
  }, []);

  /**
   * Get cached navigation menu or generate new one
   */
  const getCachedNavigation = useCallback((): MenuGroup[] => {
    if (!currentUser) return [];

    // DEBUG: Log user context for navigation generation (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🗺️ Navigation Cache: Getting menu', {
        userRole: currentUser.role,
        permissionsCount: currentUser.permissions?.length || 0,
        permissions: currentUser.permissions,
        panel: panelKey,
        hasAttendanceRead: currentUser.permissions?.includes('attendance.read'),
      });
    }

    const startTime = performance.now();
    const cacheKey = getCacheKey(currentUser.role, currentUser.permissions, panelKey);
    const cachedEntry = navigationCache[cacheKey];
    let cacheHit = false;

    let menuData: MenuGroup[];

    // Return cached data if valid
    if (cachedEntry && isCacheValid(cachedEntry)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 Navigation: Using cached menu for', currentUser.role, {
          cacheAge: Math.round((Date.now() - cachedEntry.timestamp) / 1000) + 's',
          cachedPermissionsCount: cachedEntry.permissions.length,
        });
      }
      menuData = cachedEntry.data;
      cacheHit = true;
    } else {
      // Generate new menu structure
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Navigation: Generating new menu for', currentUser.role, {
          permissionsCount: currentUser.permissions.length,
          panel: panelKey,
        });
      }
      if (panelKey === PANEL_DEFAULT) {
        menuData = getMenuForRole(currentUser.role, currentUser.permissions);
      } else {
        menuData = getMenuForRoleAndPanel(
          currentUser.role,
          panelKey as SidebarPanel,
          currentUser.permissions
        );
      }

      // Cache the result
      navigationCache[cacheKey] = {
        data: menuData,
        timestamp: Date.now(),
        userRole: currentUser.role,
        permissions: [...currentUser.permissions],
        panel: panelKey
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Navigation: Menu generated', {
          groupsCount: menuData.length,
          totalItems: menuData.reduce((sum, g) => sum + g.items.length, 0),
        });
      }
    }

    // Record performance metric
    const endTime = performance.now();
    const duration = endTime - startTime;
    const totalItems = menuData.reduce((total, group) => {
      const countItems = (items: any[]): number => {
        return items.reduce((count, item) => {
          return count + 1 + (item.children ? countItems(item.children) : 0);
        }, 0);
      };
      return total + countItems(group.items);
    }, 0);

    performanceMonitor.recordNavigation({
      name: 'navigation-menu-generation',
      duration,
      menuGroups: menuData.length,
      totalItems,
      cacheHit,
      userRole: currentUser.role,
      metadata: {
        cacheKey,
        permissionsCount: currentUser.permissions.length,
        panel: panelKey
      }
    });

    return menuData;
  }, [currentUser, getCacheKey, isCacheValid, panelKey]);

  /**
   * Clear cache (useful for role changes or logout)
   */
  const clearNavigationCache = useCallback(() => {
    Object.keys(navigationCache).forEach(key => {
      delete navigationCache[key];
    });
    console.log('🗑️ Navigation: Cache cleared');
  }, []);

  /**
   * Clear expired cache entries
   */
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    let cleanedCount = 0;

    Object.keys(navigationCache).forEach(key => {
      const entry = navigationCache[key];
      if (now - entry.timestamp > CACHE_DURATION) {
        delete navigationCache[key];
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 Navigation: Cleaned ${cleanedCount} expired cache entries`);
    }
  }, []);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    const entries = Object.keys(navigationCache);
    const validEntries = entries.filter(key => isCacheValid(navigationCache[key]));

    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      expiredEntries: entries.length - validEntries.length,
      cacheKeys: entries,
      currentUserCacheKey: currentUser ? getCacheKey(currentUser.role, currentUser.permissions, panelKey) : null
    };
  }, [currentUser, getCacheKey, isCacheValid, panelKey]);

  // Memoized navigation data
  const navigationMenu = useMemo(() => {
    return getCachedNavigation();
  }, [getCachedNavigation]);

  // Clean expired entries periodically
  useMemo(() => {
    cleanExpiredCache();
  }, [cleanExpiredCache]);

  return {
    navigationMenu,
    clearNavigationCache,
    cleanExpiredCache,
    getCacheStats,
    isCacheEnabled: true,
    cacheKey: currentUser ? getCacheKey(currentUser.role, currentUser.permissions, panelKey) : null
  };
};

/**
 * Hook for navigation performance monitoring
 */
export const useNavigationPerformance = () => {
  const startTime = useMemo(() => performance.now(), []);

  const measureMenuGeneration = useCallback((menuData: MenuGroup[]) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const stats = {
      duration: Math.round(duration * 100) / 100,
      menuGroups: menuData.length,
      totalMenuItems: menuData.reduce((total, group) => {
        const countItems = (items: any[]): number => {
          return items.reduce((count, item) => {
            return count + 1 + (item.children ? countItems(item.children) : 0);
          }, 0);
        };
        return total + countItems(group.items);
      }, 0),
      timestamp: new Date().toISOString()
    };

    if (duration > 10) { // Log if generation takes more than 10ms
      console.log('⚠️ Navigation: Slow menu generation detected', stats);
    }

    return stats;
  }, [startTime]);

  return {
    measureMenuGeneration,
    startTime
  };
};

export default useNavigationCache;
