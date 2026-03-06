import React from 'react';
import { TableHead, TableHeader, TableRow } from '../../../ui/table';
import { Checkbox } from '../../../ui/checkbox';
import { Button } from '../../../ui/button';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface SortableHeaderProps {
  field: string;
  children: React.ReactNode;
  className?: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  field,
  children,
  className = '',
  sortField,
  sortDirection,
  onSort
}) => {
  const isActive = sortField === field;
  const getSortIcon = () => {
    if (!isActive) return ArrowUpDown;
    return sortDirection === 'asc' ? ArrowUp : ArrowDown;
  };

  const SortIcon = getSortIcon();

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs font-medium hover:bg-muted/50 justify-start p-2"
        onClick={() => onSort(field)}
      >
        {children}
        <SortIcon className={`ml-1 h-3 w-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
      </Button>
    </TableHead>
  );
};

interface ResponseTableHeaderProps {
  selectAll: boolean;
  onSelectAll: (checked: boolean) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  selectedCount: number;
  totalCount: number;
}

const ResponseTableHeader: React.FC<ResponseTableHeaderProps> = ({
  selectAll,
  onSelectAll,
  sortField,
  sortDirection,
  onSort,
  selectedCount,
  totalCount
}) => {

  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent border-b-2">
        {/* Selection Column */}
        <TableHead className="w-12">
          <div className="flex items-center justify-center">
            <Checkbox
              checked={selectAll}
              onCheckedChange={onSelectAll}
              aria-label={`Select all responses (${selectedCount}/${totalCount})`}
              className="border-2"
            />
          </div>
        </TableHead>

        {/* Institution Column */}
        <SortableHeader
          field="institution_name"
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
          className="min-w-[200px]"
        >
          Müəssisə
        </SortableHeader>

        {/* Respondent Column */}
        <SortableHeader
          field="respondent_name"
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
          className="min-w-[150px]"
        >
          Cavabverən
        </SortableHeader>

        {/* Progress Column */}
        <SortableHeader
          field="progress_percentage"
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
          className="w-32"
        >
          İrəliləmə
        </SortableHeader>

        {/* Status Column */}
        <SortableHeader
          field="status"
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
          className="w-24 text-center"
        >
          Status
        </SortableHeader>

        {/* Submitted Date Column */}
        <SortableHeader
          field="submitted_at"
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
          className="w-40"
        >
          Təqdim Tarixi
        </SortableHeader>

        {/* Approval Column */}
        <TableHead className="w-40 text-center">
          <span className="text-xs font-medium">Təsdiq</span>
        </TableHead>

        {/* Actions Column */}
        <TableHead className="w-24 text-center">
          <span className="text-xs font-medium">Əməliyyatlar</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default React.memo(ResponseTableHeader);