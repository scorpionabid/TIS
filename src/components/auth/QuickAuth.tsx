import React, { useEffect } from 'react';
import { apiClient } from '@/services/api';

export const QuickAuth: React.FC = () => {
  useEffect(() => {
    // Always use our test token to ensure consistency
    const testToken = '74|oEOCwKfOQzNdRXyzVf45i6xACOrmdfh5udYUdEBjae15fe61';
    
    // Check if we already set the token to avoid loops
    const currentToken = localStorage.getItem('auth_token');
    const hasReloaded = sessionStorage.getItem('auth_token_set');
    
    if (currentToken !== testToken || !hasReloaded) {
      // Only clear if we need to change the token
      if (currentToken !== testToken) {
        localStorage.clear();
      }
      
      // Set the token
      localStorage.setItem('auth_token', testToken);
      apiClient.setToken(testToken);
      sessionStorage.setItem('auth_token_set', 'true');
      
      console.log('🔑 Setting authentication token:', testToken);
      console.log('🔑 LocalStorage auth_token:', localStorage.getItem('auth_token'));
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