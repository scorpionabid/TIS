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
      
      // Try to get fallback types first for all roles
      const fallbackTypes = getFallbackTypesForRole(userRole);
      console.log('📋 Fallback types for role:', { userRole, fallbackTypesCount: fallbackTypes.length });
      
      // If superadmin, try API first, otherwise use fallback
      if (userRole === 'superadmin') {
        try {
          console.log('🔗 Attempting API call for superadmin...');
          const apiResponse = await institutionService.getInstitutionTypes();
          console.log('✅ API response received:', apiResponse);
          
          // Ensure proper response format
          if (apiResponse?.institution_types || apiResponse?.data?.institution_types || Array.isArray(apiResponse?.data) || Array.isArray(apiResponse)) {
            return apiResponse as { success: boolean; institution_types: InstitutionType[] };
          } else {
            console.warn('🔄 API response format unexpected, using fallback types');
            return { success: true, institution_types: fallbackTypes };
          }
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
    enabled: !!userRole && enabled,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
};