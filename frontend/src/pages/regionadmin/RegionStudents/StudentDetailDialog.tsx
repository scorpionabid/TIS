import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { RegionStudent } from '@/services/students';

interface StudentDetailDialogProps {
  student: RegionStudent | null;
  open: boolean;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}

export function StudentDetailDialog({ student, open, onClose }: StudentDetailDialogProps) {
  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {student.full_name}
            <Badge variant={student.is_active ? 'default' : 'secondary'} className="text-xs ml-1">
              {student.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <InfoRow label="UTIS Kodu"    value={<span className="font-mono">{student.utis_code ?? '—'}</span>} />
          <InfoRow label="Tələbə nömrəsi" value={student.student_number} />
          <InfoRow label="Cins"         value={student.gender === 'male' ? 'Kişi' : student.gender === 'female' ? 'Qadın' : null} />
          <InfoRow label="Doğum tarixi" value={student.birth_date} />
        </div>

        <Separator />

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-2">
            Təhsil məlumatları
          </p>
          <InfoRow label="Sinif səviyyəsi" value={student.grade_level ? `${student.grade_level}-ci sinif` : null} />
          <InfoRow label="Sinif bölməsi"   value={student.class_name} />
          <InfoRow label="Sinif adı"       value={student.grade?.name} />
          <InfoRow label="Məktəb"          value={student.school?.name} />
          <InfoRow label="Sektor"          value={student.sector?.name} />
        </div>

        {(student.parent_name || student.parent_phone) && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-2">
                Valideyn məlumatları
              </p>
              <InfoRow label="Valideyn adı"    value={student.parent_name} />
              <InfoRow label="Valideyn telefon" value={student.parent_phone} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
