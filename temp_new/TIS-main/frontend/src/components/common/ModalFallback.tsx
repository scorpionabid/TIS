import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ModalFallbackProps {
  titlePlaceholderWidth?: string;
  contentLines?: number;
  actionCount?: number;
}

export const ModalFallback: React.FC<ModalFallbackProps> = ({
  titlePlaceholderWidth = 'w-48',
  contentLines = 3,
  actionCount = 2,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-background p-6 rounded-lg shadow-lg min-w-[320px] max-w-[460px] w-full">
        <div className="space-y-4">
          <Skeleton className={`h-6 ${titlePlaceholderWidth}`} />

          <div className="space-y-2">
            {Array.from({ length: contentLines }).map((_, index) => (
              <Skeleton key={`modal-fallback-line-${index}`} className="h-4 w-full" />
            ))}
          </div>

          <div className="flex justify-end gap-2">
            {Array.from({ length: actionCount }).map((_, index) => (
              <Skeleton key={`modal-fallback-action-${index}`} className="h-9 w-20" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalFallback;
