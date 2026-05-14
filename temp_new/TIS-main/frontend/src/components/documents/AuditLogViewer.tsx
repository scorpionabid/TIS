import React, { useState, useEffect, useCallback } from 'react';
import documentCollectionService from '../../services/documentCollectionService';
import type { DocumentCollection, FolderAuditLog } from '../../types/documentCollection';
import { X, History, User, Calendar, FileText, Edit, Trash2, Download, FileText as FileIcon } from 'lucide-react';

interface AuditLogViewerProps {
  folder: DocumentCollection;
  onClose: () => void;
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ folder, onClose }) => {
  const [logs, setLogs] = useState<FolderAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await documentCollectionService.getAuditLogs(folder.id);
      setLogs(data);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError('Audit log-lar yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  }, [folder.id]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <FileText className="text-green-600" size={20} />;
      case 'updated':
      case 'renamed':
        return <Edit className="text-blue-600" size={20} />;
      case 'deleted':
      case 'documents_deleted':
        return <Trash2 className="text-red-600" size={20} />;
      case 'bulk_downloaded':
        return <Download className="text-purple-600" size={20} />;
      default:
        return <History className="text-gray-600" size={20} />;
    }
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      created: 'Yaradıldı',
      updated: 'Yeniləndi',
      renamed: 'Adı dəyişdirildi',
      deleted: 'Silindi',
      bulk_downloaded: 'Bulk yükləndi',
      documents_deleted: 'Sənədlər silindi',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'updated':
      case 'renamed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'deleted':
      case 'documents_deleted':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'bulk_downloaded':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatKey = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatFileSize = (bytes: unknown): string => {
    if (typeof bytes !== 'number') {
      return String(bytes ?? '—');
    }
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size % 1 === 0 ? size : size.toFixed(2)} ${units[i]}`;
  };

  const formatValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    if (key.includes('size')) {
      return formatFileSize(value);
    }

    if (key.includes('date') || key.includes('time') || key.includes('at')) {
      const date = new Date(String(value));
      if (!isNaN(date.getTime())) {
        return formatDate(date.toISOString());
      }
    }

    return String(value);
  };

  const renderDataList = (data: Record<string, unknown>) => {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <p className="text-xs text-gray-500">Məlumat yoxdur</p>;
    }

    return (
      <ul className="space-y-1">
        {entries.map(([key, value]) => (
          <li key={key} className="text-xs text-gray-600 flex items-start gap-2">
            <span className="min-w-[140px] text-gray-500">{formatKey(key)}:</span>
            <span className="font-medium text-gray-800 break-all">{formatValue(key, value)}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderDataChanges = (log: FolderAuditLog) => {
    if (!log.old_data && !log.new_data) return null;

    return (
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {log.old_data && (
          <div className="p-3 bg-red-50 border border-red-100 rounded">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-2">
              <FileIcon size={16} />
              Əvvəlki məlumat
            </div>
            {renderDataList(log.old_data)}
          </div>
        )}

        {log.new_data && (
          <div className="p-3 bg-green-50 border border-green-100 rounded">
            <div className="flex items-center gap-2 text-sm font-semibold text-green-700 mb-2">
              <FileIcon size={16} />
              Yeni məlumat
            </div>
            {renderDataList(log.new_data)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <History className="text-purple-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Audit Log</h2>
              <p className="text-gray-600 mt-1">{folder.name} - Əməliyyat tarixçəsi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <History size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Hələ audit log yoxdur</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      {getActionIcon(log.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <span
                            className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${getActionColor(
                              log.action
                            )}`}
                          >
                            {getActionLabel(log.action)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 flex-shrink-0">
                          {formatDate(log.created_at)}
                        </span>
                      </div>

                      {/* User Info */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <User size={16} />
                        <span>
                          {log.user?.name || 'Sistem'} ({log.user?.email || 'N/A'})
                        </span>
                        {log.ip_address && (
                          <span className="text-gray-400">• IP: {log.ip_address}</span>
                        )}
                      </div>

                      {/* Reason */}
                      {log.reason && (
                        <div className="mt-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                          <p className="text-sm text-yellow-800">
                            <strong>Səbəb:</strong> {log.reason}
                          </p>
                        </div>
                      )}

                      {/* Data Changes */}
                      {renderDataChanges(log)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Cəmi: <strong>{logs.length}</strong> əməliyyat
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Bağla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogViewer;
