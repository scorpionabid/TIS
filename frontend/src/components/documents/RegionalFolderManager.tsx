import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import documentCollectionService from '../../services/documentCollectionService';
import type { DocumentCollection } from '../../types/documentCollection';
import { Folder, Plus, Edit, Trash2, Download, History, FileText, Search, Clock, Users } from 'lucide-react';
import CreateFolderDialog from './CreateFolderDialog';
import RenameFolderDialog from './RenameFolderDialog';
import DeleteFolderDialog from './DeleteFolderDialog';
import FolderDocumentsViewOptimizedV2 from './FolderDocumentsViewOptimizedV2';
import AuditLogViewer from './AuditLogViewer';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { canUserCreateRegionalFolder, canUserManageFolder } from '@/utils/permissions';
import { useToast } from '@/hooks/use-toast';

const RegionalFolderManager: React.FC = () => {
  const { currentUser: user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedFolder, setSelectedFolder] = useState<DocumentCollection | null>(null);


  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDocumentsView, setShowDocumentsView] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  const [folderSearch, setFolderSearch] = useState('');

  const {
    data: folders = [],
    isLoading,
    isFetching,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['document-collections'],
    queryFn: async () => {
      const data = await documentCollectionService.getAll();
      return Array.isArray(data) ? data : [];
    },
    refetchOnWindowFocus: false,
    retry: 1
  });

  const queryErrorMessage = useMemo(() => {
    if (!queryError) return null;
    if (queryError instanceof Error) {
      return queryError.message;
    }
    return 'Folderlər yüklənərkən xəta baş verdi';
  }, [queryError]);

  const filteredFolders = useMemo(() => {
    if (!folderSearch.trim()) {
      return folders;
    }

    const term = folderSearch.toLowerCase();

    return folders.filter((folder) => {
      const nameMatch = folder.name?.toLowerCase().includes(term);
      const ownerMatch = folder.ownerInstitution?.name?.toLowerCase().includes(term);
      return Boolean(nameMatch || ownerMatch);
    });
  }, [folders, folderSearch]);

  const hasFolders = folders.length > 0;
  const hasFilteredFolders = filteredFolders.length > 0;

  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const invalidateFolders = async () => {
    await queryClient.invalidateQueries({ queryKey: ['document-collections'] });
  };

  const handleFolderCreated = async () => {
    await invalidateFolders();
    setShowCreateDialog(false);
    toast({
      title: 'Folder yaradıldı',
      description: 'Yeni folder siyahıya əlavə olundu.'
    });
  };

  const handleFolderRenamed = async () => {
    await invalidateFolders();
    setShowRenameDialog(false);
    setSelectedFolder(null);
    toast({
      title: 'Folder yeniləndi',
      description: 'Folder məlumatları uğurla saxlanıldı.'
    });
  };

  const handleFolderDeleted = async () => {
    await invalidateFolders();
    setShowDeleteDialog(false);
    setSelectedFolder(null);
    toast({
      title: 'Folder silindi',
      description: 'Folder və əlaqəli sənədlər silindi.'
    });
  };

  const handleBulkDownload = async (folder: DocumentCollection) => {
    try {
      const blob = await documentCollectionService.bulkDownload(folder.id);
      const fileName = `${folder.name}_${new Date().toISOString().split('T')[0]}.zip`;
      documentCollectionService.downloadFile(blob, fileName);
    } catch (err) {
      console.error('Error downloading folder:', err);
      const message =
        (err as any)?.response?.data?.message ||
        (err as Error)?.message ||
        'ZIP faylını hazırlamaq mümkün olmadı. Yenidən cəhd edin.';
      toast({
        title: 'Yükləmə alınmadı',
        description: message,
        variant: 'destructive'
      });
    }
  };

  const openRenameDialog = (folder: DocumentCollection) => {
    setSelectedFolder(folder);
    setShowRenameDialog(true);
  };

  const openDeleteDialog = (folder: DocumentCollection) => {
    setSelectedFolder(folder);
    setShowDeleteDialog(true);
  };

  const openDocumentsView = (folder: DocumentCollection) => {
    setSelectedFolder(folder);
    setShowDocumentsView(true);
  };

  const openAuditLogs = (folder: DocumentCollection) => {
    setSelectedFolder(folder);
    setShowAuditLogs(true);
  };

  // Wait for user to load from AuthContext
  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4 text-gray-600">User məlumatları yüklənir...</p>
      </div>
    );
  }

  const isInitialLoad = isLoading && folders.length === 0;

  const showCreateButton = canUserCreateRegionalFolder(user);

  return (
    <div className="space-y-6">
      {queryErrorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex flex-col gap-3">
          <span>{queryErrorMessage}</span>
          <button
            onClick={() => refetch()}
            className="self-start px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
          >
            Yenidən cəhd et
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Regional Folderlər</h2>
          <p className="text-gray-600 mt-1">Regionun məktəbləri üçün paylaşılan folderlər</p>
          {isFetching && (
            <p className="mt-2 text-sm text-blue-600">Yenilənir...</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
              placeholder="Folder və ya sahib institusiya axtarın..."
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-w-[260px]"
            />
          </div>

          {showCreateButton && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Plus size={20} />
              Yeni Folder Yarat
            </button>
          )}
        </div>
      </div>

      {/* Folders Grid */}
      {isInitialLoad ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 bg-gray-200 rounded w-20" />
                <div className="h-8 bg-gray-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : !hasFolders ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Folder size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">Hələ folder yaradılmayıb</p>
          {showCreateButton && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Plus size={18} />
              İlk folderi yarat
            </button>
          )}
        </div>
      ) : !hasFilteredFolders ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Search size={40} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Axtarışınıza uyğun folder tapılmadı</p>
          <button
            onClick={() => setFolderSearch('')}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Axtarışı sıfırla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFolders.map((folder) => {
            const documentCount = folder.documents_count ?? folder.documents?.length ?? 0;
            const targetInstitutions =
              Array.isArray((folder as any)?.target_institutions)
                ? (folder as any)?.target_institutions
                : Array.isArray((folder as any)?.targetInstitutions)
                ? (folder as any)?.targetInstitutions
                : [];
            const targetCount = Array.isArray(targetInstitutions) ? targetInstitutions.length : 0;
            const lastUpload = (folder as any)?.last_document_uploaded_at
              ? formatDate((folder as any).last_document_uploaded_at)
              : null;

            return (
              <div
                key={folder.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Folder className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{folder.name}</h3>
                      {folder.description && (
                        <p className="text-sm text-gray-500">{folder.description}</p>
                      )}
                    </div>
                  </div>

                  {folder.is_system_folder && (
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                      Sistem
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  <p>Sahibi: {folder.ownerInstitution?.name || 'N/A'}</p>
                  <p>Yüklənmə: {folder.allow_school_upload ? 'Aktiv' : 'Deaktiv'}</p>
                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <FileText size={14} />
                      <span>Sənəd sayı: {documentCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>Son yenilənmə: {formatDate(folder.updated_at)}</span>
                    </div>
                    {lastUpload && (
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>Son yükləmə: {lastUpload}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users size={14} />
                      <span>Hədəf müəssisə: {targetCount}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openDocumentsView(folder)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    <FileText size={16} />
                    Sənədlər
                  </button>

                  <button
                    onClick={() => handleBulkDownload(folder)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                  >
                    <Download size={16} />
                    Yüklə
                  </button>

                  {canUserManageFolder(user, folder) && (
                    <>
                      <button
                        onClick={() => openRenameDialog(folder)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                      >
                        <Edit size={16} />
                        Dəyişdir
                      </button>

                      <button
                        onClick={() => openDeleteDialog(folder)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                        Sil
                      </button>

                      <button
                        onClick={() => openAuditLogs(folder)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        <History size={16} />
                        Tarixçə
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateFolderDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleFolderCreated}
        />
      )}

      {showRenameDialog && selectedFolder && (
        <RenameFolderDialog
          folder={selectedFolder}
          onClose={() => {
            setShowRenameDialog(false);
            setSelectedFolder(null);
          }}
          onSuccess={handleFolderRenamed}
        />
      )}

      {showDeleteDialog && selectedFolder && (
        <DeleteFolderDialog
          folder={selectedFolder}
          onClose={() => {
            setShowDeleteDialog(false);
            setSelectedFolder(null);
          }}
          onSuccess={handleFolderDeleted}
        />
      )}

      {showDocumentsView && selectedFolder && (
        <FolderDocumentsViewOptimizedV2
          folder={selectedFolder}
          onClose={() => {
            setShowDocumentsView(false);
            setSelectedFolder(null);
          }}
        />
      )}

      {showAuditLogs && selectedFolder && (
        <AuditLogViewer
          folder={selectedFolder}
          onClose={() => {
            setShowAuditLogs(false);
            setSelectedFolder(null);
          }}
        />
      )}
    </div>
  );
};

export default RegionalFolderManager;
