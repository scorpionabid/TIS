export interface DocumentCollection {
  id: number;
  name: string;
  description?: string;
  collection_type: 'folder' | 'collection';
  scope: 'personal' | 'regional' | 'sectoral';
  folder_key?: string;
  is_system_folder: boolean;
  owner_institution_id?: number;
  owner_institution_level?: '1' | '2' | '3' | '4';
  institution_id: number;
  user_id: number;
  allow_school_upload: boolean;
  is_locked: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Relationships
  ownerInstitution?: Institution;
  institution?: Institution;
  user?: User;
  documents?: Document[];
  auditLogs?: FolderAuditLog[];
}

export interface Institution {
  id: number;
  name: string;
  level: '1' | '2' | '3' | '4';
  parent_id?: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Document {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  institution_id: number;
  user_id: number;
  collection_id?: number;
  cascade_deletable: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Relationships
  institution?: Institution;
  user?: User;
}

export interface FolderAuditLog {
  id: number;
  folder_id: number;
  user_id?: number;
  action: 'created' | 'updated' | 'deleted' | 'renamed' | 'bulk_downloaded' | 'documents_deleted';
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  reason?: string;
  ip_address?: string;
  created_at: string;
  updated_at: string;

  // Relationships
  user?: User;
  folder?: DocumentCollection;
}

export interface CreateRegionalFoldersRequest {
  institution_id: number;
  folder_templates?: Record<string, string>;
  target_institutions?: number[];
}

export interface UpdateFolderRequest {
  name?: string;
  description?: string;
  allow_school_upload?: boolean;
  is_locked?: boolean;
  reason?: string;
}

export interface DeleteFolderRequest {
  reason?: string;
}

export interface FolderWithDocuments {
  folder: DocumentCollection;
  documents: Document[];
}

export const REGIONAL_FOLDER_TEMPLATES = {
  schedules: 'Cədvəl',
  action_plans: 'Fəaliyyət Planı',
  orders: 'Əmrlər',
} as const;
