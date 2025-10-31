import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useAuth } from '../../contexts/AuthContext';
import documentCollectionService from '../../services/documentCollectionService';
import type { DocumentCollection, Document } from '../../types/documentCollection';
import { X, FileText, Download, Building2, User, Calendar, Upload, Trash2, Archive, Search, ChevronDown, ChevronRight, Filter, SlidersHorizontal, Loader2 } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';
import { formatFileSize as utilFormatFileSize, getFileIcon } from '../../utils/fileValidation';

interface FolderDocumentsViewOptimizedProps {
  folder: DocumentCollection;
  onClose: () => void;
}

interface InstitutionGroup {
  institution_id: number;
  institution_name: string;
  institution_level?: string;
  parent_id?: number;
  document_count: number;
  total_size: number;
  last_upload: string;
  documents: Document[];
  isExpanded?: boolean;
}

interface PaginationMeta {
  current_page: number;
  per_page: number;
  total_institutions: number;
  total_pages: number;
  total_documents: number;
  total_size: number;
  from: number;
  to: number;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const FolderDocumentsViewOptimized: React.FC<FolderDocumentsViewOptimizedProps> = ({ folder, onClose }) => {
  const { currentUser: user } = useAuth();
  const [institutions, setInstitutions] = useState<InstitutionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'institution_name' | 'document_count' | 'last_upload' | 'total_size'>('institution_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // Expanded institutions tracking
  const [expandedInstitutions, setExpandedInstitutions] = useState<Set<number>>(new Set());

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: currentPage,
        per_page: 20,
        sort_by: sortBy,
        sort_direction: sortDirection,
      };

      if (debouncedSearchQuery) {
        params.search = debouncedSearchQuery;
      }

      if (fileTypeFilter) {
        params.file_type = fileTypeFilter;
      }

      const response = await documentCollectionService.getByIdPaginated(folder.id, params);

      setInstitutions(response.data.institutions || []);
      setMeta(response.meta);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Sənədlər yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchQuery, fileTypeFilter, folder.id, sortBy, sortDirection]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

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
      const blob = await documentCollectionService.downloadDocument(doc.id);
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
      await documentCollectionService.uploadDocument(folder.id, file);
      await loadDocuments();
    } catch (error: any) {
      console.error('File upload failed:', error);
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
    if (!meta || meta.total_documents === 0) {
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

  const toggleInstitution = (institutionId: number) => {
    const newExpanded = new Set(expandedInstitutions);
    if (newExpanded.has(institutionId)) {
      newExpanded.delete(institutionId);
    } else {
      newExpanded.add(institutionId);
    }
    setExpandedInstitutions(newExpanded);
  };

  const canUpload = () => {
    if (!user || !folder) return false;
    const userInstitutionId = (user as any)?.institution?.id || (user as any)?.institution_id;
    if (!userInstitutionId) return false;
    const targetInstitutions = (folder as any)?.target_institutions || (folder as any)?.targetInstitutions || [];
    return targetInstitutions.some((inst: any) => inst.id === userInstitutionId);
  };

  const canDelete = (document: Document) => {
    if (!user) return false;
    return document.user_id === user.id;
  };

  // Support both role (string) and roles (array) formats
  const userRoles = (user as any)?.roles || [];
  const userRole = (user as any)?.role;
  const isSchoolAdmin = userRole === 'schooladmin' ||
    (Array.isArray(userRoles) && userRoles.some((r: any) => r.name === 'schooladmin'));

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (meta && currentPage < meta.total_pages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Render pagination
  const renderPagination = () => {
    if (!meta || meta.total_pages <= 1) return null;

    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (meta.total_pages <= maxVisible) {
      for (let i = 1; i <= meta.total_pages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(meta.total_pages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < meta.total_pages - 2) {
        pages.push('...');
      }

      pages.push(meta.total_pages);
    }

    return (
      <div className="flex items-center gap-2 justify-center mt-4">
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Əvvəlki
        </button>

        {pages.map((page, index) =>
          typeof page === 'number' ? (
            <button
              key={index}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1 border rounded ${
                currentPage === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          ) : (
            <span key={index} className="px-2">
              {page}
            </span>
          )
        )}

        <button
          onClick={handleNextPage}
          disabled={currentPage === meta.total_pages}
          className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Növbəti
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900">{folder.name}</h2>
              <p className="text-gray-600 mt-1">{folder.description || 'Folder sənədləri'}</p>

              {/* Statistics */}
              {meta && (
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <FileText size={16} />
                    <strong>{meta.total_documents}</strong> sənəd
                  </span>
                  {!isSchoolAdmin && (
                    <span className="flex items-center gap-1">
                      <Building2 size={16} />
                      <strong>{meta.total_institutions}</strong> müəssisə
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Archive size={16} />
                    {formatFileSize(meta.total_size)}
                  </span>
                </div>
              )}
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

              {meta && meta.total_documents > 0 && (
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

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Müəssisə adına görə axtar..."
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

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  showFilters ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal size={20} />
                Filtrlər
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                <select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Bütün fayl növləri</option>
                  <option value="pdf">PDF</option>
                  <option value="word">Word</option>
                  <option value="excel">Excel</option>
                  <option value="image">Şəkil</option>
                  <option value="other">Digər</option>
                </select>

                <select
                  value={`${sortBy}-${sortDirection}`}
                  onChange={(e) => {
                    const [field, direction] = e.target.value.split('-');
                    setSortBy(field as any);
                    setSortDirection(direction as any);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="institution_name-asc">Ad (A-Z)</option>
                  <option value="institution_name-desc">Ad (Z-A)</option>
                  <option value="document_count-desc">Ən çox sənəd</option>
                  <option value="document_count-asc">Ən az sənəd</option>
                  <option value="last_upload-desc">Ən son yüklənən</option>
                  <option value="total_size-desc">Ən böyük həcm</option>
                </select>

                {(fileTypeFilter || searchQuery) && (
                  <button
                    onClick={() => {
                      setFileTypeFilter('');
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Filtri Sıfırla
                  </button>
                )}
              </div>
            )}
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
              <div className="text-center">
                <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Yüklənir...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : institutions.length === 0 && !showUploadZone ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                {searchQuery || fileTypeFilter ? 'Filtrə uyğun sənəd tapılmadı' : 'Bu folderdə hələ sənəd yoxdur'}
              </p>
            </div>
          ) : (
            <>
              {/* Institutions List */}
              <div className="space-y-4">
                {institutions.map((institution) => {
                  const isExpanded = expandedInstitutions.has(institution.institution_id);

                  return (
                    <div key={institution.institution_id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Institution Header - Clickable */}
                      <button
                        onClick={() => toggleInstitution(institution.institution_id)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown size={20} className="text-gray-600" />
                          ) : (
                            <ChevronRight size={20} className="text-gray-600" />
                          )}
                          <Building2 size={20} className="text-gray-600" />
                          <h3 className="font-semibold text-gray-900">{institution.institution_name}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <FileText size={16} />
                            {institution.document_count} sənəd
                          </span>
                          <span className="flex items-center gap-1">
                            <Archive size={16} />
                            {formatFileSize(institution.total_size)}
                          </span>
                        </div>
                      </button>

                      {/* Documents List - Collapsible */}
                      {isExpanded && (
                        <div className="p-4 space-y-3 bg-white">
                          {institution.documents.map((doc) => (
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

              {/* Pagination */}
              {renderPagination()}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {meta && institutions.length > 0 && (
                <>
                  <p className="text-sm text-gray-600">
                    <strong>{meta.from}</strong>-<strong>{meta.to}</strong> / {meta.total_institutions} müəssisə
                  </p>
                  {institutions.length > 1 && (
                    <>
                      <span className="text-gray-400">|</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const allIds = institutions.map(inst => inst.institution_id);
                            setExpandedInstitutions(new Set(allIds));
                          }}
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
                    </>
                  )}
                </>
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

export default FolderDocumentsViewOptimized;
