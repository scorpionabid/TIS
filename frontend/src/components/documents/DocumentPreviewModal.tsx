import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Loader2, AlertCircle, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import documentCollectionService from '../../services/documentCollectionService';
import type { Document } from '../../types/documentCollection';
import * as XLSX from 'xlsx';

interface DocumentPreviewModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document: doc,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [excelHtml, setExcelHtml] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isOpen && doc) {
      loadPreview();
    } else {
      // Cleanup URL when closing
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setExcelHtml(null);
      setError(null);
    }
  }, [isOpen, doc]);

  const loadPreview = async () => {
    if (!doc) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // We use the downloadDocument service which returns a Blob
      const blob = await documentCollectionService.downloadDocument(doc.id);
      
      const isExcelFile = doc.mime_type?.includes('spreadsheet') || 
                          doc.mime_type?.includes('excel') || 
                          doc.file_extension?.toLowerCase() === 'xlsx' || 
                          doc.file_extension?.toLowerCase() === 'xls' ||
                          doc.original_filename?.toLowerCase().endsWith('.xlsx') ||
                          doc.original_filename?.toLowerCase().endsWith('.xls');

      if (isExcelFile) {
        const arrayBuffer = await blob.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Generate an HTML table from the worksheet
        const htmlStr = XLSX.utils.sheet_to_html(worksheet, { id: 'excel-preview-table' });
        setExcelHtml(htmlStr);
      } else {
        const url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (err: any) {
      console.error('Preview error:', err);
      setError('Sənəd yüklənərkən xəta baş verdi. Zəhmət olmasa yükləyib baxın.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isImage = doc?.mime_type?.startsWith('image/') || doc?.file_extension?.toLowerCase() === 'jpg' || doc?.file_extension?.toLowerCase() === 'png' || doc?.file_extension?.toLowerCase() === 'jpeg';
  const isPDF = doc?.mime_type === 'application/pdf' || doc?.file_extension?.toLowerCase() === 'pdf';
  const isExcel = doc?.mime_type?.includes('spreadsheet') || doc?.mime_type?.includes('excel') || doc?.file_extension?.toLowerCase() === 'xlsx' || doc?.file_extension?.toLowerCase() === 'xls' || doc?.original_filename?.toLowerCase().endsWith('.xlsx') || doc?.original_filename?.toLowerCase().endsWith('.xls');
  const isOffice = doc?.mime_type?.includes('officedocument') || doc?.mime_type?.includes('msword') || doc?.file_extension?.toLowerCase() === 'docx' || doc?.file_extension?.toLowerCase() === 'doc';

  const handleDownload = () => {
    if (doc) {
      documentCollectionService.downloadDocument(doc.id).then(blob => {
        documentCollectionService.downloadFile(blob, doc.original_filename);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div 
        className={`bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 transition-all ${
          isFullscreen 
            ? 'w-screen h-screen max-w-none max-h-none rounded-none' 
            : 'rounded-2xl w-full max-w-5xl max-h-[90vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
              <FileText size={20} />
            </div>
            <div className="overflow-hidden">
              <h3 className="font-semibold text-gray-900 truncate" title={doc?.original_filename}>
                {doc?.original_filename}
              </h3>
              <p className="text-xs text-gray-500">
                {doc?.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : ''} • {doc?.mime_type}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Download size={16} />
              Yüklə
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center min-h-[400px] relative">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-500 font-medium">Sənəd hazırlanır...</p>
            </div>
          )}

          {error && (
            <div className="text-center p-8 max-w-md">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
                <AlertCircle size={24} />
              </div>
              <h4 className="text-gray-900 font-semibold mb-2">Önizləmə mümkün deyil</h4>
              <p className="text-sm text-gray-500 mb-6">{error}</p>
              <button
                onClick={handleDownload}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
              >
                Sənədi yüklə
              </button>
            </div>
          )}

          {!loading && !error && previewUrl && (
            <>
              {isImage && (
                <img 
                  src={previewUrl} 
                  alt={doc?.original_filename} 
                  className="max-w-full max-h-full object-contain shadow-lg"
                />
              )}
              
              {isPDF && (
                <iframe 
                  src={`${previewUrl}#toolbar=0`} 
                  className="w-full h-full border-none"
                  title="PDF Preview"
                />
              )}
            </>
          )}

          {!loading && !error && excelHtml && (
            <div className="w-full h-full bg-white p-6 overflow-auto">
              <style>{`
                #excel-preview-table { border-collapse: collapse; min-width: 100%; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
                #excel-preview-table td, #excel-preview-table th { border: 1px solid #e5e7eb; padding: 6px 10px; font-size: 13px; color: #374151; white-space: nowrap; }
                #excel-preview-table tr:first-child td { background-color: #f9fafb; font-weight: 600; color: #111827; }
                #excel-preview-table tr:hover td { background-color: #f3f4f6; }
              `}</style>
              <div 
                className="excel-preview-container max-w-full"
                dangerouslySetInnerHTML={{ __html: excelHtml }} 
              />
            </div>
          )}

          {!loading && !error && !previewUrl && !excelHtml && (
                <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-md">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText size={32} />
                  </div>
                  <h4 className="text-gray-900 font-semibold mb-2">Genişləndirilmiş Baxış</h4>
                  <p className="text-sm text-gray-500 mb-6">
                    Bu fayl növü ({doc?.file_extension?.toUpperCase()}) birbaşa brauzerdə göstərilə bilmir. 
                    Tam baxış üçün sənədi yükləməyiniz xahiş olunur.
                  </p>
                  <button
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-md shadow-blue-200"
                  >
                    <Download size={18} />
                    Sənədi Yüklə və Bax
                  </button>
                </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-white flex justify-between items-center text-[11px] text-gray-400 font-medium">
          <div className="flex items-center gap-4">
            <span>Yükləyən: <span className="text-gray-600">{doc?.user?.name || 'Naməlum'}</span></span>
            <span>Tarix: <span className="text-gray-600">{doc?.created_at ? new Date(doc.created_at).toLocaleString('az-AZ') : 'N/A'}</span></span>
          </div>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-2 hover:text-gray-700 transition-colors p-1 rounded-md active:bg-gray-50"
            title={isFullscreen ? 'Kiçilt' : 'Tam ekran'}
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{isFullscreen ? 'Kiçilt' : 'Tam ekran'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
