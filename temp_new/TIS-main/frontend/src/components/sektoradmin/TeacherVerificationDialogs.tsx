import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeacherVerification as TeacherVerificationType } from "@/services/teacherVerification";

interface TeacherVerificationDialogsProps {
  selectedTeacher: TeacherVerificationType | null;
  isApproveDialogOpen: boolean;
  isRejectDialogOpen: boolean;
  isBulkApproveDialogOpen: boolean;
  isBulkRejectDialogOpen: boolean;
  selectedCount: number;
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
  setIsApproveDialogOpen: (open: boolean) => void;
  setIsRejectDialogOpen: (open: boolean) => void;
  setIsBulkApproveDialogOpen: (open: boolean) => void;
  setIsBulkRejectDialogOpen: (open: boolean) => void;
  onConfirmApprove: () => void;
  onConfirmReject: () => void;
  onConfirmBulkApprove: () => void;
  onConfirmBulkReject: () => void;
  approvePending: boolean;
  rejectPending: boolean;
  bulkApprovePending: boolean;
  bulkRejectPending: boolean;
}

export function TeacherVerificationDialogs({
  selectedTeacher,
  isApproveDialogOpen,
  isRejectDialogOpen,
  isBulkApproveDialogOpen,
  isBulkRejectDialogOpen,
  selectedCount,
  rejectionReason,
  setRejectionReason,
  setIsApproveDialogOpen,
  setIsRejectDialogOpen,
  setIsBulkApproveDialogOpen,
  setIsBulkRejectDialogOpen,
  onConfirmApprove,
  onConfirmReject,
  onConfirmBulkApprove,
  onConfirmBulkReject,
  approvePending,
  rejectPending,
  bulkApprovePending,
  bulkRejectPending,
}: TeacherVerificationDialogsProps) {
  return (
    <>
      {/* Single Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müəllim Təsdiqləmə</DialogTitle>
            <DialogDescription>
              {selectedTeacher?.name} adlı müəllimin məlumatlarını təsdiqləmək istədiyinizə əminsiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Ləğv Et
            </Button>
            <Button onClick={onConfirmApprove} disabled={approvePending}>
              {approvePending ? "Təsdiqlənir..." : "Təsdiq Et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müəllim Rədd Et</DialogTitle>
            <DialogDescription>
              {selectedTeacher?.name} adlı müəllimin məlumatlarını rədd etmək üçün səbəb daxil edin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejection-reason">Rədd Etmə Səbəbi</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Rədd etmə səbəbini daxil edin..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Ləğv Et
            </Button>
            <Button 
              onClick={onConfirmReject} 
              disabled={rejectPending || !rejectionReason.trim()}
              variant="destructive"
            >
              {rejectPending ? "Rədd edilir..." : "Rədd Et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Approve Dialog */}
      <Dialog open={isBulkApproveDialogOpen} onOpenChange={setIsBulkApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kütləvi Təsdiqləmə</DialogTitle>
            <DialogDescription>
              Seçilmiş {selectedCount} müəllimi təsdiqləmək istədiyinizə əminsiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkApproveDialogOpen(false)}>
              Ləğv Et
            </Button>
            <Button onClick={onConfirmBulkApprove} disabled={bulkApprovePending}>
              {bulkApprovePending ? "Təsdiqlənir..." : `${selectedCount} Müəllimi Təsdiq Et`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={isBulkRejectDialogOpen} onOpenChange={setIsBulkRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kütləvi Rədd Et</DialogTitle>
            <DialogDescription>
              Seçilmiş {selectedCount} müəllimi rədd etmək üçün səbəb daxil edin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="bulk-rejection-reason">Rədd Etmə Səbəbi</Label>
              <Textarea
                id="bulk-rejection-reason"
                placeholder="Rədd etmə səbəbini daxil edin..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkRejectDialogOpen(false)}>
              Ləğv Et
            </Button>
            <Button 
              onClick={onConfirmBulkReject} 
              disabled={bulkRejectPending || !rejectionReason.trim()}
              variant="destructive"
            >
              {bulkRejectPending ? "Rədd edilir..." : `${selectedCount} Müəllimi Rədd Et`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
