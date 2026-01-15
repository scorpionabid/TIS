// ResourceService deliberately does not extend BaseService because it orchestrates
// both link and document services and therefore diverges from the usual CRUD
// contract. (See note at bottom of file.)
import { apiClient } from './api';
import { linkService, LinkFilters, LinkShare, LinkSharingOverviewResponse } from './links';
import { documentService } from './documents';
import {
  Resource,
  CreateResourceData,
  UpdateResourceData,
  ResourceFilters,
  ResourceStats,
  AssignedResource,
  ResourceNotificationData,
  InstitutionalResource,
  ResourceListResponse
} from '@/types/resources';
import { AssignableUser } from '@/services/tasks';

export type LinkSharingOverview = LinkSharingOverviewResponse;

const isDevEnv = typeof import.meta !== 'undefined' ? Boolean(import.meta.env?.DEV) : false;
const debugLog = (...args: unknown[]) => {
  if (isDevEnv) {
    console.log(...args);
  }
};
const debugWarn = (...args: unknown[]) => {
  if (isDevEnv) {
    console.warn(...args);
  }
};

class ResourceService {
  private readonly baseEndpoint = '/resources';

  /**
   * Helper: Transform link result to unified format
   */
  private transformLinkResult(result: any): Resource {
    return {
      ...result,
      type: 'link' as const,
      created_by: result.shared_by,
      creator: result.sharedBy,
    };
  }

  /**
   * Helper: Transform document result to unified format
   */
  private transformDocumentResult(result: any): Resource {
    return {
      ...result,
      type: 'document' as const,
      created_by: result.uploaded_by,
      creator: result.uploader,
    };
  }

  /**
   * Helper: Build link request payload
   */
  private buildLinkPayload(data: any) {
    return {
      url: data.url || data.url!,
      link_type: data.link_type,
      share_scope: data.share_scope || 'institutional',
      target_institutions: data.target_institutions,
      target_roles: data.target_roles,
      target_departments: data.target_departments,
      target_users: data.target_users,
      is_featured: data.is_featured,
      expires_at: data.expires_at,
    };
  }

