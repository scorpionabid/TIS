/**
 * BulkActionConfirmDialog
 * Confirmation dialog for bulk operations with row count display
 */

import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, RotateCcw, Trash2, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BulkActionConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: 'approve' | 'reject' | 'return' | 'delete' | 'export';
  rowCount: number;
  isLoading?: boolean;
}

const ACTION_CONFIG = {
  approve: {
    title: 'Toplu təsdiqləmə',
    description: 'Seçilmiş sətirləri təsdiqləmək istədiyinizə əminsiniz?',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    buttonText: 'Təsdiqlə',
    buttonVariant: 'default' as const,
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
  },
  reject: {
    title: 'Toplu rədd etmə',
    description: 'Seçilmiş sətirləri rədd etmək istədiyinizə əminsiniz?',
    icon: XCircle,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50',
    buttonText: 'Rədd et',
    buttonVariant: 'destructive' as const,
    buttonClass: '',
  },
  return: {
    title: 'Toplu qaytarma',
    description: 'Seçilmiş sətirləri qaytarmaq istədiyinizə əminsiniz?',
    icon: RotateCcw,
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    buttonText: 'Qaytar',
    buttonVariant: 'outline' as const,
    buttonClass: 'border-amber-600 text-amber-600 hover:bg-amber-50',
  },
  delete: {
    title: 'Toplu silmə',
    description: 'Seçilmiş sətirləri birdəfəlik silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz!',
    icon: Trash2,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50',
    buttonText: 'Sil',
    buttonVariant: 'destructive' as const,
    buttonClass: '',
  },
  export: {
    title: 'Toplu export',
    description: 'Seçilmiş sətirləri export etmək istədiyinizə əminsiniz?',
    icon: Download,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    buttonText: 'Export',
    buttonVariant: 'outline' as const,
    buttonClass: 'border-blue-600 text-blue-600 hover:bg-blue-50',
  },
};

export function BulkActionConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  action,
  rowCount,
  isLoading = false,
}: BulkActionConfirmDialogProps) {
  const config = ACTION_CONFIG[action];
  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <Icon className={`h-6 w-6 ${config.iconColor}`} />
            </div>
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Seçilmiş sətir sayı:</span>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {rowCount}
            </Badge>
          </div>

          {action === 'delete' && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">
                <strong>Diqqət:</strong> Bu əməliyyat geri qaytarıla bilməz. Silinən sətirləri bərpa etmək mümkün olmayacaq.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Ləğv et
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={onConfirm}
            disabled={isLoading}
            className={config.buttonClass}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Gözləyin...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {config.buttonText}
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
