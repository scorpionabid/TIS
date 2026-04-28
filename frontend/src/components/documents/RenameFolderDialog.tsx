import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import documentCollectionService from '../../services/documentCollectionService';
import { institutionService } from '../../services/institutions';
import { userService } from '../../services/users';
import type { DocumentCollection } from '../../types/documentCollection';
import { X, Edit, Building2, Users, Target, Search, User as UserIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { hasRole } from '@/utils/permissions';

interface RenameFolderDialogProps {
  folder: DocumentCollection;
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
}

const RenameFolderDialog: React.FC<RenameFolderDialogProps> = ({ folder, onClose, onSuccess }) => {
  const { currentUser: user } = useAuth();
  
  // Initial target IDs from folder object
  const initialInstitutionIds = useMemo(() => {
    const targets = folder.target_institutions || folder.targetInstitutions || [];
    return targets.map(t => typeof t === 'number' ? t : t.id);
  }, [folder]);

  const initialUsersConfig = useMemo(() => {
    const targets = folder.targetUsers || (folder as any).target_users || [];
    return targets.map((t: any) => ({
      id: typeof t === 'number' ? t : t.id,
      can_delete: t.pivot?.can_delete ?? false,
      can_upload: t.pivot?.can_upload ?? true,
    }));
  }, [folder]);

  const [name, setName] = useState(folder.name);
  const [description, setDescription] = useState(folder.description || '');
  const [allowUpload, setAllowUpload] = useState(folder.allow_school_upload);
  const [isLocked, setIsLocked] = useState(folder.is_locked);
  const [reason, setReason] = useState('');
  const [targetInstitutions, setTargetInstitutions] = useState<number[]>(initialInstitutionIds);
  const [targetUsersConfig, setTargetUsersConfig] = useState<Array<{id: number, can_delete: boolean, can_upload: boolean}>>(initialUsersConfig);
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return '';
  }, [user]);

  // Load users for targeting
  const { data: usersResponse } = useQuery({
    queryKey: ['users-for-folders', targetRoles],
    queryFn: () => userService.getUsers({ role: targetRoles, per_page: 100 }),
    enabled: !!targetRoles,
  });

  const availableInstitutions: Institution[] = useMemo(() => {
    const raw = institutionsResponse?.institutions || institutionsResponse?.data?.data || institutionsResponse?.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [institutionsResponse]);

  const availableUsers: User[] = useMemo(() => {
    return Array.isArray(usersResponse?.data) ? usersResponse.data : [];
  }, [usersResponse]);

  const filteredInstitutions = availableInstitutions.filter((inst) =>
    inst.name.toLowerCase().includes(institutionSearch.toLowerCase())
  );

  const filteredUsers = availableUsers.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectByLevel = (level: number) => {
    const levelIds = availableInstitutions
      .filter(inst => inst.level === level)
      .map(inst => inst.id);
    setTargetInstitutions(Array.from(new Set([...targetInstitutions, ...levelIds])));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Qovluq adı daxil edilməlidir');
      return;
    }

    if (targetInstitutions.length === 0 && targetUsersConfig.length === 0) {
      setError('Ən azı bir hədəf seçilməlidir');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await documentCollectionService.update(folder.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        allow_school_upload: allowUpload,
        is_locked: isLocked,
        reason: reason.trim() || undefined,
        target_institutions: targetInstitutions,
        target_user_ids: targetUsersConfig,
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error updating folder:', err);
      setError(err.response?.data?.message || 'Qovluq yenilənərkən xəta baş verdi');
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
              <Edit className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Qovluğu Redaktə Et</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Folder Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Qovluq Adı *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıqlama</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                rows={2}
              />
            </div>

            {/* Targeting Section */}
            <div className="space-y-4 pt-2">
              <h3 className="font-medium text-gray-900 border-b pb-2">Hədəfləmə Redaktəsi</h3>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Hədəf Müəssisələr</label>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={institutionSearch}
                    onChange={(e) => setInstitutionSearch(e.target.value)}
                    placeholder="Müəssisə axtar..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => selectByLevel(3)} className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
                    Sektorları Seç ({availableInstitutions.filter(i => i.level === 3).length})
                  </button>
                  <button type="button" onClick={() => selectByLevel(4)} className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">
                    Məktəbləri Seç ({availableInstitutions.filter(i => i.level === 4).length})
                  </button>
                  <button type="button" onClick={() => setTargetInstitutions([])} className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                    Təmizlə
                  </button>
                </div>

                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50">
                  {filteredInstitutions.map((inst) => (
                    <div key={inst.id} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id={`edit-inst-${inst.id}`}
                        checked={targetInstitutions.includes(inst.id)}
                        onChange={(e) => {
                          if (e.target.checked) setTargetInstitutions([...targetInstitutions, inst.id]);
                          else setTargetInstitutions(targetInstitutions.filter(id => id !== inst.id));
                        }}
                        className="w-4 h-4 text-primary rounded"
                      />
                      <label htmlFor={`edit-inst-${inst.id}`} className="text-sm cursor-pointer">
                        {inst.name} <span className="text-xs text-gray-400">(Lv {inst.level})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {canTargetUsers && (
                <div className="space-y-3 pt-2">
                  <label className="block text-sm font-medium text-gray-700">Hədəf İstifadəçilər</label>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="İstifadəçi axtar..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>

                  <div className="border rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50">
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2">İstifadəçi tapılmadı</p>
                    ) : (
                      filteredUsers.map((u) => {
                        const config = targetUsersConfig.find(c => c.id === u.id);
                        const isSelected = !!config;

                        return (
                          <div key={u.id} className="flex flex-col gap-2 py-2 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`edit-user-${u.id}`}
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTargetUsersConfig([...targetUsersConfig, { id: u.id, can_delete: false, can_upload: true }]);
                                  } else {
                                    setTargetUsersConfig(targetUsersConfig.filter(c => c.id !== u.id));
                                  }
                                }}
                                className="w-4 h-4 text-primary rounded"
                              />
                              <label htmlFor={`edit-user-${u.id}`} className="text-sm font-medium cursor-pointer flex-1 flex items-center gap-2">
                                <UserIcon size={12} className="text-gray-400" />
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
                                  Yükləyə bilsin
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
                                  Silə bilsin
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

            {/* Settings */}
            <div className="space-y-3 pt-4 border-t">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowUpload}
                  onChange={(e) => setAllowUpload(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Məktəblərə sənəd yükləməyə icazə ver</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLocked}
                  onChange={(e) => setIsLocked(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Qovluğu kilidlə</span>
              </label>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dəyişiklik səbəbi</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="Məsələn: Operator əlavə edildi"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              İmtina
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Yadda saxlanılır...' : 'Yadda Saxla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenameFolderDialog;
