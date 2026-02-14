// Feature Flag System for A/B Testing GenericManagerV2

import { logger } from './logger';

interface FeatureFlags {
  useNewTeacherManager: boolean;
  useNewStudentManager: boolean;
  useNewClassManager: boolean;
  enableBulkActions: boolean;
  enableAdvancedFilters: boolean;
  enableGenericManagerV2: boolean;
}

// Get feature flags from environment variables with fallback to defaults
const getFeatureFlags = (): FeatureFlags => {
  // Default flags for safe rollout
  const defaults: FeatureFlags = {
    useNewTeacherManager: false, // Start disabled for safety
    useNewStudentManager: false,
    useNewClassManager: false,
    enableBulkActions: false,
    enableAdvancedFilters: false,
    enableGenericManagerV2: false,
  };

  // Environment-based overrides
  if (typeof window !== 'undefined') {
    const env = import.meta.env;
    
    return {
      useNewTeacherManager: env.VITE_USE_NEW_TEACHER_MANAGER === 'true',
      useNewStudentManager: env.VITE_USE_NEW_STUDENT_MANAGER === 'true', 
      useNewClassManager: env.VITE_USE_NEW_CLASS_MANAGER === 'true',
      enableBulkActions: env.VITE_ENABLE_BULK_ACTIONS === 'true',
      enableAdvancedFilters: env.VITE_ENABLE_ADVANCED_FILTERS === 'true',
      enableGenericManagerV2: env.VITE_ENABLE_GENERIC_MANAGER_V2 === 'true',
    };
  }

  return defaults;
};

// Feature flag instance
export const featureFlags = getFeatureFlags();

// Hook for reactive feature flag usage
export const useFeatureFlags = () => {
  return featureFlags;
};

// Individual feature flag checks
export const useNewTeacherManager = () => featureFlags.useNewTeacherManager;
export const useNewStudentManager = () => featureFlags.useNewStudentManager;
export const useNewClassManager = () => featureFlags.useNewClassManager;
export const enableBulkActions = () => featureFlags.enableBulkActions;

// Debug information
export const getFeatureFlagDebugInfo = () => {
  logger.log('Feature Flags Status', { component: 'featureFlags', action: 'debugInfo', data: { environment: import.meta.env.MODE, flags: featureFlags, envVars: { MODE: import.meta.env.MODE, VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL } } });
  });
};

// Runtime flag toggling for development/testing (not for production)
export const toggleFeatureFlag = (flagName: keyof FeatureFlags) => {
  if (import.meta.env.MODE === 'development') {
    (featureFlags as any)[flagName] = !(featureFlags as any)[flagName];
    logger.log(`Toggled ${flagName}`, { component: 'featureFlags', action: 'toggleFlag', data: { flagName, newValue: (featureFlags as any)[flagName] } });
    getFeatureFlagDebugInfo();
  } else {
    console.warn('⚠️ Feature flag toggling is disabled in production');
  }
};

// A/B testing utilities
export const isUserInTestGroup = (userId?: number, testName?: string): boolean => {
  if (!userId || !testName) return false;
  
  // Simple hash-based assignment for consistent A/B testing
  const hash = (userId.toString() + testName).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // 50/50 split
  return Math.abs(hash) % 2 === 0;
};

// Export for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).featureFlags = {
    flags: featureFlags,
    toggle: toggleFeatureFlag,
    debug: getFeatureFlagDebugInfo,
    isUserInTestGroup,
  };
}