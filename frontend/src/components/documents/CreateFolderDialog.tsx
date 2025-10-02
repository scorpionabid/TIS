import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import documentCollectionService from '../../services/documentCollectionService';
import { institutionService } from '../../services/institutions';
import { REGIONAL_FOLDER_TEMPLATES } from '../../types/documentCollection';
import { X, Folder, Building2, Users, Target, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface CreateFolderDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Institution {
  id: number;
  name: string;
  level: number;
  type?: string;
}

const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({ onClose, onSuccess }) => {
  const { currentUser: user } = useAuth();
  const [selectedInstitution, setSelectedInstitution] = useState<number | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([
    'schedules',
    'action_plans',
    'orders',
  ]);
  const [targetInstitutions, setTargetInstitutions] = useState<number[]>([]);
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all institutions for targeting
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions-for-folders'],
    queryFn: () => institutionService.getAll({ per_page: 1000 }),
  });

  const availableInstitutions: Institution[] = Array.isArray(institutionsResponse?.institutions)
    ? institutionsResponse.institutions
    : Array.isArray(institutionsResponse?.data?.data)
    ? institutionsResponse.data.data
    : Array.isArray(institutionsResponse?.data)
    ? institutionsResponse.data
    : [];

  // Filter institutions based on search
  const filteredInstitutions = availableInstitutions.filter((institution: Institution) =>
    institution.name.toLowerCase().includes(institutionSearch.toLowerCase())
  );

  useEffect(() => {
    loadOwnerInstitution();
  }, [user]);

  const loadOwnerInstitution = () => {
    const userRoles = (user as any)?.roles || [];
    const userRole = (user as any)?.role;
    const isSuperAdmin = userRole === 'superadmin' || (Array.isArray(userRoles) && userRoles.some((r: any) => r.name === 'superadmin'));

    // Auto-select institution for RegionAdmin
    if (!isSuperAdmin && (user as any)?.institution?.id) {
      setSelectedInstitution((user as any).institution.id);
    }
  };

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

  const handleTemplateToggle = (key: string) => {
    setSelectedTemplates(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInstitution) {
      setError('Zəhmət olmasa institusiya seçin');
      return;
    }

    if (selectedTemplates.length === 0) {
      setError('Ən azı bir folder şablonu seçin');
      return;
    }

    if (targetInstitutions.length === 0) {
      setError('Zəhmət olmasa ən azı bir hədəf müəssisə seçin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const templates = Object.fromEntries(
        selectedTemplates.map(key => [key, REGIONAL_FOLDER_TEMPLATES[key as keyof typeof REGIONAL_FOLDER_TEMPLATES]])
      );

      await documentCollectionService.createRegionalFolders({
        institution_id: selectedInstitution,
        folder_templates: templates,
        target_institutions: targetInstitutions,
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error creating folders:', err);
      setError(err.response?.data?.message || 'Folderlər yaradılarkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Folder className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Regional Folderlər Yarat</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Owner Institution Selection (SuperAdmin only) */}
          {(() => {
            const userRoles = (user as any)?.roles || [];
            const userRole = (user as any)?.role;
            const isSuperAdmin = userRole === 'superadmin' || (Array.isArray(userRoles) && userRoles.some((r: any) => r.name === 'superadmin'));
            return isSuperAdmin;
          })() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sahib İnstitusiya (Regional Ofis)
              </label>
              <select
                value={selectedInstitution || ''}
                onChange={(e) => setSelectedInstitution(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Seçin...</option>
                {availableInstitutions
                  .filter(inst => inst.level === 2)
                  .map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Folder Şablonları
            </label>
            <div className="space-y-2">
              {Object.entries(REGIONAL_FOLDER_TEMPLATES).map(([key, name]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTemplates.includes(key)}
                    onChange={() => handleTemplateToggle(key)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-gray-900">{name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Target Institutions Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Hədəf Müəssisələr (Faylları yükləyə biləcək müəssisələr)
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
                {institutionSearch ? `Görünənləri seç (${filteredInstitutions.length})` : `Hamısını seç (${availableInstitutions.length})`}
              </button>

              <button
                type="button"
                onClick={() => setTargetInstitutions([])}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              >
                <X size={16} />
                Hamısını ləğv et
              </button>

              <button
                type="button"
                onClick={() => selectInstitutionsByLevel(3)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
              >
                <Target size={16} />
                Sektorlar ({availableInstitutions.filter(inst => inst.level === 3).length})
              </button>

              <button
                type="button"
                onClick={() => selectInstitutionsByType((inst: Institution) => {
                  const isSchoolType = ['secondary_school', 'vocational_school'].includes(inst.type || '');
                  const isSchoolByName = inst.level === 4 && inst.name?.toLowerCase().includes('məktəb');
                  return isSchoolType || isSchoolByName;
                })}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
              >
                <Building2 size={16} />
                Məktəblər
              </button>
            </div>

            {/* Institutions List */}
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
              {filteredInstitutions.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Building2 className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Axtarış nəticəsində müəssisə tapılmadı</p>
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
                    <label
                      htmlFor={`institution-${institution.id}`}
                      className="text-sm cursor-pointer flex-1 flex items-center gap-2"
                    >
                      <span>{institution.name}</span>
                      <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded">
                        Səviyyə {institution.level}
                      </span>
                    </label>
                  </div>
                ))
              )}
            </div>

            {targetInstitutions.length > 0 && (
              <p className="text-sm text-gray-600">
                <strong>{targetInstitutions.length}</strong> müəssisə seçildi
              </p>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Qeyd:</strong> Seçilmiş şablonlar regional institusiya üçün yaradılacaq.
              Yalnız seçilmiş hədəf müəssisələr bu folderlərə sənəd yükləyə biləcək.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              İmtina
            </button>
            <button
              type="submit"
              disabled={loading || selectedTemplates.length === 0}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Yaradılır...' : 'Yarat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFolderDialog;
