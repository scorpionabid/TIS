import React, { useState } from 'react';
import { X, Copy, Check, Calendar, Lock, Download, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import documentCollectionService from '../../services/documentCollectionService';

interface ShareSettingsProps {
  folder: any;
  onClose: () => void;
}

export const ShareSettings: React.FC<ShareSettingsProps> = ({ folder, onClose }) => {
  const { toast } = useToast();
  const [days, setDays] = useState(7);
  const [canUpload, setCanUpload] = useState(true);
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateLink = async () => {
    try {
      setLoading(true);
      // documentCollectionService-ə yeni metod əlavə etmək lazımdır (backend endpoint: /api/document-collections/{id}/share-links)
      const response = await documentCollectionService.createShareLink(folder.id, {
        days,
        can_upload: canUpload
      });
      setShareData(response.data);
    } catch (err: any) {
      toast({
        title: 'Xəta baş verdi',
        description: err.response?.data?.message || 'Paylaşım linki yaradıla bilmədi',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (shareData?.share_url) {
      navigator.clipboard.writeText(shareData.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Kopyalandı', description: 'Link mübadilə buferinə əlavə edildi.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <LinkIcon size={18} className="text-blue-600" />
            Qovluğu Paylaş
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!shareData ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <Calendar size={16} />
                    Linkin aktivlik müddəti (gün)
                  </label>
                  <select
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value))}
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={1}>1 gün</option>
                    <option value={3}>3 gün</option>
                    <option value={7}>7 gün</option>
                    <option value={14}>14 gün</option>
                    <option value={30}>30 gün</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-md text-blue-600">
                      <Download size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-900">İctimai Endirmə</p>
                      <p className="text-xs text-blue-700">Linklə hər kəs sənədləri yükləyə bilər</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    readOnly
                    className="h-5 w-5 rounded text-blue-600"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateLink}
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {loading ? 'Yaradılır...' : 'Paylaşım Linki Yarat'}
              </button>
            </>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <Check className="mx-auto text-green-600 mb-2" size={32} />
                <p className="text-sm font-bold text-green-800">Link Hazırdır!</p>
                <p className="text-xs text-green-600">
                  {new Date(shareData.expires_at).toLocaleDateString('az-AZ')} tarixinə qədər aktivdir.
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={shareData.share_url}
                  className="w-full p-3 pr-12 border rounded-lg bg-gray-50 text-sm text-gray-600 font-mono"
                />
                <button
                  onClick={copyToClipboard}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} className="text-gray-400" />}
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Bağla
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};