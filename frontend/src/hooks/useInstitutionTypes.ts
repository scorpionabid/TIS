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
      // Only superadmin can access institution-types API
      if (userRole === 'superadmin') {
        try {
          return await institutionService.getInstitutionTypes() as { success: boolean; institution_types: InstitutionType[] };
        } catch (error) {
          console.warn('Failed to load institution types from API, using fallback');
          return { success: true, institution_types: [] };
        }
      } else {
        // For non-superadmin users, return fallback types based on their role
        const fallbackTypes = getFallbackTypesForRole(userRole);
        return { success: true, institution_types: fallbackTypes };
      }
    },
    enabled: !!userRole && enabled,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
};