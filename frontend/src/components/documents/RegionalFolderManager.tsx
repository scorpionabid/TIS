import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import documentCollectionService from '../../services/documentCollectionService';
import type { DocumentCollection } from '../../types/documentCollection';
import { Folder, Plus, Edit, Trash2, Download, History, FileText } from 'lucide-react';
import CreateFolderDialog from './CreateFolderDialog';
import RenameFolderDialog from './RenameFolderDialog';
import DeleteFolderDialog from './DeleteFolderDialog';
import FolderDocumentsView from './FolderDocumentsView';
import AuditLogViewer from './AuditLogViewer';

const RegionalFolderManager: React.FC = () => {
  const { currentUser: user } = useAuth();
  const [folders, setFolders] = useState<DocumentCollection[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<DocumentCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDocumentsView, setShowDocumentsView] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  const canManageFolder = (folder: DocumentCollection): boolean => {
    if (!user) return false;

    const userRoles = (user as any)?.roles || [];
    const userRole = (user as any)?.role;

    // SuperAdmin can manage all
    if (userRole === 'superadmin' || (Array.isArray(userRoles) && userRoles.some((r: any) => r.name === 'superadmin'))) {
      return true;
    }

    // RegionAdmin can manage their region's folders
    if (userRole === 'regionadmin' || (Array.isArray(userRoles) && userRoles.some((r: any) => r.name === 'regionadmin'))) {
      return folder.owner_institution_id === (user as any).institution_id;
    }

    return false;
  };

  const loadFolders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await documentCollectionService.getAll();
      setFolders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('❌ [RegionalFolderManager] Error loading folders:', err);
      setFolders([]); // Set empty array on error

      // Detailed error message
      if (err.message?.includes('Failed to fetch')) {
        setError('Backend-ə bağlantı uğursuz oldu. Backend işləyirmi yoxlayın.');
      } else if (err.response?.status === 401) {
        setError('İcazə rədd edildi. Zəhmət olmasa yenidən login olun.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Folderlər yüklənərkən xəta baş verdi');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const handleFolderCreated = () => {
    loadFolders();
    setShowCreateDialog(false);
  };

  const handleFolderRenamed = () => {
    loadFolders();
    setShowRenameDialog(false);
    setSelectedFolder(null);
  };

  const handleFolderDeleted = () => {
    loadFolders();
    setShowDeleteDialog(false);
    setSelectedFolder(null);
  };

  const handleBulkDownload = async (folder: DocumentCollection) => {
    try {
      const blob = await documentCollectionService.bulkDownload(folder.id);
      const fileName = `${folder.name}_${new Date().toISOString().split('T')[0]}.zip`;
      documentCollectionService.downloadFile(blob, fileName);
    } catch (err) {
      console.error('Error downloading folder:', err);
      alert('Yükləmə zamanı xəta baş verdi');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  // Debug button visibility - support both role (string) and roles (array)
  const userRoles = (user as any)?.roles || [];
  const userRole = (user as any)?.role;

  const showCreateButton = user && (
    // Check if user has roles array (from backend)
    (Array.isArray(userRoles) && userRoles.length > 0 && userRoles.some((r: any) => ['superadmin', 'regionadmin'].includes(r.name))) ||
    // Or check single role field (from User type)
    (userRole && ['superadmin', 'regionadmin'].includes(userRole))
  );


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Regional Folderlər</h2>
          <p className="text-gray-600 mt-1">Regionun məktəbləri üçün paylaşılan folderlər</p>
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

      {/* Folders Grid */}
      {folders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Folder size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Hələ folder yaradılmayıb</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
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

                {canManageFolder(folder) && (
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
          ))}
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
        <FolderDocumentsView
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
