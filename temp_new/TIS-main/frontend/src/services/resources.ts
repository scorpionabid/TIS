// ResourceService deliberately does not extend BaseService because it orchestrates
// both link and document services and therefore diverges from the usual CRUD
// contract. (See note at bottom of file.)
import { apiClient } from './api';
import { logger } from '@/utils/logger';
import { linkService, LinkFilters, LinkShare, LinkSharingOverviewResponse } from './links';
import { documentService, Document as ServiceDocument } from './documents';
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

type ApiObjectPayload = { data?: unknown[] | { data?: unknown[] } };

class ResourceService {
  private readonly baseEndpoint = '/resources';

  /**
   * Helper: Transform link result to unified format
   */
  private transformLinkResult(result: LinkShare): Resource {
    return {
      ...result,
      type: 'link' as const,
      created_by: result.shared_by,
      creator: result.sharedBy,
    } as Resource;
  }

  /**
   * Helper: Transform document result to unified format
   */
  private transformDocumentResult(result: ServiceDocument): Resource {
    return {
      ...result,
      type: 'document' as const,
      created_by: result.uploaded_by,
      creator: result.uploader,
    } as Resource;
  }

  /**
   * Helper: Build link request payload
   */
  private buildLinkPayload(data: CreateResourceData) {
    return {
      url: data.url,
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
    logger.debug('ResourceService.getAll request', { data: { filters, options } });
    try {
      logger.debug('ResourceService.getAll request planning', {
        data: {
          filterType: filters.type,
          shouldFetchLinks: !filters.type || filters.type === 'link',
          shouldFetchDocuments: !filters.type || filters.type === 'document',
        },
      });

      // Determine which resources to fetch based on filter type
      const shouldFetchLinks = !filters.type || filters.type === 'link';
      const shouldFetchDocuments = !filters.type || filters.type === 'document';

      // Build requests array with explicit type tracking
      interface TypedRequest {
        type: 'link' | 'document';
        promise: Promise<unknown>;
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
        is_bulk: filters.is_bulk,
        group_by_title: filters.group_by_title,
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

      logger.debug('ResourceService.getAll responses', {
        data: {
          requestCount: typedRequests.length,
          responseCount: responses.length,
          requestTypes: typedRequests.map(tr => tr.type),
        },
      });

      // Process responses using type information (race condition fix)
      for (let i = 0; i < typedRequests.length; i++) {
        const requestType = typedRequests[i].type;
        const response = responses[i] as { data?: unknown } | undefined;

        if (!response) continue;

        if (requestType === 'link') {
          // Process links
          let links: LinkShare[] = [];
          const responseData = response?.data;
          if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
            const dataObj = responseData as { data?: unknown[] };
            if (Array.isArray(dataObj.data)) {
              links = dataObj.data as LinkShare[];
            }
          } else if (Array.isArray(responseData)) {
            links = responseData as LinkShare[];
          }

          logger.debug('Processing links', { data: { count: links.length } });
          allResources.push(...links.map(link => ({
            ...link,
            type: 'link' as const,
            created_by: link.shared_by,
            creator: link.sharedBy,
          } as Resource)));
        } else if (requestType === 'document') {
          // Process documents
          let documents: ServiceDocument[] = [];
          const responseData = response?.data;
          if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
            const dataObj = responseData as { data?: unknown[] };
            if (Array.isArray(dataObj.data)) {
              documents = dataObj.data as ServiceDocument[];
            }
          } else if (Array.isArray(responseData)) {
            documents = responseData as ServiceDocument[];
          }

          logger.debug('Processing documents', { data: { count: documents.length } });
          allResources.push(...documents.map(doc => ({
            ...doc,
            type: 'document' as const,
            created_by: doc.uploaded_by,
            creator: doc.uploader,
          } as Resource)));
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

    } catch (error: unknown) {
      logger.error('ResourceService.getAll failed', error);

      // Graceful fallback for roles without links.read permission
      if (options.allowForbiddenFallback !== false && this.isForbiddenResourceError(error)) {
        logger.warn('ResourceService.getAll: links.read forbidden, falling back to assigned resources');
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
      statuses: filters.statuses,
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
      group_by_title: filters.group_by_title, // Return only one link per unique title
      is_bulk: filters.is_bulk,
    };

    const response = await linkService.getAll(linkFilters);

    logger.debug('[Links][getLinksPaginated] request', { data: { linkFilters } });
    logger.debug('[Links][getLinksPaginated] raw response', {
      data: {
        responseType: typeof response,
        keys: response && typeof response === 'object' ? Object.keys(response as Record<string, unknown>) : null,
        hasDataArray: Array.isArray((response as ApiObjectPayload)?.data),
        hasPagination: Boolean((response as Record<string, unknown>)?.pagination),
      },
    });

    const payload = (response ?? {}) as Record<string, unknown>;
    const linkData: LinkShare[] = Array.isArray(payload?.data)
      ? (payload.data as LinkShare[])
      : Array.isArray(response)
        ? (response as LinkShare[])
        : [];

    const metaSource = (payload?.meta ?? payload?.pagination ?? payload ?? {}) as Record<string, unknown>;
    const total = typeof metaSource?.total === 'number' ? metaSource.total : linkData.length;
    const perPage = typeof metaSource?.per_page === 'number'
      ? metaSource.per_page
      : (filters.per_page ?? (linkData.length || 20));
    const currentPage = typeof metaSource?.current_page === 'number'
      ? metaSource.current_page
      : filters.page ?? 1;

    logger.debug('[Links][getLinksPaginated] parsed', {
      data: {
        page: filters.page,
        per_page: filters.per_page,
        receivedCount: linkData.length,
        total,
        perPage,
        currentPage,
        hasMeta: Boolean(payload?.meta),
      },
    });

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
      logger.error('ResourceService.getLinkById failed', error);
      throw error;
    }
  }

  async getLinkSharingOverview(linkId: number): Promise<LinkSharingOverviewResponse | null> {
    try {
      const overview = await linkService.getSharingOverview(linkId);
      return overview ?? null;
    } catch (error) {
      logger.error('ResourceService.getLinkSharingOverview failed', error);
      throw error;
    }
  }

  /**
   * Get merged sharing overview for all links with the same title (grouped links)
   * Used when displaying institutions for link groups (e.g., "Məktəb pasportu" with 354 links)
   */
  async getGroupedLinkSharingOverview(linkTitle: string): Promise<LinkSharingOverviewResponse | null> {
    try {
      const response = await apiClient.get<{ data: LinkSharingOverviewResponse | null }>(
        '/links/grouped-sharing-overview',
        { title: linkTitle }
      );
      return (response as { data: LinkSharingOverviewResponse | null }).data ?? null;
    } catch (error) {
      logger.error('ResourceService.getGroupedLinkSharingOverview failed', error);
      throw error;
    }
  }

  /**
   * Create a new resource (link or document)
   */
  async create(data: CreateResourceData): Promise<Resource> {
    logger.debug('ResourceService.create called', { data: { type: data.type, title: data.title } });

    try {
      let result: Resource | undefined;

      if (data.type === 'link') {
        // Use existing link service
        const linkResult = await linkService.create({
          title: data.title,
          description: data.description,
          ...this.buildLinkPayload(data),
        });

        // Transform to unified format
        result = this.transformLinkResult(linkResult);
      } else if (data.type === 'document') {
        // Use existing document service - Fix field mapping
        const docResult = await documentService.uploadDocument({
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
        result = this.transformDocumentResult(docResult);
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
          logger.warn('Notification failed but resource created successfully');
          // Don't throw error - resource creation was successful
        }
      }

      // Clear only the relevant service cache after successful creation
      // This prevents unnecessary cache invalidation and improves performance
      if (data.type === 'link') {
        linkService.clearServiceCache();
        logger.debug('Cleared link service cache after link creation');
      } else if (data.type === 'document') {
        documentService.clearServiceCache();
        logger.debug('Cleared document service cache after document creation');
      }

      logger.debug('ResourceService.create successful', { data: { id: result?.id } });
      return result!;

    } catch (error) {
      logger.error('ResourceService.create failed', error);
      throw error;
    }
  }

  /**
   * Update a resource
   */
  async update(id: number, type: 'link' | 'document', data: UpdateResourceData): Promise<Resource> {
    logger.debug('ResourceService.update called', { data: { id, type } });

    try {
      let result: Resource;

      if (type === 'link') {
        const linkResult = await linkService.update(id, {
          title: data.title,
          description: data.description,
          ...this.buildLinkPayload(data as CreateResourceData),
        });

        result = this.transformLinkResult(linkResult);
      } else {
        // For documents, use dedicated update method with metadata + optional file
        const updateData = data as UpdateResourceData & { file?: File };
        const docResult = await documentService.updateDocument(id, {
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
          file: updateData.file,
        });
        result = this.transformDocumentResult(docResult);
      }

      logger.debug('ResourceService.update successful', { data: { id } });
      return result;

    } catch (error) {
      logger.error('ResourceService.update failed', error);
      throw error;
    }
  }

  /**
   * Restore a disabled link
   */
  async restoreLink(id: number): Promise<Resource> {
    const response = await apiClient.patch(`/links/${id}/restore`);
    return this.transformLinkResult((response as { data: { data: LinkShare } }).data.data);
  }

  /**
   * Permanently delete (hard delete) a disabled link
   */
  async forceDeleteLink(id: number): Promise<void> {
    await apiClient.delete(`/links/${id}/force`);
  }

  /**
   * Delete a resource
   */
  async delete(id: number, type: 'link' | 'document'): Promise<void> {
    logger.debug('ResourceService.delete called', { data: { id, type } });

    try {
      if (type === 'link') {
        await linkService.delete(id);
      } else {
        await documentService.delete(id);
      }

      logger.debug('ResourceService.delete successful', { data: { id } });
    } catch (error) {
      logger.error('ResourceService.delete failed', error);
      throw error;
    }
  }

  /**
   * Get resource by ID
   */
  async getById(id: number, type: 'link' | 'document'): Promise<Resource> {
    logger.debug('ResourceService.getById called', { data: { id, type } });

    try {
      let result: Resource;

      if (type === 'link') {
        const link = await linkService.getById(id);
        result = this.transformLinkResult(link);
      } else {
        const doc = await documentService.getById(id);
        result = this.transformDocumentResult(doc);
      }

      logger.debug('ResourceService.getById successful', { data: { id } });
      return result;

    } catch (error) {
      logger.error('ResourceService.getById failed', error);
      throw error;
    }
  }

  /**
   * Get unified resource statistics
   */
  async getStats(options: { includeLinks?: boolean; includeDocuments?: boolean } = {}): Promise<ResourceStats> {
    logger.debug('ResourceService.getStats called', { data: options });

    const includeLinks = options.includeLinks ?? true;
    const includeDocuments = options.includeDocuments ?? true;

    try {
      const linkStatsPromise = includeLinks
        ? linkService.getLinkStats().catch((error) => {
            logger.warn('Link stats unavailable', { data: { error } });
            return null;
          })
        : Promise.resolve(null);

      const documentStatsPromise = includeDocuments
        ? documentService.getStats().catch((error) => {
            logger.warn('Document stats unavailable', { data: { error } });
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

      logger.debug('ResourceService.getStats successful');
      return stats;

    } catch (error) {
      logger.error('ResourceService.getStats failed', error);
      if (this.isForbiddenResourceError(error)) {
        logger.warn('Returning empty stats due to permission limits');
        return this.getEmptyStats();
      }
      throw error;
    }
  }

  /**
   * Get assigned resources for school admins and teachers
   */
  async getAssignedResources(filters: ResourceFilters = {}): Promise<AssignedResource[]> {
    logger.debug('ResourceService.getAssignedResources called', { data: { filters } });

    try {
      // This would be a new API endpoint that returns resources assigned to current user's institution
      const response = await apiClient.get('/my-resources/assigned', filters);
      const rawPayload = (response as { data?: unknown })?.data ?? response;

      let assignedResources: AssignedResource[] = [];
      if (rawPayload && typeof rawPayload === 'object' && Array.isArray((rawPayload as { data?: unknown[] }).data)) {
        assignedResources = (rawPayload as { data: AssignedResource[] }).data;
      } else if (Array.isArray(rawPayload)) {
        assignedResources = rawPayload as AssignedResource[];
      }

      logger.debug('ResourceService.getAssignedResources successful', { data: { count: assignedResources.length } });
      return assignedResources;

    } catch (error: unknown) {
      logger.error('ResourceService.getAssignedResources failed', error, { data: { filters } });

      if (!this.isForbiddenResourceError(error)) {
        logger.warn('ResourceService.getAssignedResources: non-permission error, retrying getAll without fallback');
        const allResources = await this.getAll(filters, { allowForbiddenFallback: false });
        return allResources.data;
      }

      return [];
    }
  }

  /**
   * Mark a resource as viewed by the current user (non-blocking).
   * Called after opening a link or downloading a document.
   */
  async markAsViewed(id: number, type: 'link' | 'document'): Promise<void> {
    try {
      await apiClient.post(`/my-resources/${type}/${id}/view`, {});
    } catch (error) {
      // Non-blocking — view tracking failure should never break the user experience
      logger.warn('ResourceService.markAsViewed failed (non-critical)');
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

  private isForbiddenResourceError(error: unknown): boolean {
    if (!error) return false;
    const err = error as { message?: unknown };
    const message = typeof err.message === 'string' ? err.message.toLowerCase() : '';
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
    logger.debug('ResourceService.sendResourceNotifications called', { data: { resource_id: data.resource_id } });

    try {
      // This would integrate with the existing notification system
      await apiClient.post('/notifications/resource-assignment', {
        title: `Yeni ${data.resource_type === 'link' ? 'Link' : 'Sənəd'} Təyinatı`,
        message: `Sizə yeni resurs təyin edildi: ${data.resource_title}`,
        type: data.notification_type,
        target_institutions: data.target_institutions,
        target_users: data.target_users,
        related_type: data.resource_type,
        related_id: data.resource_id,
      });

      logger.debug('ResourceService.sendResourceNotifications successful');
    } catch (error) {
      logger.error('ResourceService.sendResourceNotifications failed', error);
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
        logger.debug('Downloaded blob', { data: { size: blob?.size } });

        // Ensure we have a valid blob
        if (blob instanceof Blob) {
          const url = URL.createObjectURL(blob);
          logger.debug('Created object URL (must be revoked by caller)');
          return { url };
        } else {
          logger.error('Invalid blob received', blob);
          throw new Error('Invalid file format received');
        }
      } catch (error) {
        logger.error('Document download failed', error);
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
    logger.debug('ResourceService.getTargetUsers called', { data: params });

    const response = await apiClient.get('/resources/target-users', {
      ...params,
      per_page: Math.min(params?.per_page ?? 200, 200),
    });
    const payload = ((response as { data?: unknown })?.data ?? response ?? []) as unknown;

    if (Array.isArray(payload)) {
      return payload as AssignableUser[];
    }

    if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
      return (payload as { data: AssignableUser[] }).data;
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
    logger.debug('ResourceService.getSubInstitutionDocuments called');

    try {
      const response = await apiClient.get('/documents/sub-institutions');
      const payload = ((response as { data?: unknown })?.data ?? response) as unknown;

      if (Array.isArray(payload)) {
        return payload as InstitutionalResource[];
      }

      if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
        return (payload as { data: InstitutionalResource[] }).data;
      }

      return [];
    } catch (error) {
      logger.error('Failed to fetch sub-institution documents', error);
      throw error;
    }
  }

  /**
   * Get sharing overview for a specific link
   */
  async getLinkSharingOverview(linkId: number): Promise<LinkSharingOverview> {
    return await linkService.getSharingOverview(linkId);
  }

  /**
   * Get aggregated sharing overview for all links with the same title
   */
  async getGroupedLinkSharingOverview(title: string): Promise<LinkSharingOverview> {
    try {
      const response = await apiClient.get<LinkSharingOverviewResponse>('/links/grouped-sharing-overview', { title });
      return response.data;
    } catch (error) {
      logger.error('ResourceService.getGroupedLinkSharingOverview failed', error);
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
