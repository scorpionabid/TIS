/**
 * Debug Helper Functions
 * Only available in development mode
 * Access via window.debugATIS in browser console
 */

import { apiClient } from '@/services/api';

export const debugHelpers = {
  /**
   * Get current user from localStorage
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('atis_current_user');
    if (!userStr) {
      console.log('❌ No user found in localStorage');
      return null;
    }
    try {
      const user = JSON.parse(userStr);
      console.log('✅ Current User:', user);
      console.log('📊 Permissions:', user.permissions);
      console.log('🔐 Role:', user.role);
      return user;
    } catch (e) {
      console.error('❌ Failed to parse user:', e);
      return null;
    }
  },

  /**
   * Get auth token
   */
  getToken: () => {
    const token = apiClient.getToken();
    if (token) {
      console.log('✅ Token found (length):', token.length);
      console.log('🔑 Token preview:', token.substring(0, 20) + '...');
    } else {
      console.log('❌ No token found');
    }
    return token;
  },

  /**
   * Check user permissions
   */
  checkPermissions: (...permissions: string[]) => {
    const user = debugHelpers.getCurrentUser();
    if (!user || !user.permissions) {
      console.log('❌ No user or permissions found');
      return false;
    }

    const results: Record<string, boolean> = {};
    permissions.forEach(perm => {
      results[perm] = user.permissions.includes(perm);
    });

    console.table(results);
    return results;
  },

  /**
   * Test attendance permissions
   */
  checkAttendancePermissions: () => {
    return debugHelpers.checkPermissions(
      'attendance.read',
      'attendance.create',
      'attendance.update',
      'attendance.manage'
    );
  },

  /**
   * Clear all auth data and reload
   */
  clearAuthAndReload: () => {
    console.log('🧹 Clearing auth data...');
    localStorage.removeItem('atis_current_user');
    localStorage.removeItem('atis_auth_token');
    localStorage.removeItem('atis_session_meta');
    console.log('✅ Auth data cleared, reloading...');
    setTimeout(() => window.location.reload(), 500);
  },

  /**
   * Test API call to /me endpoint
   */
  testMeEndpoint: async () => {
    try {
      console.log('📡 Calling /api/me...');
      const response = await apiClient.get('/me');
      console.log('✅ /me response:', response.data);
      const user = response.data.user;
      console.log('📊 User permissions:', user.permissions);
      console.log('🔐 Has attendance.read?', user.permissions?.includes('attendance.read'));
      return user;
    } catch (error) {
      console.error('❌ /me endpoint failed:', error);
      return null;
    }
  },

  /**
   * Get all localStorage keys related to ATIS
   */
  inspectStorage: () => {
    const keys = Object.keys(localStorage).filter(key => key.includes('atis'));
    console.log('🔍 ATIS localStorage keys:', keys);

    const storage: Record<string, any> = {};
    keys.forEach(key => {
      try {
        storage[key] = JSON.parse(localStorage.getItem(key) || '');
      } catch {
        storage[key] = localStorage.getItem(key);
      }
    });

    console.log('📦 ATIS Storage Contents:', storage);
    return storage;
  },

  /**
   * Force refresh user from API
   */
  forceRefreshUser: async () => {
    console.log('🔄 Force refreshing user from API...');
    const user = await debugHelpers.testMeEndpoint();
    if (user) {
      localStorage.setItem('atis_current_user', JSON.stringify({
        ...user,
        cacheTimestamp: Date.now()
      }));
      console.log('✅ User refreshed and cached');
      console.log('🔄 Reloading page...');
      setTimeout(() => window.location.reload(), 500);
    }
    return user;
  },

  /**
   * Show help
   */
  help: () => {
    console.log(`
🔧 ATIS Debug Helper Functions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Available functions (use debugATIS.functionName()):

📊 User & Auth:
  • getCurrentUser()           - Show current user from localStorage
  • getToken()                 - Show auth token
  • testMeEndpoint()          - Test API /me call
  • forceRefreshUser()        - Refresh user from API and reload

🔐 Permissions:
  • checkPermissions(...perms) - Check specific permissions
  • checkAttendancePermissions() - Check all attendance permissions

💾 Storage:
  • inspectStorage()          - Show all ATIS localStorage data
  • clearAuthAndReload()      - Clear auth and reload page

❓ Help:
  • help()                    - Show this help message

Example usage:
  debugATIS.checkAttendancePermissions()
  debugATIS.forceRefreshUser()
    `);
  }
};

// Expose to window in development
if (process.env.NODE_ENV === 'development') {
  (window as any).debugATIS = debugHelpers;
  console.log('🔧 Debug helpers loaded! Type "debugATIS.help()" for available functions');
}
