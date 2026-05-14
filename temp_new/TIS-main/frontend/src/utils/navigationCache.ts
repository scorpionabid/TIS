import { MenuGroup } from '@/config/navigation';
import { UserRole } from '@/constants/roles';

interface NavigationCacheEntry {
    data: MenuGroup[];
    timestamp: number;
    userRole: UserRole;
    permissions: string[];
    panel: string;
}

interface NavigationCache {
    [key: string]: NavigationCacheEntry;
}

// Global cache storage
export const navigationCache: NavigationCache = {};

/**
 * Clear navigation cache
 */
export const resetNavigationCache = () => {
    Object.keys(navigationCache).forEach(key => {
        delete navigationCache[key];
    });
    console.log('🗑️ Navigation: Global cache reset');
};
