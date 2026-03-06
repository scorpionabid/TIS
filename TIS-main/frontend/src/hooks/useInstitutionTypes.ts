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
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 Normalizing API response:', {
      response,
      responseType: typeof response,
      isArray: Array.isArray(response),
      hasData: !!response?.data,
      hasInstitutionTypes: !!response?.institution_types
    });
  }

  if (Array.isArray(response)) {
    console.log('✅ Response is direct array');
    return response;
  }

  if (response?.data && Array.isArray(response.data)) {
    console.log('✅ Response has data array');
    return response.data;
  }

  if (response?.institution_types && Array.isArray(response.institution_types)) {
    console.log('✅ Response has institution_types array');
    return response.institution_types;
  }

  logger.warn('Unexpected institution types response format', null, {
    component: 'useInstitutionTypes',
    data: { responseStructure: typeof response, hasData: !!response?.data }
  });

  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Could not normalize response:', {
      response,
      keys: response ? Object.keys(response) : 'no keys'
    });
  }

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

      // Debug logging for development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 useInstitutionTypes Debug:', {
          userRole,
          effectiveRole,
          fallbackTypesCount: fallbackTypes.length,
          fallbackTypes: fallbackTypes.map(t => ({ key: t.key, level: t.default_level, label: t.label_az })),
          hasMinistryInFallback: fallbackTypes.some(t => t.key === 'ministry')
        });
      }

      logger.debug('Loading institution types', {
        component: 'useInstitutionTypes',
        data: { userRole: effectiveRole, fallbackCount: fallbackTypes.length }
      });

      // For superadmin, try API first, then fallback
      if (effectiveRole === 'superadmin') {
        try {
          console.log('🌐 Calling API for institution types...');
          const apiResponse = await institutionService.getInstitutionTypes();
          const normalizedTypes = normalizeInstitutionTypesResponse(apiResponse);

          if (process.env.NODE_ENV === 'development') {
            console.log('📡 API Response for institution types:', {
              apiResponse,
              normalizedTypes,
              normalizedCount: normalizedTypes.length,
              hasMinistryInAPI: normalizedTypes.some(t => t.key === 'ministry')
            });
          }

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
            console.log('⚠️ API returned empty, using fallback types');
            return { success: true, institution_types: fallbackTypes };
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('❌ API call failed, using fallback:', error);
          }
          logger.error('Failed to load institution types from API', error, {
            component: 'useInstitutionTypes',
            action: 'api-fallback'
          });
          return { success: true, institution_types: fallbackTypes };
        }
      }

      // For non-superadmin users, always use fallback types
      console.log('👤 Non-superadmin user, using fallback types');
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