/**
 * Navigation Cache Hook
 * 
 * This hook provides caching functionality for navigation menus to improve performance.
 * It caches menu structures based on user roles and invalidates when roles change.
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMenuForRole, MenuGroup } from '@/config/navigation';
import { UserRole } from '@/constants/roles';
import { performanceMonitor } from '@/utils/performanceMonitor';

interface NavigationCache {
  [key: string]: {
    data: MenuGroup[];
    timestamp: number;
    userRole: UserRole;
    permissions: string[];
  };
}

// Global cache storage
const navigationCache: NavigationCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useNavigationCache = () => {
  const { currentUser } = useAuth();

  /**
   * Generate cache key based on user role and permissions
   */
  const getCacheKey = useCallback((role: UserRole, permissions: string[]) => {
    const permissionHash = permissions.sort().join(',');
    return `${role}:${permissionHash}`;
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

    const startTime = performance.now();
    const cacheKey = getCacheKey(currentUser.role, currentUser.permissions);
    const cachedEntry = navigationCache[cacheKey];
    let cacheHit = false;

    let menuData: MenuGroup[];

    // Return cached data if valid
    if (cachedEntry && isCacheValid(cachedEntry)) {
      console.log('🚀 Navigation: Using cached menu for', currentUser.role);
      menuData = cachedEntry.data;
      cacheHit = true;
    } else {
      // Generate new menu structure
      console.log('📊 Navigation: Generating new menu for', currentUser.role);
      menuData = getMenuForRole(currentUser.role);

      // Cache the result
      navigationCache[cacheKey] = {
        data: menuData,
        timestamp: Date.now(),
        userRole: currentUser.role,
        permissions: [...currentUser.permissions]
      };
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
        permissionsCount: currentUser.permissions.length
      }
    });

    return menuData;
  }, [currentUser, getCacheKey, isCacheValid]);

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
      currentUserCacheKey: currentUser ? getCacheKey(currentUser.role, currentUser.permissions) : null
    };
  }, [currentUser, getCacheKey, isCacheValid]);

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
    cacheKey: currentUser ? getCacheKey(currentUser.role, currentUser.permissions) : null
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