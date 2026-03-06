import React, { useState } from 'react';
import documentCollectionService from '../../services/documentCollectionService';
import type { DocumentCollection } from '../../types/documentCollection';
import { X, Edit } from 'lucide-react';

interface RenameFolderDialogProps {
  folder: DocumentCollection;
  onClose: () => void;
  onSuccess: () => void;
}

const RenameFolderDialog: React.FC<RenameFolderDialogProps> = ({ folder, onClose, onSuccess }) => {
  const [name, setName] = useState(folder.name);
  const [description, setDescription] = useState(folder.description || '');
  const [allowUpload, setAllowUpload] = useState(folder.allow_school_upload);
  const [isLocked, setIsLocked] = useState(folder.is_locked);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Folder adı daxil edilməlidir');
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
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error updating folder:', err);
      setError(err.response?.data?.message || 'Folder yenilənərkən xəta baş verdi');
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
              <Edit className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Folder Redaktə Et</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Folder Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Folder Adı *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Folder adını daxil edin"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıqlama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
              placeholder="Folder haqqında qısa məlumat"
            />
          </div>

          {/* Settings */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowUpload}
                onChange={(e) => setAllowUpload(e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Məktəblərə sənəd yükləməyə icazə ver</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Folderi kilid (dəyişiklik etməyə mane ol)</span>
            </label>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dəyişiklik səbəbi (məcburi deyil)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Məsələn: İstifadəçi sorğusu əsasında yeniləndi"
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Qeyd:</strong> Bütün dəyişikliklər audit log-a yazılacaq.
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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Yadda saxlanılır...' : 'Yadda Saxla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameFolderDialog;
