import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import documentCollectionService from '../../services/documentCollectionService';
import type { DocumentCollection, Document, FolderWithDocuments } from '../../types/documentCollection';
import { X, FileText, Download, Building2, User, Calendar, Upload, Trash2 } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';
import { formatFileSize as utilFormatFileSize, getFileIcon } from '../../utils/fileValidation';

interface FolderDocumentsViewProps {
  folder: DocumentCollection;
  onClose: () => void;
}

const FolderDocumentsView: React.FC<FolderDocumentsViewProps> = ({ folder, onClose }) => {
  const { currentUser: user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [folder.id]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data: FolderWithDocuments = await documentCollectionService.getById(folder.id);
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Sənədlər yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = async (doc: Document) => {
    try {
      // Use service to download document with proper authentication
      const blob = await documentCollectionService.downloadDocument(doc.id);

      // Download the blob as a file
      const fileName = doc.file_name || doc.original_filename || 'document';
      documentCollectionService.downloadFile(blob, fileName);
    } catch (err: any) {
      console.error('Error downloading document:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Sənəd yüklənərkən xəta baş verdi';
      alert(errorMessage);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      console.log('🔵 Starting file upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        folderId: folder.id,
      });

      await documentCollectionService.uploadDocument(folder.id, file);

      console.log('✅ File uploaded successfully');
      await loadDocuments();
    } catch (error: any) {
      console.error('❌ File upload failed:', {
        error: error.message,
        fullError: error,
      });
      alert(`Fayl yüklənə bilmədi: ${error.message}`);
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!confirm('Bu sənədi silmək istədiyinizdən əminsiniz?')) {
      return;
    }

    try {
      await documentCollectionService.deleteDocument(documentId);
      await loadDocuments();
      alert('Sənəd uğurla silindi');
    } catch (err: any) {
      console.error('Error deleting document:', err);
      alert(err.response?.data?.message || 'Sənəd silinərkən xəta baş verdi');
    }
  };

  // Check if user can upload to this folder
  const canUpload = () => {
    if (!user || !folder) return false;

    const userInstitutionId = (user as any)?.institution?.id || (user as any)?.institution_id;
    if (!userInstitutionId) return false;

    // Check if user's institution is in target institutions
    // Backend returns snake_case (target_institutions), not camelCase (targetInstitutions)
    const targetInstitutions = (folder as any)?.target_institutions || (folder as any)?.targetInstitutions || [];
    return targetInstitutions.some((inst: any) => inst.id === userInstitutionId);
  };

  // Check if user can delete a document (only own documents)
  const canDelete = (document: Document) => {
    if (!user) return false;
    return document.user_id === user.id;
  };

  // Group documents by institution (for SektorAdmin and RegionAdmin)
  const groupedDocuments = documents.reduce((acc, doc) => {
    const institutionName = doc.institution?.name || 'Naməlum';
    if (!acc[institutionName]) {
      acc[institutionName] = [];
    }
    acc[institutionName].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // Support both role (string) and roles (array) formats
  const userRoles = (user as any)?.roles || [];
  const userRole = (user as any)?.role;
  const isSchoolAdmin = userRole === 'schooladmin' ||
    (Array.isArray(userRoles) && userRoles.some((r: any) => r.name === 'schooladmin'));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{folder.name}</h2>
            <p className="text-gray-600 mt-1">{folder.description || 'Folder sənədləri'}</p>
          </div>
          <div className="flex items-center gap-3">
            {canUpload() && (
              <button
                onClick={() => setShowUploadZone(!showUploadZone)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                <Upload size={20} />
                {showUploadZone ? 'Sənədləri Gizlət' : 'Fayl Yüklə'}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Zone */}
          {showUploadZone && canUpload() && (
            <div className="mb-6">
              <FileUploadZone onUpload={handleUpload} />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : documents.length === 0 && !showUploadZone ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Bu folderdə hələ sənəd yoxdur</p>
            </div>
          ) : isSchoolAdmin ? (
            // School view: Simple list (they only see their own documents)
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-3xl">
                        {getFileIcon(doc.mime_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{doc.file_name}</h3>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(doc.created_at)}
                          </span>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span className="text-gray-400">{doc.mime_type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                      >
                        <Download size={16} />
                        Yüklə
                      </button>
                      {canDelete(doc) && (
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                          Sil
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // SektorAdmin/RegionAdmin view: Grouped by institution
            <div className="space-y-6">
              {Object.entries(groupedDocuments).map(([institutionName, docs]) => (
                <div key={institutionName} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-300">
                    <Building2 size={20} className="text-gray-600" />
                    <h3 className="font-semibold text-gray-900">{institutionName}</h3>
                    <span className="text-sm text-gray-500">({docs.length} sənəd)</span>
                  </div>
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ml-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="text-3xl">
                            {getFileIcon(doc.mime_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{doc.file_name}</h4>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <User size={14} />
                                {doc.uploader?.name || doc.user?.name || 'N/A'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {formatDate(doc.created_at)}
                              </span>
                              <span>{formatFileSize(doc.file_size)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleDownload(doc)}
                            className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                          >
                            <Download size={16} />
                            Yüklə
                          </button>
                          {canDelete(doc) && (
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                              Sil
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Cəmi: <strong>{documents.length}</strong> sənəd
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Bağla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderDocumentsView;
