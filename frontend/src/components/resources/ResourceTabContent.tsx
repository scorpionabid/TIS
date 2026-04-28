import { Search, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AssignedResourceGrid } from './AssignedResourceGrid';
import type { AssignedResource } from '@/types/resources';

type SortBy = 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc';

interface ResourceTabContentProps {
  resources: AssignedResource[];
  isLoading: boolean;
  resourceType: 'link' | 'document';
  isManager: boolean | null | undefined;
  currentUserId: number | undefined;
  currentUserRole?: string;
  searchTerm: string;
  sortBy: SortBy;
  onSearchChange: (v: string) => void;
  onSortChange: (v: SortBy) => void;
  onResourceAction: (resource: AssignedResource, action: 'view' | 'access' | 'download' | 'preview') => void;
  onCardClick: (resource: AssignedResource) => void;
  onEdit: (resource: AssignedResource) => void;
  onDelete: (resource: AssignedResource) => void;
  onCreateNew: () => void;
}

export function ResourceTabContent({
  resources,
  isLoading,
  resourceType,
  isManager,
  currentUserId,
  currentUserRole,
  searchTerm,
  sortBy,
  onSearchChange,
  onSortChange,
  onResourceAction,
  onCardClick,
  onEdit,
  onDelete,
  onCreateNew,
}: ResourceTabContentProps) {
  const isLink = resourceType === 'link';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
            <Input
              type="text"
              placeholder={isLink ? 'Link axtarın...' : 'Sənəd axtarın...'}
              className="pl-9 h-8 text-sm"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortBy)}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="Sırala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Ən yeni əvvəl</SelectItem>
              <SelectItem value="date_asc">Ən köhnə əvvəl</SelectItem>
              <SelectItem value="title_asc">Ad (A → Z)</SelectItem>
              <SelectItem value="title_desc">Ad (Z → A)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isManager && (
          <Button
            size="sm"
            variant="default"
            className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700"
            onClick={onCreateNew}
          >
            <Plus className="h-3.5 w-3.5" />
            {isLink ? 'Yeni Link' : 'Yeni Sənəd'}
          </Button>
        )}
      </div>

      <AssignedResourceGrid
        resources={resources}
        onResourceAction={onResourceAction}
        onCardClick={onCardClick}
        onEdit={onEdit}
        onDelete={onDelete}
        isManager={!!isManager}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
