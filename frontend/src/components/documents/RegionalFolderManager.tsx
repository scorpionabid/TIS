import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import documentCollectionService from '../../services/documentCollectionService';
import type { DocumentCollection } from '../../types/documentCollection';
import { Folder, FolderArchive, Plus, Edit, Trash2, Download, History, FileText, Search, Clock, Users, LayoutGrid, Building2, MapPin, GraduationCap, Lock, Unlock, User as UserIcon } from 'lucide-react';
import CreateFolderDialog from './CreateFolderDialog';
import { Badge } from '@/components/ui/badge';
import RenameFolderDialog from './RenameFolderDialog';
import DeleteFolderDialog from './DeleteFolderDialog';
import FolderDocumentsViewOptimizedV2 from './FolderDocumentsViewOptimizedV2';
import AuditLogViewer from './AuditLogViewer';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { canUserCreateRegionalFolder, canUserManageFolder } from '@/utils/permissions';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const getFolderTabLevel = (
  folder: DocumentCollection, 
  userInstitutionId: number | null
): number => {
  const fOwnerId = folder.owner_institution_id || folder.institution_id;
  const uInstId = userInstitutionId;
  
  // Strict ownership check using Number() to avoid type mismatch
  const isOwner = uInstId && Number(fOwnerId) === Number(uInstId);
  const fOwnerLevel = Number(folder.owner_institution_level) || 2;
  
  if (isOwner) {
    // Creator view: categorize by target level
    const targets = folder.target_institutions || folder.targetInstitutions || [];
    
    // If no specific targets, stay in own level's tab
    if (targets.length === 0) return fOwnerLevel;
    
    const targetLevels = targets.map((t: any) => Number(t.level));
    
    // Logic: If I create for schools, show in Schools tab. 
    // If I create for sectors, show in Sectors tab.
    // If I create for region/super, show in Region tab.
    if (targetLevels.includes(4)) return 4;
    if (targetLevels.includes(3)) return 3;
    if (targetLevels.includes(1) || targetLevels.includes(2)) return 2;
    
    return fOwnerLevel;
  } else {
    // Recipient view: ALWAYS categorize by the source (owner) level
    // This ensures Region's folders stay in "Region" tab for Sektor/School admins
    return fOwnerLevel;
  }
};


