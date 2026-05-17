import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText, AlertCircle, Loader2, Link as LinkIcon, Building2, Calendar, Archive } from 'lucide-react';
import documentCollectionService from '@/services/documentCollectionService';

const PublicFolderShare: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [shareInfo, setShareInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        if (!token) return;
        const response = await documentCollectionService.getShareLinkInfo(token);
        setShareInfo(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Paylaşım linki etibarsızdır və ya müddəti bitib.');
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [token]);

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
    if (mimeType?.includes('image')) return '🖼️';
    return '📁';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Məlumatlar yüklənir...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-red-100">
          <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Giriş Mümkün Deyil</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <a href="/" className="inline-block px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Ana səhifəyə qayıt
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Branding */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
          <LinkIcon className="text-white" size={20} />
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">ATİS <span className="text-blue-600">Paylaşım</span></h1>
      </div>

      <div className="max-w-3xl w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                  <FileText size={14} />
                  Sənəd Paylaşımı
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{shareInfo.folder_name}</h2>
                <p className="text-sm text-slate-500">{shareInfo.documents?.length || 0} sənəd mövcuddur</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Calendar size={14} />
                    Linkin son tarixi
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {new Date(shareInfo.expires_at).toLocaleDateString('az-AZ')}
                  </p>
                </div>
                <a 
                  href={shareInfo.zip_url}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
                >
                  <Archive size={16} />
                  Hamısını ZIP olaraq yüklə
                </a>
              </div>
            </div>

            <div className="space-y-3">
              {shareInfo.documents && shareInfo.documents.length > 0 ? (
                shareInfo.documents.map((doc: any) => (
                  <div 
                    key={doc.id}
                    className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-md hover:shadow-blue-50/50 transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl group-hover:bg-blue-50 transition-colors">
                        {getFileIcon(doc.mime_type)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 truncate text-sm" title={doc.file_name}>
                          {doc.file_name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString('az-AZ')}
                        </p>
                      </div>
                    </div>
                    <a 
                      href={doc.download_url}
                      className="p-2.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      title="Yüklə"
                    >
                      <Download size={18} />
                    </a>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <FileText className="mx-auto text-slate-300 mb-3" size={48} />
                  <p className="text-slate-500 font-medium">Bu qovluqda hələ ki sənəd yoxdur.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ATİS Sənəd Dövriyyəsi Sistemi</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicFolderShare;
