import React, { useEffect } from 'react';
import { apiClient } from '@/services/api';
import { storageHelpers } from '@/utils/helpers';

export const QuickAuth: React.FC = () => {
  useEffect(() => {
    // Always use our test token to ensure consistency
    const testToken = '74|oEOCwKfOQzNdRXyzVf45i6xACOrmdfh5udYUdEBjae15fe61';
    
    // Check if we already set the token to avoid loops
    const currentToken = apiClient.getToken();
    const hasReloaded = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('auth_token_set') : null;

    if (currentToken !== testToken || !hasReloaded) {
      // Only clear if we need to change the token
      if (currentToken !== testToken) {
        apiClient.clearToken();
        storageHelpers.remove('atis_current_user');
      }

      // Set the token
      apiClient.setToken(testToken);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('auth_token_set', 'true');
      }

      console.log('🔑 Setting authentication token:', testToken);
      console.log('🔑 Stored API token:', storageHelpers.get<string>('atis_auth_token'));
      console.log('🔑 ApiClient token:', apiClient.getToken());
    } else {
      console.log('🔑 ✅ Authentication token already properly set, no action needed');
      // Ensure apiClient has the token even if localStorage is set
      apiClient.setToken(testToken);
    }
  }, []);

  return null; // This component doesn't render anything
};

export default QuickAuth;