const RegionalFolderManager: React.FC = () => {
  const { currentUser: user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedFolder, setSelectedFolder] = useState<DocumentCollection | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'comfortable' | 'compact'>('compact');


  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDocumentsView, setShowDocumentsView] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  const [folderSearch, setFolderSearch] = useState('');

  const userInstitutionId = useMemo(() => {
    return (user as any)?.institution?.id ?? (user as any)?.institution_id;
  }, [user]);

  const {
    data: folders = [],
    isLoading,
    isFetching,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['document-collections', { filtered: false }],
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
    return 'Qovluqlar yüklənərkən xəta baş verdi';
  }, [queryError]);

  const counts = useMemo(() => {
    return {
      all: folders.length,
      region: folders.filter(f => {
        const tabLevel = getFolderTabLevel(f, userInstitutionId);
        return tabLevel === 1 || tabLevel === 2;
      }).length,
      sector: folders.filter(f => getFolderTabLevel(f, userInstitutionId) === 3).length,
      school: folders.filter(f => getFolderTabLevel(f, userInstitutionId) === 4).length,
    };
  }, [folders, userInstitutionId]);

  const filteredFolders = useMemo(() => {
    // 1. Level-based filtering (Tab selection)
    let baseFolders = folders;
    
    if (activeTab === 'all') {
      baseFolders = folders;
    } else if (activeTab === 'region') {
      baseFolders = folders.filter(f => {
        const tabLevel = getFolderTabLevel(f, userInstitutionId);
        return tabLevel === 1 || tabLevel === 2;
      });
    } else if (activeTab === 'sector') {
      baseFolders = folders.filter(f => getFolderTabLevel(f, userInstitutionId) === 3);
    } else if (activeTab === 'school') {
      baseFolders = folders.filter(f => getFolderTabLevel(f, userInstitutionId) === 4);
    }

    // 2. Search-based filtering
    if (!folderSearch.trim()) {
      return baseFolders;
    }

    const term = folderSearch.toLowerCase();

    return baseFolders.filter((folder) => {
      const nameMatch = folder.name?.toLowerCase().includes(term);
      const ownerMatch = folder.ownerInstitution?.name?.toLowerCase().includes(term);
      return Boolean(nameMatch || ownerMatch);
    });
  }, [folders, folderSearch, activeTab]);

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
    await queryClient.invalidateQueries({ queryKey: ['document-collections', { filtered: false }] });
  };

  const handleFolderCreated = async () => {
    await invalidateFolders();
    setShowCreateDialog(false);
    toast({
      title: 'Qovluq yaradıldı',
      description: 'Yeni qovluq siyahıya əlavə olundu.'
    });
  };

  const handleFolderRenamed = async () => {
    await invalidateFolders();
    setShowRenameDialog(false);
    setSelectedFolder(null);
    toast({
      title: 'Qovluq yeniləndi',
      description: 'Qovluq məlumatları uğurla saxlanıldı.'
    });
  };

  const handleFolderDeleted = async () => {
    await invalidateFolders();
    setShowDeleteDialog(false);
    setSelectedFolder(null);
    toast({
      title: 'Qovluq silindi',
      description: 'Qovluq və əlaqəli sənədlər silindi.'
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

  const handleToggleLock = async (folder: DocumentCollection) => {
    // Snapshot current state for rollback
    const previousFolders = queryClient.getQueryData<DocumentCollection[]>(['document-collections']);

    // Optimistically update UI
    if (previousFolders) {
      queryClient.setQueryData(['document-collections', { filtered: false }], previousFolders.map(f => 
        f.id === folder.id ? { ...f, is_locked: !f.is_locked } : f
      ));
    }

    try {
      await documentCollectionService.toggleLock(folder.id);
      toast({
        title: folder.is_locked ? 'Qovluq açıldı' : 'Qovluq bloklandı',
        description: `"${folder.name}" qovluğu uğurla ${folder.is_locked ? 'açıldı' : 'bloklandı'}.`,
      });
      // Silent refetch to sync
      queryClient.invalidateQueries({ queryKey: ['document-collections', { filtered: false }] });
    } catch (err: any) {
      // Rollback on failure
      if (previousFolders) {
        queryClient.setQueryData(['document-collections'], previousFolders);
      }
      toast({
        title: 'Xəta baş verdi',
        description: err.response?.data?.message || 'Əməliyyat yerinə yetirilə bilmədi',
        variant: 'destructive',
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

  const currentInstitutionFoldersCount = useMemo(() => {
    if (!userInstitutionId) return 0;
    return folders.filter(f => f.owner_institution_id === userInstitutionId).length;
  }, [folders, userInstitutionId]);

  // Wait for user to load from AuthContext
  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4 text-gray-600">İstifadəçi məlumatları yüklənir...</p>
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
      {/* Toolbar Row: Search on left, Hierarchy Chips on right */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-0">
        {/* Left side: Search */}
        <div className="flex flex-1 items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
            <input
              type="text"
              placeholder="Qovluq axtarın..."
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
            />
          </div>
          {isFetching && (
            <span className="text-[10px] text-blue-600 animate-pulse font-medium">Yenilənir...</span>
          )}
        </div>

        {/* Right side: View Mode, Hierarchy Level Chips and Create Button */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md">
            <button
              onClick={() => setViewMode('comfortable')}
              className={`p-1.5 rounded transition-all ${viewMode === 'comfortable' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Geniş görünüş"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded transition-all ${viewMode === 'compact' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Yığcam görünüş"
            >
              <LayoutGrid size={14} className="scale-75" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 border-l pl-4 h-6 border-gray-200">
            {[
              { value: 'all', label: 'Hamısı', count: counts.all, icon: LayoutGrid },
              { value: 'region', label: 'Region', count: counts.region, icon: Building2 },
              { value: 'sector', label: 'Sektor', count: counts.sector, icon: MapPin },
              { value: 'school', label: 'Məktəblər', count: counts.school, icon: GraduationCap },
            ].map(level => (
              <button
                key={level.value}
                onClick={() => setActiveTab(level.value)}
                className={`h-7 flex items-center gap-1.5 px-2.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap border ${
                  activeTab === level.value 
                    ? 'bg-primary text-white border-primary shadow-sm' 
                    : 'bg-white text-muted-foreground border-gray-200 hover:bg-gray-50'
                }`}
              >
                <level.icon className="h-3 w-3" />
                {level.label}
                <span className={`ml-0.5 opacity-70`}>({level.count})</span>
              </button>
            ))}
          </div>

          {showCreateButton && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="h-8 flex items-center gap-1.5 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium shadow-sm ml-auto lg:ml-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Yeni Qovluq
            </button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
        <TabsContent value={activeTab} className="mt-0">
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
              <p className="text-gray-600 mb-4">Hələ qovluq yaradılmayıb</p>
              {showCreateButton && (
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <Plus size={18} />
                  İlk qovluğu yarat
                </button>
              )}
            </div>
          ) : !hasFilteredFolders ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Search size={40} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Axtarışınıza uyğun qovluq tapılmadı</p>
              <button
                onClick={() => setFolderSearch('')}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Axtarışı sıfırla
              </button>
            </div>
          ) : (
            <div className={`grid gap-4 ${viewMode === 'comfortable' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5'}`}>
              {filteredFolders.map((folder) => {
                const documentCount = folder.documents_count ?? folder.documents?.length ?? 0;
                const targetInstitutions = folder.target_institutions || folder.targetInstitutions || [];
                const targetCount = targetInstitutions.length;
                const lastUpload = (folder as any)?.last_document_uploaded_at
                  ? formatDate((folder as any).last_document_uploaded_at)
                  : null;

                return (
                  <div
                    key={folder.id}
                    className={`bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow ${
                      viewMode === 'comfortable' ? 'p-6' : 'p-3'
                    }`}
                  >
                    <div className={`flex items-start justify-between ${viewMode === 'comfortable' ? 'mb-4' : 'mb-2'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <div className={`rounded-lg flex-shrink-0 transition-colors ${
                            viewMode === 'comfortable' ? 'p-3 bg-blue-100' : 'p-2 bg-indigo-50 group-hover:bg-indigo-100'
                          }`}>
                            {viewMode === 'comfortable' ? (
                              <Folder className="text-blue-600" size={24} />
                            ) : (
                              <FolderArchive className="text-indigo-600" size={18} />
                            )}
                          </div>
                          {folder.is_locked && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white p-0.5 rounded-full border-2 border-white">
                              <Lock size={10} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className={`font-semibold text-gray-900 truncate ${viewMode === 'comfortable' ? 'text-base' : 'text-sm'}`}>
                            {folder.name}
                          </h3>
                          {viewMode === 'comfortable' && folder.description && (
                            <p className="text-sm text-gray-500 line-clamp-1">{folder.description}</p>
                          )}
                        </div>
                      </div>

                      {folder.is_system_folder && viewMode === 'comfortable' && (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                          Sistem
                        </span>
                      )}
                    </div>

                    <div className={`${viewMode === 'comfortable' ? 'mb-4' : 'mb-3'}`}>
                      {viewMode === 'comfortable' ? (
                        <div className="space-y-4">
                          <div className="text-sm text-gray-600 space-y-1">
                            <p className="flex items-center gap-2">
                              <Building2 size={14} className="text-gray-400" />
                              Sahibi: {folder.owner_institution?.name || folder.ownerInstitution?.name || 'N/A'}
                            </p>
                            <p className="flex items-center gap-2">
                              <UserIcon size={14} className="text-gray-400" />
                              Yaradan: {folder.creator?.name || 'Məlum deyil'}
                            </p>
                          </div>

                          {/* Stats Section */}
                          <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-500">
                              <span>İcra Vəziyyəti (İştirakçı üzrə)</span>
                              <span className="text-blue-600">
                                {Math.round(((folder.participating_institutions_count || 0) / (targetCount || 1)) * 100)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-500" 
                                style={{ width: `${Math.min(100, ((folder.participating_institutions_count || 0) / (targetCount || 1)) * 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-gray-400">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDocumentsView(folder);
                                }}
                                className="text-blue-600 hover:underline font-medium"
                              >
                                {folder.participating_institutions_count || 0} / {targetCount} Müəssisə (Monitorinq)
                              </button>
                              <span>{documentCount} Sənəd</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <FileText size={10} /> {documentCount} fayl
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={10} /> {targetCount} hədəf
                            </span>
                          </div>
                          {/* Mini progress for compact */}
                          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-400" 
                              style={{ width: `${Math.min(100, (documentCount / (targetCount || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {viewMode === 'comfortable' && (
                        <div className="mt-3 space-y-1 text-xs text-gray-500">
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
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => openDocumentsView(folder)}
                        className={`flex items-center gap-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors ${
                          viewMode === 'comfortable' ? 'px-3 py-1.5 text-sm' : 'p-1.5 text-xs'
                        }`}
                      >
                        <FileText size={viewMode === 'comfortable' ? 16 : 14} />
                        {viewMode === 'comfortable' && 'Sənədlər'}
                      </button>

                      <button
                        onClick={() => handleBulkDownload(folder)}
                        className={`flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors ${
                          viewMode === 'comfortable' ? 'px-3 py-1.5 text-sm' : 'p-1.5 text-xs'
                        }`}
                      >
                        <Download size={viewMode === 'comfortable' ? 16 : 14} />
                        {viewMode === 'comfortable' && 'Yüklə'}
                      </button>

                      {canUserManageFolder(user, folder) && (
                        <>
                          <button
                            onClick={() => handleToggleLock(folder)}
                            className={`rounded-lg border transition-colors ${
                              viewMode === 'comfortable' ? 'p-2' : 'p-1.5'
                            } ${
                              folder.is_locked 
                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                            }`}
                            title={folder.is_locked ? 'Bloku aç' : 'Qovluğu blokla'}
                          >
                            {folder.is_locked 
                              ? <Unlock size={viewMode === 'comfortable' ? 18 : 14} /> 
                              : <Lock size={viewMode === 'comfortable' ? 18 : 14} />}
                          </button>

                          <button
                            onClick={() => openRenameDialog(folder)}
                            disabled={folder.is_locked}
                            className={`text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              viewMode === 'comfortable' ? 'p-2' : 'p-1.5'
                            }`}
                            title="Adını dəyiş"
                          >
                            <Edit size={viewMode === 'comfortable' ? 18 : 14} />
                          </button>

                          <button
                            onClick={() => openDeleteDialog(folder)}
                            disabled={folder.is_locked}
                            className={`text-red-600 hover:bg-red-50 rounded-lg border border-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              viewMode === 'comfortable' ? 'p-2' : 'p-1.5'
                            }`}
                            title="Sil"
                          >
                            <Trash2 size={viewMode === 'comfortable' ? 18 : 14} />
                          </button>

                          {viewMode === 'comfortable' && (
                            <button
                              onClick={() => openAuditLogs(folder)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                              <History size={16} />
                              Tarixçə
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateFolderDialog
          currentCount={currentInstitutionFoldersCount}
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
