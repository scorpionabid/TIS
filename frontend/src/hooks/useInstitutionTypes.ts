import { useQuery } from '@tanstack/react-query';
import { institutionService, InstitutionType } from '@/services/institutions';
import { getFallbackTypesForRole } from '@/utils/institutionUtils';
import { logger } from '@/utils/logger';

interface UseInstitutionTypesOptions {
  userRole?: string;
  enabled?: boolean;
}

/**
 * Normalize different API response formats for institution types
 */
const normalizeInstitutionTypesResponse = (response: any): InstitutionType[] => {
  if (Array.isArray(response)) {
    return response;
  }
  
  if (response?.data && Array.isArray(response.data)) {
    return response.data;
  }
  
  if (response?.institution_types && Array.isArray(response.institution_types)) {
    return response.institution_types;
  }
  
  logger.warn('Unexpected institution types response format', null, {
    component: 'useInstitutionTypes',
    data: { responseStructure: typeof response, hasData: !!response?.data }
  });
  
  return [];
};

/**
 * Simplified custom hook for loading institution types with role-based fallback
 * Handles multiple response formats gracefully
 */
export const useInstitutionTypes = ({ userRole, enabled = true }: UseInstitutionTypesOptions = {}) => {
  return useQuery<{ success: boolean; institution_types: InstitutionType[] }>({
    queryKey: ['institution-types', userRole],
    queryFn: async () => {
      const effectiveRole = userRole || 'superadmin';
      const fallbackTypes = getFallbackTypesForRole(effectiveRole);
      
      logger.debug('Loading institution types', {
        component: 'useInstitutionTypes',
        data: { userRole: effectiveRole, fallbackCount: fallbackTypes.length }
      });
      
      // For superadmin, try API first, then fallback
      if (effectiveRole === 'superadmin') {
        try {
          const apiResponse = await institutionService.getInstitutionTypes();
          const normalizedTypes = normalizeInstitutionTypesResponse(apiResponse);
          
          if (normalizedTypes.length > 0) {
            logger.info('Institution types loaded from API', {
              component: 'useInstitutionTypes',
              data: { count: normalizedTypes.length }
            });
            return { success: true, institution_types: normalizedTypes };
          } else {
            logger.warn('API returned empty types, using fallback', null, {
              component: 'useInstitutionTypes'
            });
            return { success: true, institution_types: fallbackTypes };
          }
        } catch (error) {
          logger.error('Failed to load institution types from API', error, {
            component: 'useInstitutionTypes',
            action: 'api-fallback'
          });
          return { success: true, institution_types: fallbackTypes };
        }
      }
      
      // For non-superadmin users, always use fallback types
      return { success: true, institution_types: fallbackTypes };
    },
    enabled: enabled,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    retry: 1, // Only retry once on failure
  });
};

/**
 * Simplified hook for components that just need the types array
 */
export const useInstitutionTypesSimple = (userRole?: string) => {
  const query = useInstitutionTypes({ userRole });
  
  return {
    institutionTypes: query.data?.institution_types || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};