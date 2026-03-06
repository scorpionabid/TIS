/**
 * Authentication Debugging Utilities
 *
 * Use this to diagnose and fix authentication token issues
 */

export const authDebug = {
  /**
   * Check if auth token exists and is valid format
   */
  checkToken(): { exists: boolean; token: string | null; isValid: boolean } {
    const token = localStorage.getItem('atis_auth_token');
    const exists = token !== null;
    const isValid = exists && token.includes('|'); // Laravel Sanctum tokens have format: ID|TOKEN

    console.log('🔍 Auth Token Debug:');
    console.log('  - Token exists:', exists);
    console.log('  - Token preview:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('  - Is valid format:', isValid);

    return { exists, token, isValid };
  },

  /**
   * Clear the authentication token
   */
  clearToken(): void {
    localStorage.removeItem('atis_auth_token');
    console.log('✅ Auth token cleared. Please log in again.');
  },

  /**
   * Test if the current token works with the API
   */
  async testToken(): Promise<boolean> {
    const token = localStorage.getItem('atis_auth_token');

    if (!token) {
      console.error('❌ No token found');
      return false;
    }

    try {
      const response = await fetch('http://localhost:8000/api/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const user = await response.json();
        console.log('✅ Token is valid. User:', user);
        return true;
      } else {
        console.error('❌ Token is invalid. Status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Token test failed:', error);
      return false;
    }
  },

  /**
   * Full diagnostic check
   */
  async diagnose(): Promise<void> {
    console.log('🔍 Running full authentication diagnostic...\n');

    const tokenCheck = this.checkToken();

    if (!tokenCheck.exists) {
      console.log('❌ PROBLEM: No authentication token found');
      console.log('   SOLUTION: Log in to the application\n');
      return;
    }

    if (!tokenCheck.isValid) {
      console.log('⚠️  WARNING: Token format looks invalid');
      console.log('   Expected format: NUMBER|HASH');
      console.log('   Your token:', tokenCheck.token);
      console.log('   SOLUTION: Clear token and log in again\n');
      return;
    }

    console.log('Testing token with API...');
    const isValid = await this.testToken();

    if (!isValid) {
      console.log('\n❌ PROBLEM: Token exists but is not accepted by the API');
      console.log('   SOLUTION: Run authDebug.clearToken() and log in again\n');
    } else {
      console.log('\n✅ All checks passed! Authentication is working correctly.\n');
    }
  }
};

// Make it available globally for easy debugging
if (typeof window !== 'undefined') {
  (window as any).authDebug = authDebug;
  console.log('💡 Auth debugging tools loaded. Try: window.authDebug.diagnose()');
}
