import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import documentCollectionService from '../../services/documentCollectionService';
import { institutionService } from '../../services/institutions';
import { REGIONAL_FOLDER_TEMPLATES } from '../../types/documentCollection';
import { X, Folder } from 'lucide-react';

interface CreateFolderDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Institution {
  id: number;
  name: string;
  level: string;
}

const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({ onClose, onSuccess }) => {
  const { currentUser: user } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<number | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([
    'schedules',
    'action_plans',
    'orders',
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInstitutions();
  }, []);

  const loadInstitutions = async () => {
    try {
      // superadmin sees all level 2 (Regional) institutions
      // regionadmin sees only their own institution
      const userRoles = (user as any)?.roles || [];
      const userRole = (user as any)?.role;

      const isSuperAdmin = userRole === 'superadmin' || (Array.isArray(userRoles) && userRoles.some((r: any) => r.name === 'superadmin'));

      if (isSuperAdmin) {
        const response = await institutionService.getAll();
        const regionalInstitutions = response.filter(inst => inst.level === '2');
        setInstitutions(regionalInstitutions);
      } else if (user?.institution_id) {
        setSelectedInstitution(user.institution_id);
      }
    } catch (err) {
      console.error('Error loading institutions:', err);
    }
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

    setLoading(true);
    setError(null);

    try {
      const templates = Object.fromEntries(
        selectedTemplates.map(key => [key, REGIONAL_FOLDER_TEMPLATES[key as keyof typeof REGIONAL_FOLDER_TEMPLATES]])
      );

      await documentCollectionService.createRegionalFolders({
        institution_id: selectedInstitution,
        folder_templates: templates,
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

          {/* Institution Selection */}
          {(() => {
            const userRoles = (user as any)?.roles || [];
            const userRole = (user as any)?.role;
            const isSuperAdmin = userRole === 'superadmin' || (Array.isArray(userRoles) && userRoles.some((r: any) => r.name === 'superadmin'));
            return isSuperAdmin;
          })() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İnstitusiya (Regional Ofis)
              </label>
              <select
                value={selectedInstitution || ''}
                onChange={(e) => setSelectedInstitution(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Seçin...</option>
                {institutions.map((inst) => (
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

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Qeyd:</strong> Seçilmiş şablonlar regional institusiya üçün avtomatik yaradılacaq.
              Bu folderlərə bütün alt məktəblər sənəd yükləyə biləcək.
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