  /**
   * Get all resources (links + documents) in a unified way
   *
   * RACE CONDITION FIX: Sequential request strategy for better cache management
   * - Only clear cache when absolutely necessary
   * - Use deterministic response indexing
   * - Prevent parallel cache invalidation conflicts
   */
  async getAll(
    filters: ResourceFilters = {},
    options: { allowForbiddenFallback?: boolean } = {}
  ): Promise<ResourceListResponse> {
    debugLog('📡 ResourceService.getAll request', {
      filters,
      options,
    });
    try {
      debugLog('🚀 ResourceService.getAll request planning:', {
        filterType: filters.type,
        shouldFetchLinks: !filters.type || filters.type === 'link',
        shouldFetchDocuments: !filters.type || filters.type === 'document'
      });

      // Determine which resources to fetch based on filter type
      const shouldFetchLinks = !filters.type || filters.type === 'link';
      const shouldFetchDocuments = !filters.type || filters.type === 'document';

      // Build requests array with explicit type tracking
      interface TypedRequest {
        type: 'link' | 'document';
        promise: Promise<any>;
      }
      const typedRequests: TypedRequest[] = [];

      // Fetch links if needed
      if (shouldFetchLinks) {
      const linkFilters = {
        search: filters.search,
        link_type: filters.link_type,
        share_scope: filters.share_scope,
        is_featured: filters.is_featured,
        status: filters.status,
        creator_id: filters.creator_id,
        institution_id: filters.institution_id,
        institution_ids: filters.institution_ids,
        date_from: filters.date_from || filters.created_after,
        date_to: filters.date_to || filters.created_before,
        my_links: filters.my_links,
        sort_by: filters.sort_by,
        sort_direction: filters.sort_direction,
          per_page: filters.per_page,
        };
        typedRequests.push({
          type: 'link',
          promise: linkService.getAll(linkFilters)
        });
      }

      // Fetch documents if needed
      // Note: Cache clearing moved to AFTER request creation to prevent race condition
      if (shouldFetchDocuments) {
        const documentFilters = {
          search: filters.search,
          category: filters.category,
          access_level: filters.access_level,
          mime_type: filters.mime_type,
          status: filters.status,
          uploaded_by: filters.creator_id,
          institution_id: filters.institution_id,
          date_from: filters.date_from || filters.created_after,
          date_to: filters.date_to || filters.created_before,
          my_documents: filters.my_links,
          sort_by: filters.sort_by,
          sort_direction: filters.sort_direction,
          per_page: filters.per_page,
        };
        typedRequests.push({
          type: 'document',
          promise: documentService.getAll(documentFilters)
        });
      }

      // Execute requests in parallel (but with type safety)
      const responses = await Promise.all(typedRequests.map(tr => tr.promise));
      const allResources: Resource[] = [];

      debugLog('🔍 ResourceService.getAll responses:', {
        requestCount: typedRequests.length,
        responseCount: responses.length,
        requestTypes: typedRequests.map(tr => tr.type),
        responses: responses.map((r, i) => ({
          index: i,
          type: typedRequests[i].type,
          hasData: !!r?.data,
          dataLength: r?.data?.data?.length || 0
        }))
      });

      // Process responses using type information (race condition fix)
      for (let i = 0; i < typedRequests.length; i++) {
        const requestType = typedRequests[i].type;
        const response = responses[i] as { data?: any } | undefined;

        if (!response) continue;

        if (requestType === 'link') {
          // Process links
          let links = [];
          const responseData = response.data as any;
          if (responseData?.data && Array.isArray(responseData.data)) {
            links = responseData.data;
          } else if (Array.isArray(responseData)) {
            links = responseData;
          }

          debugLog('🔗 Processing links:', links.length);
          allResources.push(...links.map((link: any) => ({
            ...link,
            type: 'link' as const,
            created_by: typeof link.shared_by === 'number' ? link.shared_by : link.shared_by?.id,
            creator: link.sharedBy,
          })));
        } else if (requestType === 'document') {
          // Process documents
          let documents = [];
          const responseData = response.data as any;
          if (responseData?.data && Array.isArray(responseData.data)) {
            documents = responseData.data;
          } else if (Array.isArray(responseData)) {
            documents = responseData;
          }

          debugLog('📄 Processing documents:', documents.length);
          allResources.push(...documents.map((doc: any) => ({
            ...doc,
            type: 'document' as const,
            created_by: doc.uploaded_by,
            creator: doc.uploader,
          })));
        }
      }

      // Sort by requested field/direction (fallback to created_at desc)
      const sortField = filters.sort_by || 'created_at';
      const sortDirection = filters.sort_direction || 'desc';

      const getSortValue = (resource: Resource) => {
        if (sortField === 'title') {
          return (resource.title || '').toLocaleLowerCase();
        }
        // Default to created_at date comparison
        return new Date(resource.created_at).getTime();
      };

      allResources.sort((a, b) => {
        const aVal = getSortValue(a);
        const bVal = getSortValue(b);

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const comparison = aVal.localeCompare(bVal, 'az');
          return sortDirection === 'asc' ? comparison : -comparison;
        }

        const numericComparison = (aVal as number) - (bVal as number);
        return sortDirection === 'asc' ? numericComparison : -numericComparison;
      });

      return this.buildPaginatedResponse(allResources, filters.per_page);

    } catch (error: any) {
      console.error('❌ ResourceService.getAll failed:', error);

      // Graceful fallback for roles without links.read permission
      if (options.allowForbiddenFallback !== false && this.isForbiddenResourceError(error)) {
        debugWarn('⚠️ ResourceService.getAll: links.read forbidden, falling back to assigned resources', {
          filters,
          errorMessage: error?.message,
        });
        const assignedResources = await this.getAssignedResources(filters);
        return this.buildPaginatedResponse(assignedResources, filters.per_page);
      }

      throw error;
    }
  }

  /**
   * Fetch link resources using backend pagination metadata
   */
  async getLinksPaginated(filters: ResourceFilters = {}): Promise<ResourceListResponse> {
    const linkFilters = {
      search: filters.search,
      link_type: filters.link_type,
      share_scope: filters.share_scope,
      is_featured: filters.is_featured,
      status: filters.status,
      statuses: filters.statuses, // Add this line
      creator_id: filters.creator_id,
      institution_id: filters.institution_id,
      institution_ids: filters.institution_ids,
      date_from: filters.date_from || filters.created_after,
      date_to: filters.date_to || filters.created_before,
      my_links: filters.my_links,
      sort_by: filters.sort_by,
      sort_direction: filters.sort_direction,
      page: filters.page,
      per_page: filters.per_page,
      scope: filters.scope,
    };

    const response = await linkService.getAll(linkFilters);

    if (import.meta.env?.DEV) {
      console.log('[Links][getLinksPaginated] request', {
        linkFilters,
      });
      console.log('[Links][getLinksPaginated] raw response keys', {
        responseType: typeof response,
        keys: response && typeof response === 'object' ? Object.keys(response as any) : null,
        hasDataArray: Array.isArray((response as any)?.data),
        hasPagination: Boolean((response as any)?.pagination),
        pagination: (response as any)?.pagination,
      });
    }

    const payload: any = response ?? {};
    const linkData: LinkShare[] = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? (payload as LinkShare[])
        : [];

    const metaSource = payload?.meta ?? payload?.pagination ?? payload ?? {};
    const total = typeof metaSource?.total === 'number' ? metaSource.total : linkData.length;
    const perPage = typeof metaSource?.per_page === 'number'
      ? metaSource.per_page
      : (filters.per_page ?? (linkData.length || 20));
    const currentPage = typeof metaSource?.current_page === 'number'
      ? metaSource.current_page
      : filters.page ?? 1;

    if (import.meta.env?.DEV) {
      console.log('[Links][getLinksPaginated] parsed', {
        page: filters.page,
        per_page: filters.per_page,
        receivedCount: linkData.length,
        total,
        perPage,
        currentPage,
        hasMeta: Boolean(payload?.meta),
        meta: payload?.meta,
      });
    }

    return {
      data: linkData.map(link => this.transformLinkResult(link)),
      meta: {
        total,
        per_page: perPage,
        current_page: currentPage,
      },
    };
  }

  async getLinkById(id: number): Promise<Resource> {
    try {
      const link = await linkService.getById(id);
      return this.transformLinkResult(link);
    } catch (error) {
      console.error('❌ ResourceService.getLinkById failed:', error);
      throw error;
    }
  }

  async getLinkSharingOverview(linkId: number): Promise<LinkSharingOverviewResponse | null> {
    try {
      const overview = await linkService.getSharingOverview(linkId);
      return overview ?? null;
    } catch (error) {
      console.error('❌ ResourceService.getLinkSharingOverview failed:', error);
      throw error;
    }
  }

  /**
   * Get merged sharing overview for all links with the same title (grouped links)
   * Used when displaying institutions for link groups (e.g., "Məktəb pasportu" with 354 links)
   */
  async getGroupedLinkSharingOverview(linkTitle: string): Promise<LinkSharingOverviewResponse | null> {
    try {
      const response = await apiClient.get<LinkSharingOverviewResponse>(
        '/links/grouped-sharing-overview',
        { title: linkTitle }
      );
      return response.data ?? null;
    } catch (error) {
      console.error('❌ ResourceService.getGroupedLinkSharingOverview failed:', error);
      throw error;
    }
  }

  /**
   * Create a new resource (link or document)
   */
  async create(data: CreateResourceData): Promise<Resource> {
    debugLog('🔥 ResourceService.create called', data);

    try {
      let result;

      if (data.type === 'link') {
        // Use existing link service
        result = await linkService.create({
          title: data.title,
          description: data.description,
          ...this.buildLinkPayload(data),
        });

        // Transform to unified format
        result = this.transformLinkResult(result);
      } else if (data.type === 'document') {
        // Use existing document service - Fix field mapping
        result = await documentService.uploadDocument({
          title: data.title,
          description: data.description,
          file: data.file!,
          category: data.category,
          // Map frontend fields to backend fields
          accessible_institutions: data.target_institutions,
          accessible_departments: data.target_departments,
          allowed_roles: data.target_roles,
          is_downloadable: data.is_downloadable,
          is_viewable_online: data.is_viewable_online,
          expires_at: data.expires_at,
        });

        // Transform to unified format
        result = this.transformDocumentResult(result);
      }

      // Send notifications if target institutions specified
      if (data.target_institutions?.length && result) {
        try {
          await this.sendResourceNotifications({
            resource_id: result.id,
            resource_type: data.type,
            resource_title: data.title,
            target_institutions: data.target_institutions,
            notification_type: 'resource_assigned',
          });
        } catch (notificationError) {
          debugWarn('⚠️ Notification failed but resource created successfully:', notificationError);
          // Don't throw error - resource creation was successful
        }
      }

      // Clear only the relevant service cache after successful creation
      // This prevents unnecessary cache invalidation and improves performance
      if (data.type === 'link') {
        linkService.clearServiceCache();
        debugLog('🧹 Cleared link service cache after link creation');
      } else if (data.type === 'document') {
        documentService.clearServiceCache();
        debugLog('🧹 Cleared document service cache after document creation');
      }

      debugLog('✅ ResourceService.create successful:', result);
      return result!;

    } catch (error) {
      console.error('❌ ResourceService.create failed:', error);
      throw error;
    }
  }

  /**
   * Update a resource
   */
  async update(id: number, type: 'link' | 'document', data: UpdateResourceData): Promise<Resource> {
    debugLog('🔥 ResourceService.update called', id, type, data);

    try {
      let result;

      if (type === 'link') {
        result = await linkService.update(id, {
          title: data.title,
          description: data.description,
          ...this.buildLinkPayload(data),
        });

        result = this.transformLinkResult(result);
      } else {
        // For documents, use dedicated update method with metadata + optional file
        result = await documentService.updateDocument(id, {
          title: data.title,
          description: data.description,
          category: data.category,
          access_level: data.access_level,
          accessible_institutions: data.target_institutions,
          accessible_departments: data.target_departments,
          allowed_roles: data.target_roles,
          is_downloadable: data.is_downloadable,
          is_viewable_online: data.is_viewable_online,
          expires_at: data.expires_at,
          file: (data as any).file,
        });
        result = this.transformDocumentResult(result);
      }

      debugLog('✅ ResourceService.update successful:', result);
      return result;

    } catch (error) {
      console.error('❌ ResourceService.update failed:', error);
      throw error;
    }
  }

  /**
   * Restore a disabled link
   */
  async restoreLink(id: number): Promise<Resource> {
    const response = await apiClient.post(`/link-shares/${id}/restore`);
    return this.transformLinkResult(response.data.data);
  }

  /**
   * Permanently delete (hard delete) a disabled link
   */
  async forceDeleteLink(id: number): Promise<void> {
    await apiClient.delete(`/link-shares/${id}/force`);
  }

  /**
   * Delete a resource
   */
  async delete(id: number, type: 'link' | 'document'): Promise<void> {
    debugLog('🔥 ResourceService.delete called', id, type);

    try {
      if (type === 'link') {
        await linkService.delete(id);
      } else {
        await documentService.delete(id);
      }

      debugLog('✅ ResourceService.delete successful');
    } catch (error) {
      console.error('❌ ResourceService.delete failed:', error);
      throw error;
    }
  }

  /**
   * Get resource by ID
   */
  async getById(id: number, type: 'link' | 'document'): Promise<Resource> {
    debugLog('🔍 ResourceService.getById called', id, type);

    try {
      let result;

      if (type === 'link') {
        result = await linkService.getById(id);
        result = this.transformLinkResult(result);
      } else {
        result = await documentService.getById(id);
        result = this.transformDocumentResult(result);
      }

      debugLog('✅ ResourceService.getById successful:', result);
      return result;

    } catch (error) {
      console.error('❌ ResourceService.getById failed:', error);
      throw error;
    }
  }

  /**
   * Get unified resource statistics
   */
  async getStats(options: { includeLinks?: boolean; includeDocuments?: boolean } = {}): Promise<ResourceStats> {
    debugLog('📈 ResourceService.getStats called', options);

    const includeLinks = options.includeLinks ?? true;
    const includeDocuments = options.includeDocuments ?? true;

    try {
      const linkStatsPromise = includeLinks
        ? linkService.getLinkStats().catch((error) => {
            console.warn('⚠️ Link stats unavailable:', error);
            return null;
          })
        : Promise.resolve(null);

      const documentStatsPromise = includeDocuments
        ? documentService.getStats().catch((error) => {
            console.warn('⚠️ Document stats unavailable:', error);
            return null;
          })
        : Promise.resolve(null);

      const [linkStats, documentStats] = await Promise.all([linkStatsPromise, documentStatsPromise]);

      const stats: ResourceStats = {
        total_resources: (linkStats?.total_links || 0) + (documentStats?.total || 0),
        total_links: linkStats?.total_links || 0,
        total_documents: documentStats?.total || 0,
        recent_uploads: (linkStats?.recent_links || 0) + (documentStats?.recent_uploads || 0),
        total_clicks: linkStats?.total_clicks || 0,
        total_downloads: 0, // Would need to calculate from document downloads
        by_type: {
          links: linkStats?.by_type || {
            external: 0,
            video: 0,
            form: 0,
            document: 0,
          },
          documents: {
            pdf: documentStats?.by_type?.pdf || 0,
            word: documentStats?.by_type?.word || 0,
            excel: documentStats?.by_type?.excel || 0,
            image: documentStats?.by_type?.image || 0,
            other: documentStats?.by_type?.other || 0,
          },
        },
      };

      debugLog('✅ ResourceService.getStats successful:', stats);
      return stats;

    } catch (error) {
      console.error('❌ ResourceService.getStats failed:', error);
      if (this.isForbiddenResourceError(error)) {
        debugWarn('⚠️ Returning empty stats due to permission limits');
        return this.getEmptyStats();
      }
      throw error;
    }
  }

  /**
   * Get assigned resources for school admins and teachers
   */
  async getAssignedResources(filters: ResourceFilters = {}): Promise<AssignedResource[]> {
    debugLog('📋 ResourceService.getAssignedResources called', filters);

    try {
      // This would be a new API endpoint that returns resources assigned to current user's institution
      const response = await apiClient.get('/my-resources/assigned', filters);
      const rawPayload = (response as any)?.data ?? response;

      let assignedResources: AssignedResource[] = [];
      if (rawPayload && typeof rawPayload === 'object' && Array.isArray((rawPayload as any).data)) {
        assignedResources = (rawPayload as any).data as AssignedResource[];
      } else if (Array.isArray(rawPayload)) {
        assignedResources = rawPayload as AssignedResource[];
      }

      debugLog('✅ ResourceService.getAssignedResources successful:', assignedResources);
      return assignedResources;

    } catch (error) {
      console.error('❌ ResourceService.getAssignedResources failed:', error, {
        filters,
        errorMessage: (error as any)?.message,
      });

      if (!this.isForbiddenResourceError(error)) {
        debugWarn('⚠️ ResourceService.getAssignedResources: non-permission error, retrying getAll without fallback');
        const allResources = await this.getAll(filters, { allowForbiddenFallback: false });
        return allResources.data;
      }

      return [];
    }
  }

  async getAssignedResourcesPaginated(filters: ResourceFilters = {}): Promise<ResourceListResponse> {
    const resources = await this.getAssignedResources(filters);
    return this.buildPaginatedResponse(resources, filters.per_page);
  }

  private buildPaginatedResponse(resources: Resource[], perPage?: number): ResourceListResponse {
    const total = resources.length;
    return {
      data: resources,
      meta: {
        total,
        current_page: 1,
        per_page: perPage || total || 20,
      },
    };
  }

  private isForbiddenResourceError(error: any): boolean {
    if (!error) return false;
    const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
    return message.includes('links.read') || message.includes('forbidden');
  }

  private getEmptyStats(): ResourceStats {
    return {
      total_resources: 0,
      total_links: 0,
      total_documents: 0,
      recent_uploads: 0,
      total_clicks: 0,
      total_downloads: 0,
      by_type: {
        links: {
          external: 0,
          video: 0,
          form: 0,
          document: 0,
        },
        documents: {
          pdf: 0,
          word: 0,
          excel: 0,
          image: 0,
          other: 0,
        },
      },
    };
  }

  /**
   * Send notifications when resources are assigned
   */
  async sendResourceNotifications(data: ResourceNotificationData): Promise<void> {
    debugLog('🔔 ResourceService.sendResourceNotifications called', data);

    try {
      // This would integrate with the existing notification system
      const response = await apiClient.post('/notifications/resource-assignment', {
        title: `Yeni ${data.resource_type === 'link' ? 'Link' : 'Sənəd'} Təyinatı`,
        message: `Sizə yeni resurs təyin edildi: ${data.resource_title}`,
        type: data.notification_type,
        target_institutions: data.target_institutions,
        target_users: data.target_users,
        related_type: data.resource_type,
        related_id: data.resource_id,
      });

      debugLog('✅ ResourceService.sendResourceNotifications successful');
    } catch (error) {
      console.error('❌ ResourceService.sendResourceNotifications failed:', error);
      // Don't throw error here - notification failure shouldn't break resource creation
    }
  }

  /**
   * Access a link resource (increments click count) or download document
   *
   * MEMORY LEAK FIX: Caller is responsible for revoking blob URLs
   * - Document downloads return blob URLs that must be revoked
   * - Use URL.revokeObjectURL(url) after download completes
   * - Prevents memory leaks from accumulated blob URLs
   */
  async accessResource(id: number, type: 'link' | 'document'): Promise<{ url?: string; redirect_url?: string }> {
    if (type === 'link') {
      return await linkService.accessLink(id);
    } else {
      // For documents, trigger download and return blob URL
      // IMPORTANT: Caller must revoke the URL after use with URL.revokeObjectURL()
      try {
        const blob = await documentService.downloadDocument(id);
        debugLog('📥 Downloaded blob:', blob, 'Type:', typeof blob, 'Size:', blob?.size);

        // Ensure we have a valid blob
        if (blob instanceof Blob) {
          const url = URL.createObjectURL(blob);
          debugLog('🔗 Created object URL:', url, '(must be revoked by caller)');
          return { url };
        } else {
          console.error('❌ Invalid blob received:', blob);
          throw new Error('Invalid file format received');
        }
      } catch (error) {
        console.error('❌ Document download failed:', error);
        throw error;
      }
    }
  }

  /**
   * Get targetable users for resource sharing (special users tab)
   */
  async getTargetUsers(params?: {
    role?: string;
    search?: string;
    per_page?: number;
    origin_scope?: 'region' | 'sector';
  }): Promise<AssignableUser[]> {
    debugLog('👥 ResourceService.getTargetUsers called', params);

    const response = await apiClient.get('/resources/target-users', {
      ...params,
      per_page: Math.min(params?.per_page ?? 200, 200),
    });
    const payload: any = response?.data ?? response ?? [];

    if (Array.isArray(payload)) {
      return payload as AssignableUser[];
    }

    if (Array.isArray(payload?.data)) {
      return payload.data as AssignableUser[];
    }

    return [];
  }

  /**
   * Helper method to get resource icon
   */
  getResourceIcon(resource: Resource): string {
    if (resource.type === 'link') {
      switch (resource.link_type) {
        case 'video': return '🎥';
        case 'form': return '📝';
        case 'document': return '📄';
        default: return '🔗';
      }
    } else {
      return documentService.getFileIcon(resource.mime_type || '');
    }
  }

  /**
   * Helper method to format resource size
   */
  formatResourceSize(resource: Resource): string {
    if (resource.type === 'document' && resource.file_size) {
      return documentService.formatFileSize(resource.file_size);
    }
    return '';
  }

  /**
   * Helper method to get resource type label
   */
  getResourceTypeLabel(type: 'link' | 'document'): string {
    return type === 'link' ? 'Link' : 'Sənəd';
  }

  /**
   * Get sub-institution documents grouped by institution
   */
  async getSubInstitutionDocuments(): Promise<InstitutionalResource[]> {
    debugLog('📋 ResourceService.getSubInstitutionDocuments called');

    try {
      const response = await apiClient.get('/documents/sub-institutions');
      const payload = (response as any)?.data ?? response;

      if (Array.isArray(payload)) {
        return payload as InstitutionalResource[];
      }

      if (payload && typeof payload === 'object' && Array.isArray((payload as any).data)) {
        return (payload as any).data as InstitutionalResource[];
      }

      return [];
    } catch (error) {
      console.error('❌ Failed to fetch sub-institution documents:', error);
      throw error;
    }
  }

  /**
   * Get superior institutions for document targeting
   */
  async getSuperiorInstitutions(): Promise<any[]> {
    debugLog('🔝 ResourceService.getSuperiorInstitutions called');

    try {
      const response = await apiClient.get('/documents/superior-institutions');
      const payload = (response as any)?.data ?? response;

      if (Array.isArray(payload)) {
        return payload;
      }

      if (payload && typeof payload === 'object' && Array.isArray((payload as any).data)) {
        return (payload as any).data;
      }

      return [];
    } catch (error) {
      console.error('❌ Failed to fetch superior institutions:', error);
      throw error;
    }
  }
}

export const resourceService = new ResourceService();

/**
 * NOTE:
 * This class predates BaseService generics being tightened. It carries several
 * method overrides (getAll, update, delete, getById) whose signatures no longer
 * align with BaseService expectations, leading to TypeScript inheritance errors.
 *
 * The pagination work intentionally avoided widening the refactor scope, so the
 * existing overrides remain untouched. A dedicated follow-up refactor should
 * reconcile these signatures—likely by extracting link/document orchestration
 * into helpers while delegating CRUD directly to BaseService.
 */
