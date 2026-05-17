import { apiClient as api } from './api';
import type {
  Document,
  DocumentCollection,
  CreateRegionalFoldersRequest,
  UpdateFolderRequest,
  DeleteFolderRequest,
  FolderWithDocuments,
  FolderAuditLog,
  Institution,
} from '../types/documentCollection';

interface InstitutionDocumentGroup {
  institution_id: number;
  institution_name: string;
  documents: Array<Document & { institution?: Institution }>;
}

type LaravelData<T> = { data: T };

class DocumentCollectionService {
  private basePath = '/document-collections';

  async getAll(): Promise<DocumentCollection[]> {
    const response = await api.get<{ success: boolean; data: DocumentCollection[] }>(this.basePath);
    return (response as { success: boolean; data: DocumentCollection[] }).data ?? [];
  }

  async getById(folderId: number): Promise<FolderWithDocuments> {
    const response = await api.get<{
      success: boolean;
      data: { folder: DocumentCollection; institutions?: InstitutionDocumentGroup[]; documents?: Document[] };
    }>(
      `${this.basePath}/${folderId}`,
      undefined,
      { cache: false }
    );

    const backendData = (response as LaravelData<{
      folder: DocumentCollection;
      institutions?: InstitutionDocumentGroup[];
      documents?: Document[];
    }>).data;

    let documents: Array<Document & { institution?: Institution }> = [];
    if (Array.isArray(backendData.institutions)) {
      documents = backendData.institutions.flatMap(inst =>
        (inst.documents || []).map(doc => ({
          ...doc,
          institution: doc.institution ?? { id: inst.institution_id, name: inst.institution_name, level: '4' as const },
        }))
      );
    } else if (Array.isArray(backendData.documents)) {
      documents = backendData.documents;
    }

    return {
      ...(backendData.folder ?? ({} as DocumentCollection)),
      documents,
    };
  }

  async getByIdPaginated(
    folderId: number,
    params?: {
      page?: number;
      per_page?: number;
      search?: string;
      region_id?: number;
      sector_id?: number;
      file_type?: string;
      sort_by?: string;
      sort_direction?: string;
    }
  ): Promise<{
    data: {
      folder: DocumentCollection;
      institutions: InstitutionDocumentGroup[];
    };
    meta: {
      current_page: number;
      per_page: number;
      total_institutions: number;
      total_pages: number;
      total_documents: number;
      total_size: number;
      from: number;
      to: number;
    };
  }> {
    const response = await api.get(`${this.basePath}/${folderId}`, params);
    return response as {
      data: { folder: DocumentCollection; institutions: InstitutionDocumentGroup[] };
      meta: {
        current_page: number; per_page: number; total_institutions: number;
        total_pages: number; total_documents: number; total_size: number; from: number; to: number;
      };
    };
  }

  async createRegionalFolders(data: CreateRegionalFoldersRequest): Promise<DocumentCollection[]> {
    const response = await api.post<{ success: boolean; data: DocumentCollection[] }>(
      `${this.basePath}/regional`,
      data
    );
    return (response as { success: boolean; data: DocumentCollection[] }).data;
  }

  async update(folderId: number, data: UpdateFolderRequest): Promise<DocumentCollection> {
    const response = await api.put<{ success: boolean; data: DocumentCollection }>(
      `${this.basePath}/${folderId}`,
      data
    );
    return (response as { success: boolean; data: DocumentCollection }).data;
  }

  async delete(folderId: number, data?: DeleteFolderRequest): Promise<void> {
    await api.delete(`${this.basePath}/${folderId}`, { data });
  }

  async toggleLock(folderId: number): Promise<DocumentCollection> {
    const response = await api.post<{ success: boolean; data: DocumentCollection }>(
      `${this.basePath}/${folderId}/toggle-lock`
    );
    return (response as { success: boolean; data: DocumentCollection }).data;
  }

  async bulkDownload(folderId: number): Promise<Blob> {
    const response = await api.get<Blob>(
      `${this.basePath}/${folderId}/download`,
      undefined,
      { responseType: 'blob' }
    );
    return (response as LaravelData<Blob>).data || (response as Blob);
  }

  async getAuditLogs(folderId: number): Promise<FolderAuditLog[]> {
    const response = await api.get<{ success: boolean; data: FolderAuditLog[] }>(
      `${this.basePath}/${folderId}/audit-logs`
    );
    return (response as { success: boolean; data: FolderAuditLog[] }).data;
  }

  async uploadDocument(folderId: number, file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(
      `${this.basePath}/${folderId}/documents`,
      formData
    );
    return (response as LaravelData<Document>).data;
  }

  async deleteDocument(documentId: number): Promise<void> {
    await api.delete(`/documents/${documentId}`);
  }

  async downloadDocument(documentId: number): Promise<Blob> {
    const response = await api.get<Blob>(
      `/documents/${documentId}/download`,
      undefined,
      { responseType: 'blob' }
    );

    const blob = (response as LaravelData<Blob>).data || (response as Blob);

    if (!(blob instanceof Blob)) {
      throw new Error('Invalid file response from server');
    }

    return blob;
  }

  downloadFile(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export default new DocumentCollectionService();
