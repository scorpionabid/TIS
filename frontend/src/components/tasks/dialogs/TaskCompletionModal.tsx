import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";

interface TaskCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { resolution: string; notes: string }) => void;
  isLoading?: boolean;
}

export const RESOLUTION_OPTIONS = [
  { value: "tam_icra_edildi", label: "Tam icra edildi" },
  { value: "qismen_icra_edildi", label: "Qismən icra edildi" },
  { value: "muvafiq_sobeye_yonlendirildi", label: "Müvafiq şöbəyə yönləndirildi" },
  { value: "melumat_ucun_qeyde_alindi", label: "Məlumat üçün qeydə alındı" },
  { value: "diger", label: "Digər" },
];

export function TaskCompletionModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: TaskCompletionModalProps) {
  const [resolution, setResolution] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setResolution("");
      setNotes("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!resolution) return;
    onConfirm({ resolution, notes: notes.trim() });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            Tapşırığın Tamamlanması
          </DialogTitle>
          <DialogDescription>
            Tapşırığı yekunlaşdırmaq üçün icra nəticəsini seçin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              İcra Nəticəsi <span className="text-red-500">*</span>
            </Label>
            <Select
              value={resolution}
              onValueChange={setResolution}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nəticəni seçin..." />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Əlavə Şərh</span>
              <span className="text-xs text-muted-foreground font-normal">Könüllü</span>
            </Label>
            <Textarea
              placeholder="Qeyd etmək istədiyiniz əlavə detallar..."
              className="resize-none h-24"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Ləğv et
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!resolution || isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? "Gözləyin..." : "Təsdiqlə və Tamamla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
