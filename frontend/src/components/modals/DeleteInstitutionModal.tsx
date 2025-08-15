import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Institution } from '@/services/institutions';
import { AlertTriangle, Trash2, Archive } from 'lucide-react';

interface DeleteInstitutionModalProps {
  open: boolean;
  onClose: () => void;
  institution: Institution | null;
  onDelete: (deleteType: 'soft' | 'hard') => Promise<void>;
}

export const DeleteInstitutionModal: React.FC<DeleteInstitutionModalProps> = ({
  open,
  onClose,
  institution,
  onDelete,
}) => {
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!institution) {
      console.log('❌ DeleteModal: No institution provided');
      return;
    }

    console.log(`🗑️ DeleteModal: Starting delete process`, {
      institutionId: institution.id,
      institutionName: institution.name,
      deleteType: deleteType,
      timestamp: new Date().toISOString()
    });

    setLoading(true);
    try {
      console.log('📞 DeleteModal: Calling parent onDelete function');
      await onDelete(deleteType);
      console.log('✅ DeleteModal: onDelete completed successfully');
      onClose();
    } catch (error) {
      console.error('❌ DeleteModal: Delete failed:', error);
      console.error('DeleteModal error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        institutionId: institution.id,
        deleteType: deleteType
      });
    } finally {
      console.log('🏁 DeleteModal: Setting loading to false');
      setLoading(false);
    }
  };

  if (!institution) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Müəssisəni Sil</DialogTitle>
          </div>
          <DialogDescription>
            <strong>"{institution.name}"</strong> müəssisəsini silmək istədiyinizə əminsiniz? 
            Bu əməliyyatı geri qaytarmaq mümkün olmaya bilər.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Diqqət
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Soft delete: Müəssisə deaktiv edilir, bərpa etmək olar</li>
                    <li>Hard delete: Müəssisə tam silinir, bərpa etmək olmaz</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Silmə növünü seçin:</Label>
            <RadioGroup value={deleteType} onValueChange={(value) => {
              console.log('🔄 DeleteModal: Delete type changed to:', value);
              setDeleteType(value as 'soft' | 'hard');
            }}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value="soft" id="soft" />
                <Label htmlFor="soft" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Archive className="h-4 w-4 text-orange-500" />
                  <div>
                    <div className="font-medium">Soft Delete (Məsləhət edilir)</div>
                    <div className="text-sm text-muted-foreground">
                      Müəssisə deaktiv edilir, sonradan bərpa etmək olar
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value="hard" id="hard" />
                <Label htmlFor="hard" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <div>
                    <div className="font-medium text-destructive">Hard Delete (Təhlükəli)</div>
                    <div className="text-sm text-muted-foreground">
                      Müəssisə tam silinir, bərpa etmək mümkün deyil
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Warning for hard delete */}
          {deleteType === 'hard' && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    XƏBƏRDARLIQ: Hard Delete
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>Bu əməliyyat:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>Müəssisəni tam olaraq siləcək</li>
                      <li>Bütün əlaqəli məlumatları siləcək</li>
                      <li>Bu əməliyyatı geri qaytarmaq MÜMKÜN DEYIL</li>
                      <li>Yalnız SuperAdmin icazəsi tələb edilir</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Institution details */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Silinəcək Müəssisə:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Ad:</span>
                <span className="font-medium">{institution.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Növ:</span>
                <span className="font-medium">{institution.type}</span>
              </div>
              {institution.code && (
                <div className="flex justify-between">
                  <span>Kod:</span>
                  <span className="font-medium">{institution.code}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-medium ${institution.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  {institution.is_active ? 'Aktiv' : 'Deaktiv'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Ləğv et
          </Button>
          <Button 
            type="button" 
            variant={deleteType === 'hard' ? 'destructive' : 'default'}
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? 'Silinir...' : (
              <>
                {deleteType === 'hard' ? <Trash2 className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {deleteType === 'hard' ? 'Tam Sil' : 'Deaktiv Et'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};