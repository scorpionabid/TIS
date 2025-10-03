import React, { useState, useEffect } from 'react';
import { Folder, FileText, Upload, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import documentCollectionService from '../services/documentCollectionService';
import type { DocumentCollection } from '../types/documentCollection';
import FolderDocumentsView from '../components/documents/FolderDocumentsView';

const MyDocuments: React.FC = () => {
  const { currentUser } = useAuth();
  const [folders, setFolders] = useState<DocumentCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<DocumentCollection | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadMyFolders();
    }
  }, [currentUser]);

  const loadMyFolders = async () => {
    try {
      setLoading(true);
      setError(null);
      const allFolders = await documentCollectionService.getAll();

      // Filter folders where user's institution is in targetInstitutions
      const userInstitutionId = (currentUser as any)?.institution?.id || (currentUser as any)?.institution_id;

      console.log('=== MyDocuments Debug ===');
      console.log('User:', currentUser);
      console.log('User Institution:', (currentUser as any)?.institution);
      console.log('User Institution ID:', userInstitutionId);
      console.log('All Folders:', allFolders);
      console.log('All Folders (raw JSON):', JSON.stringify(allFolders, null, 2));

      const myFolders = allFolders.filter((folder: any) => {
        const targetInstitutions = folder.targetInstitutions || [];
        console.log(`Folder "${folder.name}" has ${targetInstitutions.length} target institutions:`, targetInstitutions.map((i: any) => i.id));
        const isMatch = targetInstitutions.some((inst: any) => inst.id === userInstitutionId);
        console.log(`  Match: ${isMatch}`);
        return isMatch;
      });

      console.log('My Folders (filtered):', myFolders);
      setFolders(myFolders);
    } catch (err: any) {
      console.error('Error loading folders:', err);
      setError(err.response?.data?.message || 'Folderlər yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder: DocumentCollection) => {
    setSelectedFolder(folder);
  };

  const handleCloseFolderView = () => {
    setSelectedFolder(null);
    loadMyFolders(); // Reload to show updated document counts
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Folderlər yüklənir...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="text-red-900 font-semibold mb-1">Xəta</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mənim Fayllarım</h1>
            <p className="text-gray-600">
              Sizin üçün yaradılmış folderlər və sənədlər
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
            <Folder className="text-blue-600" size={20} />
            <span className="text-blue-900 font-semibold">{folders.length} Folder</span>
          </div>
        </div>
      </div>

      {/* Folders Grid */}
      {folders.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12">
          <div className="text-center">
            <Folder className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Hələ heç bir folder yoxdur
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Sizin üçün yaradılmış folder olmadıqda, bu siyahı boş olacaq.
              Regional adminlər tərəfindən folder yaradıldıqda burada görünəcək.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {folders.map((folder: any) => (
            <div
              key={folder.id}
              onClick={() => handleFolderClick(folder)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-primary transition-all cursor-pointer group"
            >
              {/* Folder Icon and Name */}
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Folder className="text-blue-600" size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate group-hover:text-primary transition-colors">
                    {folder.name}
                  </h3>
                  {folder.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {folder.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Folder Info */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-2">
                    <FileText size={16} />
                    Sənədlər
                  </span>
                  <span className="font-semibold text-gray-900">
                    {folder.documents_count || 0}
                  </span>
                </div>

                {folder.ownerInstitution && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Sahibi</span>
                    <span className="font-medium text-gray-900 truncate ml-2 max-w-[180px]">
                      {folder.ownerInstitution.name}
                    </span>
                  </div>
                )}

                {/* Upload indicator */}
                <div className="flex items-center gap-2 pt-2 mt-2 border-t border-gray-100">
                  <Upload size={14} className="text-green-600" />
                  <span className="text-xs text-green-700 font-medium">
                    Fayl yükləyə bilərsiniz
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Folder Documents Modal */}
      {selectedFolder && (
        <FolderDocumentsView
          folder={selectedFolder}
          onClose={handleCloseFolderView}
        />
      )}
    </div>
  );
};

export default MyDocuments;
