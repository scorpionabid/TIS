import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { cacheService } from '@/services/CacheService';

/**
 * Enhanced useMutation hook that automatically invalidates both
 * React Query cache and CacheService cache after successful mutations.
 *
 * Usage:
 * ```ts
 * const mutation = useMutationWithInvalidation({
 *   mutationFn: (data) => surveyService.publish(data.id),
 *   invalidateKeys: [['surveys'], ['survey-stats']],
 *   cacheTags: ['/surveys'],
 * });
 * ```
 */
interface MutationWithInvalidationOptions<TData, TError, TVariables, TContext>
  extends UseMutationOptions<TData, TError, TVariables, TContext> {
  /** React Query keys to invalidate on success */
  invalidateKeys?: string[][];
  /** CacheService tags to clear on success */
  cacheTags?: string[];
}

export function useMutationWithInvalidation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(
  options: MutationWithInvalidationOptions<TData, TError, TVariables, TContext>
) {
  const queryClient = useQueryClient();
  const { invalidateKeys, cacheTags, onSuccess, ...restOptions } = options;

  return useMutation({
    ...restOptions,
    onSuccess: (...args) => {
      // 1. Invalidate React Query cache
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // 2. Clear CacheService cache (tag-based)
      if (cacheTags) {
        cacheService.clearByTags(cacheTags);
      }

      // 3. Call original onSuccess
      onSuccess?.(...args);
    },
  });
}
