import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClassData } from "@/services/regionadmin/classes";

interface ClassDeleteDialogsProps {
  // Single delete
  deleteTarget: ClassData | null;
  isDeleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  // Bulk delete
  isBulkDeleteDialogOpen: boolean;
  isBulkDeleting: boolean;
  selectedCount: number;
  onConfirmBulkDelete: () => void;
  onCancelBulkDelete: () => void;
}

export const ClassDeleteDialogs = ({
  deleteTarget,
  isDeleting,
  onConfirmDelete,
  onCancelDelete,
  isBulkDeleteDialogOpen,
  isBulkDeleting,
  selectedCount,
  onConfirmBulkDelete,
  onCancelBulkDelete,
}: ClassDeleteDialogsProps) => {
  return (
    <>
      {/* Single Delete Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !isDeleting) onCancelDelete();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sinifi silmək istəyirsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu əməliyyat geri qaytarılmayacaq. Seçilmiş sinif sistemdən
              silinəcək.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Ləğv et
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Silinir..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isBulkDeleting) onCancelBulkDelete();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seçilmiş siniflər silinsin?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCount} sinifi silmək üzrəsiniz. Bu əməliyyat geri
              qaytarıla bilməz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>
              Ləğv et
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmBulkDelete}
              disabled={isBulkDeleting || selectedCount === 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? "Silinir..." : "Seçilənləri sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
