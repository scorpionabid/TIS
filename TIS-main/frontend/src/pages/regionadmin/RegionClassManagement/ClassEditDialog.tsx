import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClassData } from "@/services/regionadmin/classes";
import type { EditFormState } from "./types";

interface ClassEditDialogProps {
  isOpen: boolean;
  editingClass: ClassData | null;
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const ClassEditDialog = ({
  isOpen,
  editingClass,
  editForm,
  setEditForm,
  isSaving,
  onClose,
  onSubmit,
}: ClassEditDialogProps) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sinif məlumatlarını redaktə et</DialogTitle>
          <DialogDescription>
            {editingClass
              ? `${editingClass.class_level}${editingClass.name} sinifi üçün dəyişiklik edin.`
              : "Sinif seçilməyib."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Sinif adı</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Sinif səviyyəsi</Label>
              <Select
                value={editForm.class_level}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, class_level: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                    (level) => (
                      <SelectItem key={level} value={level.toString()}>
                        {level === 0 ? "Hazırlıq" : `${level}-ci sinif`}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-specialty">İxtisas</Label>
              <Input
                id="edit-specialty"
                value={editForm.specialty}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    specialty: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-class-type">Sinfin tipi</Label>
              <Input
                id="edit-class-type"
                value={editForm.class_type}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    class_type: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-class-profile">Profil</Label>
              <Input
                id="edit-class-profile"
                value={editForm.class_profile}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    class_profile: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-program">Təhsil proqramı</Label>
              <Select
                value={editForm.education_program}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    education_program: value,
                  }))
                }
              >
                <SelectTrigger id="edit-program">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="umumi">Ümumi</SelectItem>
                  <SelectItem value="xususi">Xüsusi</SelectItem>
                  <SelectItem value="ferdi_mekteb">
                    Fərdi (Məktəb)
                  </SelectItem>
                  <SelectItem value="ferdi_ev">Fərdi (Ev)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-shift">Növbə</Label>
              <Input
                id="edit-shift"
                value={editForm.teaching_shift}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    teaching_shift: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-week">Tədris həftəsi</Label>
              <Input
                id="edit-week"
                value={editForm.teaching_week}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    teaching_week: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-student-count">Şagird sayı</Label>
              <Input
                id="edit-student-count"
                type="number"
                min={0}
                value={editForm.student_count}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    student_count: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Sinif statusu</Label>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Switch
                  checked={editForm.is_active}
                  onCheckedChange={(checked) =>
                    setEditForm((prev) => ({
                      ...prev,
                      is_active: !!checked,
                    }))
                  }
                />
                <span className="text-sm">
                  {editForm.is_active ? "Aktiv" : "Passiv"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Ləğv et
          </Button>
          <Button onClick={onSubmit} disabled={isSaving}>
            {isSaving ? "Yenilənir..." : "Yadda saxla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
