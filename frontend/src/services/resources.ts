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
  ResourceNotificationData
} from '@/types/resources';

class ResourceService extends BaseService<Resource> {
  constructor() {
    super('/resources');
  }

  /**
   * Get all resources (links + documents) in a unified way
   */
  async getAll(filters: ResourceFilters = {}) {
    try {
      const requests = [];

      // Fetch links if needed
      if (!filters.type || filters.type === 'link') {
        const linkFilters = {
          search: filters.search,
          link_type: filters.link_type,
          share_scope: filters.share_scope,
          is_featured: filters.is_featured,
          sort_by: filters.sort_by,
          sort_direction: filters.sort_direction,
          per_page: filters.per_page,
        };
        requests.push(linkService.getAll(linkFilters));
      }

      // Fetch documents if needed
      if (!filters.type || filters.type === 'document') {
        const documentFilters = {
          search: filters.search,
          category: filters.category,
          access_level: filters.access_level,
          mime_type: filters.mime_type,
          sort_by: filters.sort_by,
          sort_direction: filters.sort_direction,
          per_page: filters.per_page,
        };
        requests.push(documentService.getAll(documentFilters));
      }

      // Execute requests
      const responses = await Promise.all(requests);
      const allResources: Resource[] = [];

      // Process links
      if (responses[0] && (!filters.type || filters.type === 'link')) {
        const links = responses[0].data?.data || [];
        allResources.push(...links.map((link: any) => ({
          ...link,
          type: 'link' as const,
          created_by: link.shared_by,
          creator: link.sharedBy,
        })));
      }

      // Process documents
      const documentsIndex = filters.type === 'link' ? -1 : (filters.type === 'document' ? 0 : 1);
      if (responses[documentsIndex] && documentsIndex >= 0) {
        const documents = responses[documentsIndex].data?.data || [];
        allResources.push(...documents.map((doc: any) => ({
          ...doc,
          type: 'document' as const,
          created_by: doc.uploaded_by,
          creator: doc.uploader,
        })));
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
          url: data.url!,
          link_type: data.link_type,
          share_scope: data.share_scope || 'institutional',
          target_institutions: data.target_institutions,
          target_roles: data.target_roles,
          target_departments: data.target_departments,
          is_featured: data.is_featured,
          expires_at: data.expires_at,
        });

        // Transform to unified format
        result = {
          ...result,
          type: 'link' as const,
          created_by: result.shared_by,
          creator: result.sharedBy,
        };
      } else if (data.type === 'document') {
        // Use existing document service
        result = await documentService.uploadDocument({
          title: data.title,
          description: data.description,
          file: data.file!,
          category: data.category,
          accessible_institutions: data.target_institutions,
          accessible_departments: data.target_departments,
          is_downloadable: data.is_downloadable,
          is_viewable_online: data.is_viewable_online,
        });

        // Transform to unified format
        result = {
          ...result,
          type: 'document' as const,
          created_by: result.uploaded_by,
          creator: result.uploader,
        };
      }

      // Send notifications if target institutions specified
      if (data.target_institutions?.length && result) {
        await this.sendResourceNotifications({
          resource_id: result.id,
          resource_type: data.type,
          resource_title: data.title,
          target_institutions: data.target_institutions,
          notification_type: 'resource_assigned',
        });
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
          url: data.url,
          share_scope: data.share_scope,
          target_institutions: data.target_institutions,
          target_roles: data.target_roles,
          target_departments: data.target_departments,
          is_featured: data.is_featured,
          expires_at: data.expires_at,
        });

        result = {
          ...result,
          type: 'link' as const,
          created_by: result.shared_by,
          creator: result.sharedBy,
        };
      } else {
        // For documents, we need to use the document service update method
        result = await documentService.updatePermissions(id, {
          // Note: Document service may have limited update capabilities
          expires_at: data.expires_at,
        });

        result = {
          ...result,
          type: 'document' as const,
          created_by: result.uploaded_by,
          creator: result.uploader,
        };
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
        result = {
          ...result,
          type: 'link' as const,
          created_by: result.shared_by,
          creator: result.sharedBy,
        };
      } else {
        result = await documentService.getById(id);
        result = {
          ...result,
          type: 'document' as const,
          created_by: result.uploaded_by,
          creator: result.uploader,
        };
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
   * Access a link resource (increments click count)
   */
  async accessResource(id: number, type: 'link' | 'document'): Promise<{ url?: string; redirect_url?: string }> {
    if (type === 'link') {
      return await linkService.accessLink(id);
    } else {
      // For documents, this would typically trigger a download
      const blob = await documentService.downloadDocument(id);
      return { url: URL.createObjectURL(blob) };
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
}

export const resourceService = new ResourceService();