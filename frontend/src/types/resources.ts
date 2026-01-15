import { BaseEntity } from '@/services/BaseService';

// Unified resource interface combining links and documents
export interface Resource extends BaseEntity {
  type: 'link' | 'document';
  title: string;
  description?: string;

  // Institution targeting (following survey pattern)
  target_institutions?: number[];
  target_departments?: number[];
  target_roles?: string[];
  target_users?: number[];

  // Creator info
  created_by?: number;
  creator?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };

  institution?: {
    id: number;
    name: string;
    type: string;
    utis_code?: string | null;
  };

  // Link specific fields
  url?: string;
  link_type?: 'external' | 'video' | 'form' | 'document';
  click_count?: number;
  is_featured?: boolean;
  share_scope?: 'public' | 'regional' | 'sectoral' | 'institutional' | 'specific_users';

  // Document specific fields
  original_filename?: string;
  file_size?: number;
  mime_type?: string;
  file_extension?: string;
  access_level?: 'public' | 'regional' | 'sectoral' | 'institution';
  category?: string;
  download_count?: number;
  is_downloadable?: boolean;
  is_viewable_online?: boolean;

  // Common status
  status?: 'active' | 'inactive' | 'draft' | 'archived';
  published_at?: string;
  expires_at?: string;
}

// Resource creation data
export interface CreateResourceData {
  type: 'link' | 'document';
  title: string;
  description?: string;

  // Institution targeting
  target_institutions?: number[];
  target_departments?: number[];
  target_roles?: string[];
  target_users?: number[];

  // Link specific
  url?: string;
  link_type?: 'external' | 'video' | 'form' | 'document';
  share_scope?: 'public' | 'regional' | 'sectoral' | 'institutional' | 'specific_users';
  is_featured?: boolean;

  // Document specific
  file?: File;
  access_level?: 'public' | 'regional' | 'sectoral' | 'institution';
  category?: string;
  is_downloadable?: boolean;
  is_viewable_online?: boolean;

  // Common
  expires_at?: string;
}

// Update resource data
export interface UpdateResourceData {
  title?: string;
  description?: string;
  target_institutions?: number[];
  target_departments?: number[];
  target_roles?: string[];
  file?: File;

  // Link specific updates
  url?: string;
  link_type?: 'external' | 'video' | 'form' | 'document';
  is_featured?: boolean;
  share_scope?: 'public' | 'regional' | 'sectoral' | 'institutional' | 'specific_users';

  // Document specific updates
  access_level?: 'public' | 'regional' | 'sectoral' | 'institution';
  category?: string;
  is_downloadable?: boolean;
  is_viewable_online?: boolean;

  expires_at?: string;
}

// Resource filters for querying
export interface ResourceFilters {
  type?: 'link' | 'document';
  search?: string;
  target_institutions?: number[];
  creator_id?: number;
  institution_id?: number;
  institution_ids?: number[];
  date_from?: string;
  date_to?: string;
  scope?: 'global' | 'scoped';

  // Link filters
  link_type?: 'external' | 'video' | 'form' | 'document';
  share_scope?: 'public' | 'regional' | 'sectoral' | 'institutional' | 'specific_users';
  is_featured?: boolean;
  my_links?: boolean;

  // Document filters
  access_level?: 'public' | 'regional' | 'sectoral' | 'institution';
  category?: string;
  mime_type?: string;

  // Common filters
  status?: string;
  created_after?: string;
  created_before?: string;
  expires_after?: string;
  expires_before?: string;

  // Pagination
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';

  // Selection mode - bypasses regional filter to show all active links
  selection_mode?: boolean;
  statuses?: string[];
  group_by_title?: boolean;
}

// Resource statistics
export interface ResourceStats {
  total_resources: number;
  total_links: number;
  total_documents: number;
  recent_uploads: number;
  total_clicks: number;
  total_downloads: number;
  by_type: {
    links: {
      external: number;
      video: number;
      form: number;
      document: number;
    };
    documents: {
      pdf: number;
      word: number;
      excel: number;
      image: number;
      other: number;
    };
  };
}

export interface ResourceListResponse {
  data: Resource[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
  };
}

// Assignment info for schooladmin/teacher view
export interface AssignedResource extends Resource {
  assigned_at?: string;
  assigned_by?: {
    id: number;
    name: string;
    institution: string;
  };
  is_new?: boolean;
  viewed_at?: string;
}

// Resource notification data
export interface ResourceNotificationData {
  resource_id: number;
  resource_type: 'link' | 'document';
  resource_title: string;
  target_institutions: number[];
  target_users?: number[];
  message?: string;
  notification_type: 'resource_assigned' | 'resource_updated' | 'resource_expired';
}

// Institutional resource grouping (for sub-institution view)
export interface InstitutionalResource {
  institution_id: number;
  institution_name: string;
  institution_type: string;
  document_count: number;
  documents: Resource[];
}
