import { useQuery } from '@tanstack/react-query';
import { institutionService, InstitutionType } from '@/services/institutions';
import { getFallbackTypesForRole } from '@/utils/institutionUtils';

interface UseInstitutionTypesOptions {
  userRole?: string;
  enabled?: boolean;
}

/**
 * Custom hook for loading institution types with role-based fallback
 * Avoids API calls for non-superadmin users
 */
export const useInstitutionTypes = ({ userRole, enabled = true }: UseInstitutionTypesOptions) => {
  return useQuery<{ success: boolean; institution_types: InstitutionType[] }>({
    queryKey: ['institution-types', userRole],
    queryFn: async () => {
      console.log('🚀 useInstitutionTypes hook called:', { userRole, enabled });
      
      // Get fallback types - use 'superadmin' as default if userRole is undefined
      const effectiveRole = userRole || 'superadmin';
      const fallbackTypes = getFallbackTypesForRole(effectiveRole);
      console.log('📋 Fallback types for role:', { userRole, effectiveRole, fallbackTypesCount: fallbackTypes.length });
      
      // If superadmin or role undefined, try API first, otherwise use fallback
      if (effectiveRole === 'superadmin') {
        try {
          console.log('🔗 Attempting API call for superadmin...');
          const apiResponse = await institutionService.getInstitutionTypes();
          console.log('✅ API response received:', apiResponse);
          
          // Handle different API response formats
          let institution_types: InstitutionType[] = [];
          
          if (Array.isArray(apiResponse)) {
            // Direct array response
            institution_types = apiResponse;
          } else if (apiResponse?.data && Array.isArray(apiResponse.data)) {
            // Data property contains array (most common case)
            institution_types = apiResponse.data;
          } else {
            console.warn('🔄 API response format unexpected, using fallback types');
            console.warn('Response structure:', apiResponse);
            institution_types = fallbackTypes;
          }
          
          console.log('📋 Processed institution types:', institution_types.length, 'types');
          return { success: true, institution_types };
        } catch (error) {
          console.warn('❌ Failed to load institution types from API, using fallback:', error);
          return { success: true, institution_types: fallbackTypes };
        }
      } else {
        // For non-superadmin users, always return fallback types
        console.log('👤 Non-superadmin user, returning fallback types');
        return { success: true, institution_types: fallbackTypes };
      }
    },
    enabled: enabled, // Always enabled when requested, don't depend on userRole
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
};