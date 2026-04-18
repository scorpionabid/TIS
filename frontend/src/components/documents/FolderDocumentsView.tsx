import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import documentCollectionService from '../../services/documentCollectionService';
import type { DocumentCollection, Document, FolderWithDocuments } from '../../types/documentCollection';
import {
  X,
  FileText,
  Download,
  Building2,
  User,
  Calendar,
  Upload,
  Trash2,
  Archive,
  Search,
  ChevronRight,
  Filter,
  FileIcon,
  Clock
} from 'lucide-react';

type FolderWithTargets = DocumentCollection & {
  target_institutions?: Array<{ id: number }>;
  targetInstitutions?: Array<{ id: number }>;
};
import { FileUploadZone } from './FileUploadZone';
import { formatFileSize as utilFormatFileSize, getFileIcon } from '../../utils/fileValidation';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [expandedInstitutions, setExpandedInstitutions] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data: FolderWithDocuments = await documentCollectionService.getById(folder.id);
      setDocuments(data.documents || []);
    } catch (err) {
      logger.error('Error loading documents', err);
      setError('Sənədlər yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  }, [folder.id]);

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
      day: 'numeric'
    });
  };

  const isNew = (dateString: string): boolean => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 2;
  };

  const getFileStyle = (mimeType: string) => {
    if (mimeType.includes('pdf')) return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', icon: '📄' };
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', icon: '📊' };
    if (mimeType.includes('word') || mimeType.includes('document')) return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: '📝' };
    if (mimeType.startsWith('image/')) return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', icon: '🖼️' };
    return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', icon: '📁' };
  };

  const handleDownload = async (doc: Document) => {
    try {
      const blob = await documentCollectionService.downloadDocument(doc.id);
      const fileName = doc.file_name || doc.original_filename || 'document';
      documentCollectionService.downloadFile(blob, fileName);
    } catch (err: unknown) {
      logger.error('Error downloading document', err);
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = apiErr?.response?.data?.message ?? apiErr?.message ?? 'Sənəd yüklənərkən xəta baş verdi';
      alert(errorMessage);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      await documentCollectionService.uploadDocument(folder.id, file);
      await loadDocuments();
      setShowUploadZone(false);
    } catch (error: unknown) {
      logger.error('File upload failed', error);
      const errorMessage = error instanceof Error ? error.message : 'Naməlum xəta';
      alert(`Fayl yüklənə bilmədi: ${errorMessage}`);
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!confirm('Bu sənədi silmək istədiyinizdən əminsiniz?')) {
      return;
    }

    try {
      await documentCollectionService.deleteDocument(documentId);
      await loadDocuments();
    } catch (err: unknown) {
      logger.error('Error deleting document', err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      alert(apiErr?.response?.data?.message ?? 'Sənəd silinərkən xəta baş verdi');
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
    } catch (err: unknown) {
      logger.error('Error bulk downloading', err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      alert(apiErr?.response?.data?.message ?? 'ZIP faylı yaradılarkən xəta baş verdi');
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

  const canUpload = () => {
    if (!user || !folder) return false;
    const userInstitutionId = user.institution?.id;
    if (!userInstitutionId) return false;
    const folderWithTargets = folder as FolderWithTargets;
    const targetInstitutions = folderWithTargets.target_institutions ?? folderWithTargets.targetInstitutions ?? [];
    return targetInstitutions.some(inst => inst.id === userInstitutionId);
  };

  const canDelete = (document: Document) => {
    if (!user) return false;

    // Ownership check: supports both uploaded_by (backend standard) and user_id (legacy)
    const ownerId = document.uploaded_by ?? document.user_id;
    const isOwner = ownerId === user.id;

    // Role check: superadmins can delete any document
    const isSuperAdmin = user.role === 'superadmin';

    return isOwner || isSuperAdmin;
  };

  const filteredDocuments = useMemo(() => {
    let result = documents;

    if (fileTypeFilter !== 'all') {
      result = result.filter(doc => doc.mime_type.includes(fileTypeFilter));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(doc => {
        const fileName = (doc.file_name || doc.original_filename || '').toLowerCase();
        const institutionName = (doc.institution?.name || '').toLowerCase();
        const uploaderName = (doc.uploader?.name || doc.user?.name || '').toLowerCase();
        return fileName.includes(query) || institutionName.includes(query) || uploaderName.includes(query);
      });
    }

    return result;
  }, [documents, searchQuery, fileTypeFilter]);

  const groupedDocuments = useMemo(() => {
    return filteredDocuments.reduce((acc, doc) => {
      const institutionName = doc.institution?.name || 'Naməlum';
      if (!acc[institutionName]) acc[institutionName] = [];
      acc[institutionName].push(doc);
      return acc;
    }, {} as Record<string, Document[]>);
  }, [filteredDocuments]);

  const statistics = useMemo(() => {
    const totalSize = filteredDocuments.reduce((sum, doc) => sum + doc.file_size, 0);
    const institutionCount = Object.keys(groupedDocuments).length;
    return {
      totalDocuments: filteredDocuments.length,
      totalSize,
      institutionCount,
    };
  }, [filteredDocuments, groupedDocuments]);

  const isSchoolAdmin = user?.role === 'schooladmin';

  const fileTypes = [
    { id: 'all', label: 'Hamısı', icon: <Filter size={14} /> },
    { id: 'pdf', label: 'PDF', icon: <FileText size={14} className="text-red-500" /> },
    { id: 'spreadsheet', label: 'Excel', icon: <FileIcon size={14} className="text-green-500" /> },
    { id: 'word', label: 'Word', icon: <FileText size={14} className="text-blue-500" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Archive className="text-blue-600" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{folder.name}</h2>
              </div>
              <p className="text-gray-500 text-sm pl-10">{folder.description || 'Qovluq sənədləri'}</p>

              <div className="flex items-center gap-4 mt-4 pl-10">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 transition-colors">
                  <FileText size={14} className="mr-1" /> {statistics.totalDocuments} sənəd
                </Badge>
                {!isSchoolAdmin && (
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100">
                    <Building2 size={14} className="mr-1" /> {statistics.institutionCount} müəssisə
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">
                  <Clock size={14} className="mr-1" /> {formatFileSize(statistics.totalSize)}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <AnimatePresence>
                {canUpload() && (
                  <Button
                    onClick={() => setShowUploadZone(!showUploadZone)}
                    variant={showUploadZone ? "outline" : "default"}
                    className="rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    <Upload size={18} className="mr-2" />
                    {showUploadZone ? 'Ləğv et' : 'Yeni Sənəd'}
                  </Button>
                )}
              </AnimatePresence>

              {documents.length > 0 && (
                <Button
                  onClick={handleBulkDownload}
                  disabled={bulkDownloading}
                  variant="outline"
                  className="rounded-xl border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 transition-all active:scale-95"
                >
                  <Archive size={18} className="mr-2" />
                  {bulkDownloading ? 'Hazırlanır...' : 'Toplu Yüklə'}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Sənəd, müəssisə və ya istifadəçi adına görə axtar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {fileTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setFileTypeFilter(type.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap border ${
                    fileTypeFilter === type.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#fafafa]">
          {showUploadZone && canUpload() && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6"
            >
              <FileUploadZone onUpload={handleUpload} />
            </motion.div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
                  <div className="flex gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><X size={18}/></div>
              {error}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200"
            >
              <div className="inline-block p-6 bg-gray-50 rounded-full mb-4">
                <FileText size={48} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Sənəd tapılmadı</h3>
              <p className="text-gray-500 mt-2 max-w-xs mx-auto">Axtarış meyarlarını dəyişərək və ya yeni sənəd yükləyərək davam edə bilərsiniz.</p>
            </motion.div>
          ) : isSchoolAdmin ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocuments.map((doc) => {
                const style = getFileStyle(doc.mime_type);
                return (
                  <motion.div
                    layout
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-lg hover:shadow-blue-500/5 transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`h-14 w-14 rounded-2xl ${style.bg} ${style.text} flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform`}>
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0 pr-10">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 truncate" title={doc.file_name || doc.original_filename}>
                            {doc.file_name || doc.original_filename}
                          </h3>
                          {isNew(doc.created_at) && (
                            <Badge className="bg-green-500 text-[10px] h-4 px-1 rounded-sm uppercase tracking-wider font-bold">Yeni</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> {formatDate(doc.created_at)}
                          </span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span>{formatFileSize(doc.file_size)}</span>
                        </div>
                      </div>
                      <div className="absolute right-4 top-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                          title="Yüklə"
                        >
                          <Download size={16} />
                        </button>
                        {canDelete(doc) && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedDocuments).map(([institutionName, docs]) => {
                const isExpanded = expandedInstitutions.has(institutionName);
                const institutionSize = docs.reduce((sum, doc) => sum + doc.file_size, 0);

                return (
                  <motion.div
                    layout
                    key={institutionName}
                    className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <button
                      onClick={() => toggleInstitution(institutionName)}
                      className={`w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors ${isExpanded ? 'bg-gray-50/50 border-b border-gray-100' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-blue-600 text-white rotate-90' : 'bg-gray-100 text-gray-500'}`}>
                          <ChevronRight size={20} />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-gray-900">{institutionName}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{docs.length} sənəd · {formatFileSize(institutionSize)}</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        {docs.slice(0, 3).map(d => (
                           <div key={d.id} className={`w-8 h-8 rounded-lg ${getFileStyle(d.mime_type).bg} flex items-center justify-center text-sm border border-gray-50`}>
                             {getFileStyle(d.mime_type).icon}
                           </div>
                        ))}
                        {docs.length > 3 && <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] text-gray-400">+{docs.length - 3}</div>}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                          {docs.map((doc) => {
                            const style = getFileStyle(doc.mime_type);
                            return (
                              <div
                                key={doc.id}
                                className="group bg-gray-50/30 border border-gray-100 rounded-2xl p-4 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all relative overflow-hidden"
                              >
                                <div className="flex items-start gap-4">
                                  <div className={`h-12 w-12 rounded-xl ${style.bg} ${style.text} flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform`}>
                                    {style.icon}
                                  </div>
                                  <div className="flex-1 min-w-0 pr-8">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <h4 className="font-semibold text-gray-900 truncate text-sm" title={doc.file_name || doc.original_filename}>
                                        {doc.file_name || doc.original_filename}
                                      </h4>
                                      {isNew(doc.created_at) && <Badge className="bg-green-500 text-[8px] h-3 px-1 rounded-sm uppercase tracking-widest font-bold">Yeni</Badge>}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-400 font-medium">
                                      <span className="flex items-center gap-1 uppercase tracking-tight"><User size={10} /> {doc.uploader?.name || 'N/A'}</span>
                                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                      <span className="flex items-center gap-1 uppercase tracking-tight"><Calendar size={10} /> {formatDate(doc.created_at)}</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleDownload(doc)}
                                      className="p-1.5 bg-white text-gray-400 rounded-lg hover:bg-green-50 hover:text-green-600 border border-gray-100 transition-all shadow-sm"
                                      title="Yüklə"
                                    >
                                      <Download size={14} />
                                    </button>
                                    {canDelete(doc) && (
                                      <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="p-1.5 bg-white text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 border border-gray-100 transition-all shadow-sm"
                                        title="Sil"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            {!isSchoolAdmin && filteredDocuments.length > 0 && Object.keys(groupedDocuments).length > 1 && (
              <div className="flex bg-white p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => setExpandedInstitutions(new Set(Object.keys(groupedDocuments)))}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Hamısını Aç
                </button>
                <div className="w-px h-4 bg-gray-200 self-center mx-1" />
                <button
                  onClick={() => setExpandedInstitutions(new Set())}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Hamısını Bağla
                </button>
              </div>
            )}
            {searchQuery && (
              <p className="text-xs font-medium text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                <strong className="text-blue-600">{filteredDocuments.length}</strong> / {documents.length} nəticə tapıldı
              </p>
            )}
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-gray-500 hover:text-gray-900 rounded-xl"
          >
            Bağlamaq
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default FolderDocumentsView;
