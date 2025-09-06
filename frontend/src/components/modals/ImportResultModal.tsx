import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Download,
  FileText
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ImportResult {
  success: number;
  errors: string[];
  created_institutions?: Array<{
    id: number;
    name: string;
    type: string;
  }>;
  warnings?: string[];
}

interface ImportResultModalProps {
  open: boolean;
  onClose: () => void;
  result: ImportResult | null;
  institutionType?: string;
  fileName?: string;
}

export const ImportResultModal: React.FC<ImportResultModalProps> = ({
  open,
  onClose,
  result,
  institutionType,
  fileName
}) => {
  const totalAttempts = (result?.success || 0) + (result?.errors?.length || 0);
  const successRate = totalAttempts > 0 ? Math.round((result?.success || 0) / totalAttempts * 100) : 0;

  const copyErrorsToClipboard = () => {
    if (result?.errors) {
      const errorText = result.errors.join('\n');
      navigator.clipboard.writeText(errorText).then(() => {
        toast({
          title: 'Kopyalandı',
          description: 'Xətalar panoya kopyalandı',
        });
      });
    }
  };

  const downloadErrorReport = () => {
    if (result?.errors) {
      const errorReport = `
İDXAL XƏTA HESABATI
===================
Fayl: ${fileName || 'Bilinmir'}
Müəssisə Növü: ${institutionType || 'Bilinmir'}
Tarix: ${new Date().toLocaleString('az-AZ')}

STATİSTİKA:
- Cəmi cəhd: ${totalAttempts}
- Uğurlu: ${result.success || 0}
- Xətalı: ${result.errors.length}
- Uğur nisbəti: ${successRate}%

XƏTA DETALLAR:
${result.errors.map((error, index) => `${index + 1}. ${error}`).join('\n')}

${result.created_institutions ? '\nYARATILAN MÜƏSSİSƏLƏR:\n' + result.created_institutions.map(inst => `- ${inst.name} (ID: ${inst.id})`).join('\n') : ''}
      `;
      
      const blob = new Blob([errorReport], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `idxal_xeta_hesabati_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Yükləndi',
        description: 'Xəta hesabatı yükləndi',
      });
    }
  };

  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result.success > 0 && result.errors.length === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : result.errors.length > 0 ? (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            İdxal Nəticəsi
          </DialogTitle>
          <DialogDescription>
            {fileName && `Fayl: ${fileName}`}
            {institutionType && ` • Növ: ${institutionType}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{totalAttempts}</div>
              <div className="text-sm text-blue-600">Cəmi Cəhd</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{result.success || 0}</div>
              <div className="text-sm text-green-600">Uğurlu</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{result.errors?.length || 0}</div>
              <div className="text-sm text-red-600">Xətalı</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-600">{successRate}%</div>
              <div className="text-sm text-gray-600">Uğur Nisbəti</div>
            </div>
          </div>

          {/* Success Message */}
          {result.success > 0 && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <h3 className="font-medium text-green-800 dark:text-green-200">
                  Uğurlu İdxal
                </h3>
              </div>
              <p className="text-green-700 dark:text-green-300 mt-1">
                {result.success} müəssisə uğurla yaradıldı
              </p>
              
              {/* Created Institutions */}
              {result.created_institutions && result.created_institutions.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                    Yaradılan müəssisələr:
                  </h4>
                  <ScrollArea className="h-32 w-full">
                    <div className="space-y-1">
                      {result.created_institutions.map((institution, index) => (
                        <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded text-sm">
                          <span className="font-medium">{institution.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            ID: {institution.id}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Error Details */}
          {result.errors && result.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <h3 className="font-medium text-red-800 dark:text-red-200">
                    İdxal Xətaları ({result.errors.length})
                  </h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyErrorsToClipboard}
                    className="text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Kopyala
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadErrorReport}
                    className="text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Yüklə
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-48 w-full">
                <div className="space-y-2">
                  {result.errors.map((error, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded text-sm border-l-4 border-red-400">
                      <div className="flex items-start gap-2">
                        <Badge variant="destructive" className="text-xs shrink-0">
                          {index + 1}
                        </Badge>
                        <span className="text-red-700 dark:text-red-300">{error}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Action Buttons */}
          <Separator />
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              <FileText className="h-4 w-4 inline mr-1" />
              İdxal tamamlandı - {new Date().toLocaleString('az-AZ')}
            </div>
            <div className="flex gap-2">
              {result.errors && result.errors.length > 0 && (
                <Button variant="outline" onClick={onClose}>
                  Düzəlt və Yenidən Cəhd Et
                </Button>
              )}
              <Button onClick={onClose}>
                Bağla
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};