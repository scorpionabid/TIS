import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Institution } from '@/services/institutions';
import { userService } from '@/services/users';
import { 
  Building, 
  Hash, 
  Layers, 
  Link as LinkIcon, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  User2,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';

interface InstitutionDetailsModalProps {
  open: boolean;
  onClose: () => void;
  institution: Institution | null;
}

export const InstitutionDetailsModal: React.FC<InstitutionDetailsModalProps> = ({
  open,
  onClose,
  institution,
}) => {
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAdmin = async () => {
      if (!institution || !open) return;
      
      setLoading(true);
      try {
        // Get all users for this institution
        const response = await userService.getUsers({
          institution_id: institution.id,
          role: 'institution_admin' // Filter by admin role
        });
        
        // Find the first active admin for this institution
        const adminUser = response.data?.find(user => {
          // Check if user is active and belongs to this institution
          const isActiveAdmin = user.is_active && 
                              user.role === 'institution_admin' && 
                              user.institution?.id === institution.id;
          
          return isActiveAdmin;
        });
        
        setAdmin(adminUser || null);
      } catch (error) {
        console.error('Xəta baş verdi (admin məlumatları yüklənərkən):', error);
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchAdmin();
    }
  }, [institution, open]);

  if (!institution) return null;

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'school': return 'Məktəb';
      case 'kindergarten': return 'Uşaq bağçası';
      case 'university': return 'Universitet';
      case 'college': return 'Kollec';
      case 'other': return 'Digər';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Müəssisə məlumatları
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">{institution.name}</h3>
            {institution.code && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Hash className="h-4 w-4" />
                {institution.code}
              </p>
            )}
          </div>

          <div className="grid gap-4 py-4">
            {/* Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Növü:
              </div>
              <div className="col-span-3">
                <span className="text-sm">
                  {getTypeLabel(institution.type)}
                </span>
              </div>
            </div>

            {/* Level */}
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Səviyyə:
              </div>
              <div className="col-span-3">
                <span className="text-sm">
                  {institution.level}
                </span>
              </div>
            </div>

            {/* Admin Information */}
            <div className="grid grid-cols-4 items-start gap-4">
              <div className="text-sm font-medium flex items-start gap-2">
                <User2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                Admin:
              </div>
              <div className="col-span-3">
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Yüklənir...
                  </div>
                ) : admin ? (
                  <div>
                    <div className="text-sm">
                      {admin.first_name} {admin.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {admin.email || admin.contact_phone || ''}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Təyin olunmayıb
                  </span>
                )}
              </div>
            </div>

            {/* Parent Institution */}
            {institution.parent && (
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-sm font-medium flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Üst Müəssisə:
                </div>
                <div className="col-span-3">
                  <div className="text-sm">{institution.parent.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {getTypeLabel(institution.parent.type)}
                  </div>
                </div>
              </div>
            )}

            {/* Address */}
            {institution.address && (
              <div className="grid grid-cols-4 items-start gap-4">
                <div className="text-sm font-medium flex items-start gap-2 pt-1">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  Ünvan:
                </div>
                <div className="col-span-3">
                  <span className="text-sm">
                    {institution.address}
                  </span>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="grid grid-cols-4 items-center gap-4 pt-2">
              <div className="text-sm font-medium">Status:</div>
              <div className="col-span-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium">
                  {institution.is_active ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Aktiv</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>Deaktiv</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Bağla
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
