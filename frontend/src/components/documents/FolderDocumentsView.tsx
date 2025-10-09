import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import documentCollectionService from '../../services/documentCollectionService';
import type { DocumentCollection, Document, FolderWithDocuments } from '../../types/documentCollection';
import { X, FileText, Download, Building2, User, Calendar, Upload, Trash2, Archive, Search, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedInstitutions, setExpandedInstitutions] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);

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

  const handleBulkDownload = async () => {
    if (documents.length === 0) {
      alert('Yükləmək üçün sənəd yoxdur');
      return;
    }

    try {
      setBulkDownloading(true);
      const blob = await documentCollectionService.bulkDownload(folder.id);
      const fileName = `${folder.name}_${new Date().toISOString().split('T')[0]}.zip`;
      documentCollectionService.downloadFile(blob, fileName);
    } catch (err: any) {
      console.error('Error bulk downloading:', err);
      alert(err.response?.data?.message || 'ZIP faylı yaradılarkən xəta baş verdi');
    } finally {
      setBulkDownloading(false);
    }
  };

  const toggleInstitution = (institutionName: string) => {
    const newExpanded = new Set(expandedInstitutions);
    if (newExpanded.has(institutionName)) {
      newExpanded.delete(institutionName);
    } else {
      newExpanded.add(institutionName);
    }
    setExpandedInstitutions(newExpanded);
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

  // Filtered documents based on search
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;

    const query = searchQuery.toLowerCase();
    return documents.filter(doc => {
      const fileName = (doc.file_name || doc.original_filename || '').toLowerCase();
      const institutionName = (doc.institution?.name || '').toLowerCase();
      const uploaderName = (doc.uploader?.name || doc.user?.name || '').toLowerCase();

      return fileName.includes(query) ||
             institutionName.includes(query) ||
             uploaderName.includes(query);
    });
  }, [documents, searchQuery]);

  // Group documents by institution (for SektorAdmin and RegionAdmin)
  const groupedDocuments = useMemo(() => {
    return filteredDocuments.reduce((acc, doc) => {
      const institutionName = doc.institution?.name || 'Naməlum';
      if (!acc[institutionName]) {
        acc[institutionName] = [];
      }
      acc[institutionName].push(doc);
      return acc;
    }, {} as Record<string, Document[]>);
  }, [filteredDocuments]);

  // Statistics
  const statistics = useMemo(() => {
    const totalSize = filteredDocuments.reduce((sum, doc) => sum + doc.file_size, 0);
    const institutionCount = Object.keys(groupedDocuments).length;

    return {
      totalDocuments: filteredDocuments.length,
      totalSize,
      institutionCount,
    };
  }, [filteredDocuments, groupedDocuments]);

  // Support both role (string) and roles (array) formats
  const userRoles = (user as any)?.roles || [];
  const userRole = (user as any)?.role;
  const isSchoolAdmin = userRole === 'schooladmin' ||
    (Array.isArray(userRoles) && userRoles.some((r: any) => r.name === 'schooladmin'));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900">{folder.name}</h2>
              <p className="text-gray-600 mt-1">{folder.description || 'Folder sənədləri'}</p>

              {/* Statistics */}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <FileText size={16} />
                  <strong>{statistics.totalDocuments}</strong> sənəd
                </span>
                {!isSchoolAdmin && (
                  <span className="flex items-center gap-1">
                    <Building2 size={16} />
                    <strong>{statistics.institutionCount}</strong> müəssisə
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Archive size={16} />
                  {formatFileSize(statistics.totalSize)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {canUpload() && (
                <button
                  onClick={() => setShowUploadZone(!showUploadZone)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload size={20} />
                  {showUploadZone ? 'Gizlət' : 'Yüklə'}
                </button>
              )}

              {documents.length > 0 && (
                <button
                  onClick={handleBulkDownload}
                  disabled={bulkDownloading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Archive size={20} />
                  {bulkDownloading ? 'Hazırlanır...' : 'Hamısını Yüklə (ZIP)'}
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

          {/* Search Bar */}
          {documents.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Sənəd, müəssisə və ya istifadəçi adına görə axtar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
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
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-3xl flex-shrink-0">
                        {getFileIcon(doc.mime_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-semibold text-gray-900 break-words"
                          title={doc.file_name || doc.original_filename}
                        >
                          {doc.file_name || doc.original_filename}
                        </h3>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(doc.created_at)}
                          </span>
                          <span>{formatFileSize(doc.file_size)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                        title="Sənədi yüklə"
                      >
                        <Download size={16} />
                        Yüklə
                      </button>
                      {canDelete(doc) && (
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                          title="Sənədi sil"
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
            // SektorAdmin/RegionAdmin view: Grouped by institution with collapse
            <div className="space-y-4">
              {Object.entries(groupedDocuments).map(([institutionName, docs]) => {
                const isExpanded = expandedInstitutions.has(institutionName);
                const institutionSize = docs.reduce((sum, doc) => sum + doc.file_size, 0);

                return (
                  <div key={institutionName} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Institution Header - Clickable */}
                    <button
                      onClick={() => toggleInstitution(institutionName)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown size={20} className="text-gray-600" />
                        ) : (
                          <ChevronRight size={20} className="text-gray-600" />
                        )}
                        <Building2 size={20} className="text-gray-600" />
                        <h3 className="font-semibold text-gray-900">{institutionName}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <FileText size={16} />
                          {docs.length} sənəd
                        </span>
                        <span className="flex items-center gap-1">
                          <Archive size={16} />
                          {formatFileSize(institutionSize)}
                        </span>
                      </div>
                    </button>

                    {/* Documents List - Collapsible */}
                    {isExpanded && (
                      <div className="p-4 space-y-3 bg-white">
                        {docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="text-3xl flex-shrink-0">
                                  {getFileIcon(doc.mime_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4
                                    className="font-semibold text-gray-900 break-words"
                                    title={doc.file_name || doc.original_filename}
                                  >
                                    {doc.file_name || doc.original_filename}
                                  </h4>
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
                              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                <button
                                  onClick={() => handleDownload(doc)}
                                  className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                                  title="Sənədi yüklə"
                                >
                                  <Download size={16} />
                                  Yüklə
                                </button>
                                {canDelete(doc) && (
                                  <button
                                    onClick={() => handleDelete(doc.id)}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                                    title="Sənədi sil"
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {!isSchoolAdmin && filteredDocuments.length > 0 && Object.keys(groupedDocuments).length > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setExpandedInstitutions(new Set(Object.keys(groupedDocuments)))}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Hamısını Aç
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={() => setExpandedInstitutions(new Set())}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Hamısını Bağla
                  </button>
                </div>
              )}
              {searchQuery && (
                <p className="text-sm text-gray-600">
                  <strong>{filteredDocuments.length}</strong> / {documents.length} sənəd tapıldı
                </p>
              )}
            </div>
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
