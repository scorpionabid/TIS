import React, { useState, useEffect, useCallback } from 'react';
import documentCollectionService from '../../services/documentCollectionService';
import type { DocumentCollection, FolderWithDocuments } from '../../types/documentCollection';
import { X, Trash2, AlertTriangle } from 'lucide-react';

interface DeleteFolderDialogProps {
  folder: DocumentCollection;
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteFolderDialog: React.FC<DeleteFolderDialogProps> = ({ folder, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const CONFIRM_PHRASE = 'SİL';

  const loadDocumentsCount = useCallback(async () => {
    try {
      setLoadingDocuments(true);
      const data: FolderWithDocuments = await documentCollectionService.getById(folder.id);
      setDocumentsCount(data.documents?.length || 0);
    } catch (err) {
      console.error('Error loading documents count:', err);
      setDocumentsCount(0);
    } finally {
      setLoadingDocuments(false);
    }
  }, [folder.id]);

  useEffect(() => {
    loadDocumentsCount();
  }, [loadDocumentsCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (confirmText !== CONFIRM_PHRASE) {
      setError(`Təsdiq üçün "${CONFIRM_PHRASE}" yazın`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await documentCollectionService.delete(folder.id, {
        reason: reason.trim() || undefined,
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error deleting folder:', err);
      setError(err.response?.data?.message || 'Folder silinərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="text-red-600" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-red-900">Folderi Sil</h2>
          </div>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600 transition-colors"
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

          {/* Warning */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
              <div className="space-y-2">
                <p className="font-semibold text-yellow-900">DİQQƏT: Bu əməliyyat geri alına bilməz!</p>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>Folder "<strong>{folder.name}</strong>" silinəcək</li>
                  {loadingDocuments ? (
                    <li>Sənədlər yüklənir...</li>
                  ) : (
                    <li>
                      İçindəki <strong>{documentsCount} sənəd</strong> də silinəcək (cascade delete)
                    </li>
                  )}
                  <li>30 gün ərzində geri qaytarıla bilər (soft delete)</li>
                  <li>Bütün əməliyyatlar audit log-a yazılacaq</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Folder Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Folder adı:</span>
              <span className="font-semibold text-gray-900">{folder.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sahibi:</span>
              <span className="text-gray-900">{folder.ownerInstitution?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sənəd sayı:</span>
              <span className="font-semibold text-red-600">
                {loadingDocuments ? 'Yüklənir...' : documentsCount}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Silinmə səbəbi (məcburi deyil)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={3}
              placeholder="Folder niyə silinir?"
            />
          </div>

          {/* Confirmation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Təsdiq üçün "<span className="font-bold text-red-600">{CONFIRM_PHRASE}</span>" yazın *
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder={CONFIRM_PHRASE}
              required
            />
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
              disabled={loading || loadingDocuments || confirmText !== CONFIRM_PHRASE}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Silinir...' : 'Folderi Sil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteFolderDialog;
