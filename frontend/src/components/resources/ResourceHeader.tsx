import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';

interface ResourceHeaderProps {
  title: string;
  description?: string;
  canCreate?: boolean;
  createLabel?: string;
  onCreate?: () => void;
  canBulkUpload?: boolean;
  onBulkUpload?: () => void;
  bulkUploadLabel?: string;
}

export function ResourceHeader({
  title,
  description = '',
  canCreate = false,
  createLabel = 'Yeni',
  onCreate,
  canBulkUpload = false,
  onBulkUpload,
  bulkUploadLabel = 'Excel ilə əlavə et',
}: ResourceHeaderProps) {
  const showCreate = canCreate && typeof onCreate === 'function';
  const showBulkUpload = canBulkUpload && typeof onBulkUpload === 'function';

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {showBulkUpload && (
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={onBulkUpload}
          >
            <Upload className="h-4 w-4" />
            {bulkUploadLabel}
          </Button>
        )}
        {showCreate && (
          <Button
            className="flex items-center gap-2"
            onClick={onCreate}
          >
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
