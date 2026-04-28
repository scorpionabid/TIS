import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import documentCollectionService from '../../services/documentCollectionService';
import { institutionService } from '../../services/institutions';
import { userService } from '../../services/users';
import { X, Folder, Building2, Users, Target, Search, User as UserIcon } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Folder className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Yeni Qovluq Yarat</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
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

        {/* Footer - Actions (Fixed at bottom) */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              İmtina
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !folderName.trim() || (targetInstitutions.length === 0 && targetUsersConfig.length === 0)}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Yaradılır...' : 'Yarat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateFolderDialog;

