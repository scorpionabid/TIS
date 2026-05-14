import React from 'react';
import { cn } from '@/lib/utils';
import { useLayout } from '@/contexts/LayoutContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ArrowLeft } from 'lucide-react';

interface MobileModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBackButton?: boolean;
  showCloseButton?: boolean;
  size?: 'default' | 'large' | 'full';
  className?: string;
}

export const MobileModal: React.FC<MobileModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  showBackButton = false,
  showCloseButton = true,
  size = 'default',
  className
}) => {
  const { isMobile } = useLayout();

  const sizeClasses = {
    default: isMobile ? "h-[90vh]" : "max-w-lg",
    large: isMobile ? "h-[95vh]" : "max-w-2xl",
    full: isMobile ? "h-screen rounded-none inset-0" : "max-w-4xl max-h-[90vh]"
  };

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className={cn(
            "inset-0 m-0 translate-x-0 translate-y-0 border-0 p-0 max-w-none w-screen",
            sizeClasses[size],
            "flex flex-col",
            className
          )}
        >
          {/* Mobile Header */}
          {(title || showBackButton || showCloseButton) && (
            <DialogHeader className="modal-header flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                {showBackButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-9 w-9"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <div className="flex flex-col text-left">
                  {title && (
                    <DialogTitle className="text-lg font-semibold">
                      {title}
                    </DialogTitle>
                  )}
                  {description && (
                    <DialogDescription className="text-sm text-muted-foreground">
                      {description}
                    </DialogDescription>
                  )}
                </div>
              </div>

              {showCloseButton && !showBackButton && (
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </DialogClose>
              )}
            </DialogHeader>
          )}

          {/* Mobile Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {children}
          </div>

          {/* Mobile Footer */}
          {footer && (
            <DialogFooter className="modal-footer">
              {footer}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop fallback - standard dialog
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(sizeClasses[size], className)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}

        <div className="space-y-4">
          {children}
        </div>

        {footer && (
          <DialogFooter>
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Helper component for common mobile modal patterns
export const ConfirmationMobileModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Təsdiq et",
  cancelText = "Ləğv et",
  destructive = false
}) => (
  <MobileModal
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    showBackButton={true}
    footer={
      <div className="flex gap-2 w-full">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          {cancelText}
        </Button>
        <Button
          variant={destructive ? "destructive" : "default"}
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="flex-1"
        >
          {confirmText}
        </Button>
      </div>
    }
  >
    <p className="text-muted-foreground">
      {description}
    </p>
  </MobileModal>
);

// Helper component for form modals
export const FormMobileModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  children: React.ReactNode;
  submitText?: string;
  submitDisabled?: boolean;
  size?: 'default' | 'large' | 'full';
}> = ({
  open,
  onClose,
  onSubmit,
  title,
  children,
  submitText = "Yadda saxla",
  submitDisabled = false,
  size = 'default'
}) => (
  <MobileModal
    open={open}
    onClose={onClose}
    title={title}
    showBackButton={true}
    size={size}
    footer={
      <div className="flex gap-2 w-full">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Ləğv et
        </Button>
        <Button
          onClick={onSubmit}
          disabled={submitDisabled}
          className="flex-1"
        >
          {submitText}
        </Button>
      </div>
    }
  >
    {children}
  </MobileModal>
);