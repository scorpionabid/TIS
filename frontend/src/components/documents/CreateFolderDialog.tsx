import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import documentCollectionService from '../../services/documentCollectionService';
import { institutionService } from '../../services/institutions';
import { userService } from '../../services/users';
import { X, Folder, Building2, Users, Target, Search, User as UserIcon, FolderPlus } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { getUserInstitutionId, hasRole } from '@/utils/permissions';

interface CreateFolderDialogProps {
  currentCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface Institution {
  id: number;
  name: string;
  level: number;
  type?: string;
}

interface User {
  id: number;
  name: string;
  role?: string;
}

const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({ currentCount, onClose, onSuccess }) => {
  const { currentUser: user } = useAuth();
  const [selectedInstitution, setSelectedInstitution] = useState<number | null>(null);
  const [targetInstitutions, setTargetInstitutions] = useState<number[]>([]);
  const [targetUsersConfig, setTargetUsersConfig] = useState<Array<{id: number, can_delete: boolean, can_upload: boolean}>>([]);
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default: create all folder templates
  const [folderName, setFolderName] = useState('');

  // Load all institutions for targeting
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions-for-folders'],
    queryFn: () => institutionService.getAll({ per_page: 1000 }),
  });

  // Determine target roles based on current user role
  const targetRoles = useMemo(() => {
    if (hasRole(user, 'superadmin')) return 'all';
    if (hasRole(user, 'regionadmin')) return 'regionadmin,sektoradmin,regionoperator';
    if (hasRole(user, 'sektoradmin')) return 'sektoradmin,regionoperator';
    if (hasRole(user, 'regionoperator')) return 'regionoperator';
    if (hasRole(user, 'schooladmin') || hasRole(user, 'məktəbadmin')) return 'schooladmin,teacher,müəllim,operator';
    return '';
  }, [user]);

  // Load users for targeting
  const { data: usersResponse } = useQuery({
    queryKey: ['users-for-folders', targetRoles],
    queryFn: () => userService.getUsers({ role: targetRoles, per_page: 100 }),
    enabled: !!targetRoles,
  });

  const availableInstitutions: Institution[] = Array.isArray(institutionsResponse?.institutions)
    ? institutionsResponse.institutions
    : Array.isArray(institutionsResponse?.data?.data)
    ? institutionsResponse.data.data
    : Array.isArray(institutionsResponse?.data)
    ? institutionsResponse.data
    : [];

  const availableUsers: User[] = Array.isArray(usersResponse?.data) ? usersResponse.data : [];

  // Filter institutions based on search
  const filteredInstitutions = availableInstitutions.filter((institution: Institution) =>
    institution.name.toLowerCase().includes(institutionSearch.toLowerCase())
  );

  // Filter users based on search
  const filteredUsers = availableUsers.filter((u: User) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  useEffect(() => {
    const isSuperAdmin = hasRole(user, 'superadmin');
    if (!isSuperAdmin) {
      const institutionId = getUserInstitutionId(user);
      if (institutionId) {
        setSelectedInstitution(institutionId);
      }
    }
  }, [user]);

  // Helper functions for bulk selection
  const selectInstitutionsByLevel = (level: number) => {
    const levelIds = availableInstitutions
      .filter((inst: Institution) => inst.level === level)
      .map((inst: Institution) => inst.id);
    setTargetInstitutions(levelIds);
  };

  const selectInstitutionsByType = (filterFn: (inst: Institution) => boolean) => {
    const typeIds = availableInstitutions
      .filter(filterFn)
      .map((inst: Institution) => inst.id);
    setTargetInstitutions(typeIds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInstitution) {
      setError('Zəhmət olmasa institusiya seçin');
      return;
    }

    // Check limits
    const isSuperAdmin = hasRole(user, 'superadmin');
    if (!isSuperAdmin) {
      if ((hasRole(user, 'sektoradmin')) && currentCount >= 10) {
        setError('Sektorlar üçün maksimum 10 qovluq limiti dolmuşdur');
        return;
      }
      if ((hasRole(user, 'schooladmin') || hasRole(user, 'məktəbadmin')) && currentCount >= 5) {
        setError('Məktəblər üçün maksimum 5 qovluq limiti dolmuşdur');
        return;
      }
    }

    if (!folderName.trim()) {
      setError('Zəhmət olmasa qovluq adı daxil edin');
      return;
    }

    // Must have at least one target (institution or user)
    if (targetInstitutions.length === 0 && targetUsersConfig.length === 0) {
      setError('Zəhmət olmasa ən azı bir hədəf müəssisə və ya istifadəçi seçin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create single folder with custom name
      const templates = {
        [folderName.toLowerCase().replace(/\s+/g, '_')]: folderName
      };

      await documentCollectionService.createRegionalFolders({
        institution_id: selectedInstitution,
        folder_templates: templates,
        target_institutions: targetInstitutions,
        target_user_ids: targetUsersConfig,
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error creating folder:', err);
      setError(err.response?.data?.message || 'Qovluq yaradılarkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const canTargetUsers = !!targetRoles;

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="w-full sm:max-w-[780px] p-0 flex flex-col sm:flex-row h-[92vh] sm:h-[640px] rounded-2xl overflow-hidden border-0 shadow-2xl gap-0 [&>[data-dialog-close]]:hidden"
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >

        {/* ── Sidebar ── */}
        <div className="hidden sm:flex w-[190px] shrink-0 flex-col bg-gray-50 border-r">
          <div className="p-5 border-b">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white">
                <FolderPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800">Yeni Qovluq</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Yaradılır</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 py-3 px-2 space-y-1">
            {[
              { icon: Folder,   label: 'Ümumi',   color: 'bg-emerald-500' },
              { icon: Target,   label: 'Hədəf',   color: 'bg-blue-500'    },
              { icon: Users,    label: 'İstifadəçilər', color: 'bg-violet-500' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${color}`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                {label}
              </div>
            ))}
          </nav>
          <div className="px-5 pb-5">
            <div className="text-[10px] text-gray-400 bg-white border rounded-lg px-3 py-2">
              Bütün məlumatlar eyni formda tamamlanır
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Mobile header */}
          <div className="flex sm:hidden items-center justify-between px-4 py-3 border-b bg-gray-50 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                <FolderPlus className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm">Yeni Qovluq</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

        {/* Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Owner Institution Selection (SuperAdmin only) */}
          {hasRole(user, 'superadmin') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sahib İnstitusiya (Region/Sektor/Məktəb)
              </label>
              <select
                value={selectedInstitution || ''}
                onChange={(e) => setSelectedInstitution(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Seçin...</option>
                {availableInstitutions
                  .filter(inst => [2, 3, 4].includes(Number(inst.level)))
                  .map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} (Səviyyə {inst.level})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Folder Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qovluq Adı
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Məsələn: Cədvəl, Fəaliyyət Planı, Əmrlər..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Target Selection Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Hədəfləmə</h3>
            
            {/* Target Institutions Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Hədəf Müəssisələr
              </label>

              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Müəssisə adı ilə axtar..."
                  value={institutionSearch}
                  onChange={(e) => setInstitutionSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Bulk Selection Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTargetInstitutions(filteredInstitutions.map(inst => inst.id))}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                >
                  <Users size={16} />
                  Hamısını seç
                </button>

                <button
                  type="button"
                  onClick={() => setTargetInstitutions([])}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                >
                  <X size={16} />
                  Ləğv et
                </button>

                <button
                  type="button"
                  onClick={() => selectInstitutionsByLevel(3)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
                >
                  <Target size={16} />
                  Sektorlar ({availableInstitutions.filter(i => i.level === 3).length})
                </button>

                <button
                  type="button"
                  onClick={() => selectInstitutionsByType((inst: Institution) => {
                    const isSchoolType = ['secondary_school', 'vocational_school'].includes(inst.type || '');
                    return isSchoolType || (inst.level === 4 && inst.name?.toLowerCase().includes('məktəb'));
                  })}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                >
                  <Building2 size={16} />
                  Məktəblər ({availableInstitutions.filter(i => {
                    const isSchoolType = ['secondary_school', 'vocational_school'].includes(i.type || '');
                    return isSchoolType || (i.level === 4 && i.name?.toLowerCase().includes('məktəb'));
                  }).length})
                </button>
              </div>

              {/* Institutions List */}
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                {filteredInstitutions.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">Müəssisə tapılmadı</p>
                  </div>
                ) : (
                  filteredInstitutions.map((institution) => (
                    <div key={institution.id} className="flex items-center gap-2 py-1.5">
                      <input
                        type="checkbox"
                        id={`institution-${institution.id}`}
                        checked={targetInstitutions.includes(institution.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTargetInstitutions([...targetInstitutions, institution.id]);
                          } else {
                            setTargetInstitutions(targetInstitutions.filter(id => id !== institution.id));
                          }
                        }}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                      />
                      <label htmlFor={`institution-${institution.id}`} className="text-sm cursor-pointer flex-1">
                        {institution.name} <span className="text-xs text-gray-400">(Səviyyə {institution.level})</span>
                      </label>
                    </div>
                  ))
                )}
              </div>

              {/* Target Institutions Summary */}
              {targetInstitutions.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <span className="text-sm font-medium text-blue-800">
                    Seçilib: {targetInstitutions.length} müəssisə
                  </span>
                  <div className="flex gap-2 ml-auto">
                    {availableInstitutions.filter(i => targetInstitutions.includes(i.id) && i.level === 3).length > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                        {availableInstitutions.filter(i => targetInstitutions.includes(i.id) && i.level === 3).length} Sektor
                      </span>
                    )}
                    {availableInstitutions.filter(i => targetInstitutions.includes(i.id) && i.level === 4).length > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                        {availableInstitutions.filter(i => targetInstitutions.includes(i.id) && i.level === 4).length} Məktəb
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Target Users Selection */}
            {canTargetUsers && (
              <div className="space-y-3 pt-2">
                <label className="block text-sm font-medium text-gray-700">
                  Hədəf İstifadəçilər (Xüsusi giriş icazəsi)
                </label>

                {/* User Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="İstifadəçi adı ilə axtar..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Users List */}
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                  {availableUsers.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">Mövcud istifadəçi tapılmadı</p>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">Axtarışa uyğun istifadəçi tapılmadı</p>
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const config = targetUsersConfig.find(c => c.id === u.id);
                      const isSelected = !!config;

                      return (
                        <div key={u.id} className="flex flex-col gap-2 py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`user-${u.id}`}
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTargetUsersConfig([...targetUsersConfig, { id: u.id, can_delete: false, can_upload: true }]);
                                } else {
                                  setTargetUsersConfig(targetUsersConfig.filter(c => c.id !== u.id));
                                }
                              }}
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                            />
                            <label htmlFor={`user-${u.id}`} className="text-sm font-medium cursor-pointer flex-1 flex items-center gap-2">
                              <UserIcon size={14} className="text-gray-400" />
                              {u.name}
                            </label>
                          </div>
                          
                          {isSelected && (
                            <div className="ml-6 flex gap-4">
                              <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer hover:text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={config.can_upload}
                                  onChange={(e) => {
                                    setTargetUsersConfig(targetUsersConfig.map(c => 
                                      c.id === u.id ? { ...c, can_upload: e.target.checked } : c
                                    ));
                                  }}
                                  className="w-3 h-3 rounded border-gray-300"
                                />
                                Sənəd Yükləyə bilsin
                              </label>
                              <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer hover:text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={config.can_delete}
                                  onChange={(e) => {
                                    setTargetUsersConfig(targetUsersConfig.map(c => 
                                      c.id === u.id ? { ...c, can_delete: e.target.checked } : c
                                    ));
                                  }}
                                  className="w-3 h-3 rounded border-gray-300"
                                />
                                Sənəd Silə bilsin
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Qeyd:</strong> Seçilmiş müəssisələr və ya operatorlar bu qovluğu görə biləcək və sənəd yükləyə biləcək.
            </p>
          </div>
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t bg-white">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-all"
          >
            Ləğv et
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !folderName.trim() || (targetInstitutions.length === 0 && targetUsersConfig.length === 0)}
            className="px-6 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? 'Yaradılır...' : 'Qovluq Yarat'}
          </button>
        </div>
        </div>{/* end main content */}
      </DialogContent>
    </Dialog>
  );
};

export default CreateFolderDialog;

