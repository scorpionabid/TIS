import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';

interface ResourceHeaderProps {
  canCreate: boolean;
  canBulkUpload?: boolean;
  title: string;
  description: string;
  buttonText: string;
  onCreate: () => void;
  onBulkUpload?: () => void;
}

export function ResourceHeader({
  canCreate,
  canBulkUpload = false,
  title,
  description,
  buttonText,
  onCreate,
  onBulkUpload,
}: ResourceHeaderProps) {
  const canShowBulkUpload = canBulkUpload && typeof onBulkUpload === 'function';

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {canShowBulkUpload && (
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={onBulkUpload}
          >
            <Upload className="h-4 w-4" />
            Excel ilə əlavə et
          </Button>
        )}
        {canCreate && (
          <Button
            className="flex items-center gap-2"
            onClick={onCreate}
          >
            <Plus className="h-4 w-4" />
            {buttonText}
          </Button>
        )}
      </div>
    </div>
  );
}
