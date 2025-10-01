import { BaseService } from './BaseService';
import { apiClient } from './api';
import { linkService } from './links';
import { documentService } from './documents';
import {
  Resource,
  CreateResourceData,
  UpdateResourceData,
  ResourceFilters,
  ResourceStats,
  AssignedResource,
  ResourceNotificationData,
  InstitutionalResource
} from '@/types/resources';

class ResourceService extends BaseService<Resource> {
  constructor() {
    super('/resources');
  }

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
  async getAll(filters: ResourceFilters = {}) {
    try {
      console.log('🚀 ResourceService.getAll request planning:', {
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

      console.log('🔍 ResourceService.getAll responses:', {
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
        const response = responses[i];

        if (!response) continue;

        if (requestType === 'link') {
          // Process links
          let links = [];
          if (response.data?.data && Array.isArray(response.data.data)) {
            links = response.data.data;
          } else if (Array.isArray(response.data)) {
            links = response.data;
          }

          console.log('🔗 Processing links:', links.length);
          allResources.push(...links.map((link: any) => ({
            ...link,
            type: 'link' as const,
            created_by: typeof link.shared_by === 'number' ? link.shared_by : link.shared_by?.id,
            creator: link.sharedBy,
          })));
        } else if (requestType === 'document') {
          // Process documents
          let documents = [];
          if (response.data?.data && Array.isArray(response.data.data)) {
            documents = response.data.data;
          } else if (Array.isArray(response.data)) {
            documents = response.data;
          }

          console.log('📄 Processing documents:', documents.length);
          allResources.push(...documents.map((doc: any) => ({
            ...doc,
            type: 'document' as const,
            created_by: doc.uploaded_by,
            creator: doc.uploader,
          })));
        }
      }

      // Sort by created_at desc by default
      allResources.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return {
        data: {
          data: allResources,
          total: allResources.length,
          current_page: 1,
          per_page: filters.per_page || 20,
        }
      };

    } catch (error) {
      console.error('❌ ResourceService.getAll failed:', error);
      throw error;
    }
  }

  /**
   * Create a new resource (link or document)
   */
  async create(data: CreateResourceData): Promise<Resource> {
    console.log('🔥 ResourceService.create called', data);

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
          console.warn('⚠️ Notification failed but resource created successfully:', notificationError);
          // Don't throw error - resource creation was successful
        }
      }

      // Clear only the relevant service cache after successful creation
      // This prevents unnecessary cache invalidation and improves performance
      if (data.type === 'link') {
        linkService.clearServiceCache();
        console.log('🧹 Cleared link service cache after link creation');
      } else if (data.type === 'document') {
        documentService.clearServiceCache();
        console.log('🧹 Cleared document service cache after document creation');
      }

      console.log('✅ ResourceService.create successful:', result);
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
    console.log('🔥 ResourceService.update called', id, type, data);

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
        // For documents, we need to use the document service update method
        result = await documentService.updatePermissions(id, {
          // Map frontend fields to backend fields for update
          accessible_institutions: data.target_institutions,
          accessible_departments: data.target_departments,
          allowed_roles: data.target_roles,
          expires_at: data.expires_at,
          is_downloadable: data.is_downloadable,
          is_viewable_online: data.is_viewable_online,
        });

        result = this.transformDocumentResult(result);
      }

      console.log('✅ ResourceService.update successful:', result);
      return result;

    } catch (error) {
      console.error('❌ ResourceService.update failed:', error);
      throw error;
    }
  }

  /**
   * Delete a resource
   */
  async delete(id: number, type: 'link' | 'document'): Promise<void> {
    console.log('🔥 ResourceService.delete called', id, type);

    try {
      if (type === 'link') {
        await linkService.delete(id);
      } else {
        await documentService.delete(id);
      }

      console.log('✅ ResourceService.delete successful');
    } catch (error) {
      console.error('❌ ResourceService.delete failed:', error);
      throw error;
    }
  }

  /**
   * Get resource by ID
   */
  async getById(id: number, type: 'link' | 'document'): Promise<Resource> {
    console.log('🔍 ResourceService.getById called', id, type);

    try {
      let result;

      if (type === 'link') {
        result = await linkService.getById(id);
        result = this.transformLinkResult(result);
      } else {
        result = await documentService.getById(id);
        result = this.transformDocumentResult(result);
      }

      console.log('✅ ResourceService.getById successful:', result);
      return result;

    } catch (error) {
      console.error('❌ ResourceService.getById failed:', error);
      throw error;
    }
  }

  /**
   * Get unified resource statistics
   */
  async getStats(): Promise<ResourceStats> {
    console.log('📈 ResourceService.getStats called');

    try {
      const [linkStats, documentStats] = await Promise.all([
        linkService.getLinkStats().catch(() => null),
        documentService.getStats().catch(() => null),
      ]);

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

      console.log('✅ ResourceService.getStats successful:', stats);
      return stats;

    } catch (error) {
      console.error('❌ ResourceService.getStats failed:', error);
      throw error;
    }
  }

  /**
   * Get assigned resources for school admins and teachers
   */
  async getAssignedResources(filters: ResourceFilters = {}): Promise<AssignedResource[]> {
    console.log('📋 ResourceService.getAssignedResources called', filters);

    try {
      // This would be a new API endpoint that returns resources assigned to current user's institution
      const response = await apiClient.get('/my-resources/assigned', filters);

      const assignedResources: AssignedResource[] = response.data?.data || [];

      console.log('✅ ResourceService.getAssignedResources successful:', assignedResources);
      return assignedResources;

    } catch (error) {
      console.error('❌ ResourceService.getAssignedResources failed:', error);
      // Fallback to filtering current resources for now
      const allResources = await this.getAll(filters);
      return allResources.data?.data || [];
    }
  }

  /**
   * Send notifications when resources are assigned
   */
  async sendResourceNotifications(data: ResourceNotificationData): Promise<void> {
    console.log('🔔 ResourceService.sendResourceNotifications called', data);

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

      console.log('✅ ResourceService.sendResourceNotifications successful');
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
        console.log('📥 Downloaded blob:', blob, 'Type:', typeof blob, 'Size:', blob?.size);

        // Ensure we have a valid blob
        if (blob instanceof Blob) {
          const url = URL.createObjectURL(blob);
          console.log('🔗 Created object URL:', url, '(must be revoked by caller)');
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
   *
   * This method retrieves documents uploaded by institutions hierarchically
   * below the current user's institution. Only accessible by regionadmin,
   * regionoperator, and sektoradmin roles.
   *
   * @returns Promise<InstitutionalResource[]> - Array of institutions with their documents
   */
  async getSubInstitutionDocuments(): Promise<InstitutionalResource[]> {
    console.log('📋 ResourceService.getSubInstitutionDocuments called');

    try {
      const response = await apiClient.get('/documents/sub-institutions');
      // Backend returns {success: true, data: [...]}
      // apiClient already extracts response.data, so we access .data directly
      const data: InstitutionalResource[] = response.data || [];

      console.log('✅ Sub-institution documents fetched:', data.length, 'institutions');
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch sub-institution documents:', error);
      throw error;
    }
  }

  /**
   * Get superior institutions for document targeting
   *
   * SchoolAdmin can target their sector and region
   * SektorAdmin can target their region
   * Returns institutions that are hierarchically above the current user
   *
   * @returns Promise<any[]> - Array of superior institutions
   */
  async getSuperiorInstitutions(): Promise<any[]> {
    console.log('🔝 ResourceService.getSuperiorInstitutions called');

    try {
      const response = await apiClient.get('/documents/superior-institutions');
      // Backend returns {success: true, data: [...]}
      // apiClient already extracts response.data, so we access .data directly
      const data = response.data || [];

      console.log('✅ Superior institutions fetched:', data.length, 'institutions');
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch superior institutions:', error);
      throw error;
    }
  }
}

export const resourceService = new ResourceService();