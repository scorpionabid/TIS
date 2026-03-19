import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Database, RefreshCw, Search, Table2 } from 'lucide-react';
import type { DbColumn, DbTable } from '@/types/aiAnalysis';

// ─── Props ────────────────────────────────────────────────────

interface SchemaExplorerProps {
  tables: DbTable[];
  isLoading: boolean;
  onRefresh: () => void;
  onTableClick?: (tableName: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────

type ColumnColorKey = 'blue' | 'green' | 'yellow' | 'red' | 'gray';

function getColumnTypeColor(type: string): ColumnColorKey {
  const t = type.toLowerCase();
  if (t.includes('int') || t.includes('bigint') || t.includes('serial') || t.includes('numeric') || t.includes('decimal') || t.includes('float')) {
    return 'blue';
  }
  if (t.includes('varchar') || t.includes('text') || t.includes('char') || t.includes('uuid') || t.includes('json')) {
    return 'green';
  }
  if (t.includes('timestamp') || t.includes('date') || t.includes('time')) {
    return 'yellow';
  }
  if (t.includes('bool')) {
    return 'red';
  }
  return 'gray';
}

const colorClassMap: Record<ColumnColorKey, string> = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
};

// ─── Sub-components ───────────────────────────────────────────

interface ColumnRowProps {
  column: DbColumn;
  sampleValues: string[];
}

const ColumnRow: React.FC<ColumnRowProps> = ({ column, sampleValues }) => {
  const colorKey = getColumnTypeColor(column.type);
  const colorClass = colorClassMap[colorKey];
  const shortType = column.type.split('(')[0].toLowerCase();

  return (
    <div className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50 group">
      <div className="flex items-center gap-2 min-w-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm text-foreground truncate cursor-default">
                {column.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs font-mono text-muted-foreground">{column.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {column.nullable && (
          <span className="text-xs text-muted-foreground shrink-0">nullable</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {sampleValues.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground cursor-help underline decoration-dotted">
                  nümunə
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs font-mono">{sampleValues.slice(0, 3).join(', ')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Badge
          variant="outline"
          className={`text-xs font-mono px-1.5 py-0 ${colorClass}`}
        >
          {shortType}
        </Badge>
      </div>
    </div>
  );
};

interface TableItemProps {
  table: DbTable;
  onTableClick?: (tableName: string) => void;
}

const TableItem: React.FC<TableItemProps> = ({ table, onTableClick }) => {
  // Extract sample values per column from sample_data rows
  const sampleMap: Record<string, string[]> = {};
  for (const row of table.sample_data) {
    for (const [key, val] of Object.entries(row)) {
      if (!sampleMap[key]) sampleMap[key] = [];
      if (sampleMap[key].length < 3 && val !== null && val !== undefined) {
        sampleMap[key].push(String(val));
      }
    }
  }

  return (
    <AccordionItem value={table.table_name} className="border rounded-md mb-1 border-border/60">
      <AccordionTrigger
        className="px-3 py-2 hover:no-underline hover:bg-muted/40 rounded-t-md text-sm font-medium [&[data-state=open]]:rounded-b-none"
        onClick={() => onTableClick?.(table.table_name)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Table2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate text-xs cursor-default">{table.label}</span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs font-mono text-muted-foreground">{table.table_name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge variant="secondary" className="ml-2 shrink-0 text-xs font-normal">
          {table.row_count.toLocaleString()} sətir
        </Badge>
      </AccordionTrigger>
      <AccordionContent className="px-2 pb-2 pt-1">
        <div className="space-y-0.5">
          {table.columns.map((col) => (
            <ColumnRow
              key={col.name}
              column={col}
              sampleValues={sampleMap[col.name] ?? []}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────

const SchemaSkeletonList: React.FC = () => (
  <div className="space-y-1.5 p-2">
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={i} className="h-9 w-full rounded-md" />
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────

const SchemaExplorer: React.FC<SchemaExplorerProps> = ({
  tables,
  isLoading,
  onRefresh,
  onTableClick,
}) => {
  const [search, setSearch] = useState('');

  const searchLower = search.toLowerCase();
  const filtered = tables.filter(
    (t) =>
      t.table_name.toLowerCase().includes(searchLower) ||
      t.label.toLowerCase().includes(searchLower),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <div className="flex items-center gap-1.5">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Verilənlər Bazası</span>
          {!isLoading && (
            <Badge variant="secondary" className="text-xs">
              {tables.length} cədvəl
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRefresh}
          disabled={isLoading}
          title="Yenilə"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Search */}
      <div className="px-2 py-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cədvəl axtar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <SchemaSkeletonList />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Database className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">
              {search ? 'Cədvəl tapılmadı' : 'Schema yüklənmədi'}
            </p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {filtered.map((table) => (
              <TableItem
                key={table.table_name}
                table={table}
                onTableClick={onTableClick}
              />
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
};

export default SchemaExplorer;
