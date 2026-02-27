import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Table2 } from 'lucide-react';
import { TableEntryCard } from '@/components/reporttables/TableEntryCard';
import { reportTableService } from '@/services/reportTables';
import type { ReportTable } from '@/types/reportTable';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportTableEntry() {
  const [responseStatuses, setResponseStatuses] = useState<Record<number, 'draft' | 'submitted'>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['report-tables-my'],
    queryFn: () => reportTableService.getMyTables(),
  });

  const tables: ReportTable[] = useMemo(() => data ?? [], [data]);

  const handleStatusChange = useCallback((tableId: number, status: 'draft' | 'submitted') => {
    setResponseStatuses((prev) => ({ ...prev, [tableId]: status }));
  }, []);

  const submittedCount = Object.values(responseStatuses).filter((s) => s === 'submitted').length;
  const progressPct = tables.length > 0 ? Math.round((submittedCount / tables.length) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Table2 className="h-6 w-6 text-emerald-600" />
          Hesabat Cədvəlləri
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Aşağıdakı cədvəlləri dolduraraq göndərin.
        </p>
      </div>

      {/* Progress summary */}
      {!isLoading && tables.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Ümumi tamamlanma</span>
            <span className="text-sm text-gray-500">{submittedCount}/{tables.length} cədvəl göndərilib</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          {submittedCount === tables.length && (
            <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Bütün cədvəllər göndərildi!
            </p>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Table2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Aktiv cədvəl yoxdur</p>
          <p className="text-sm mt-1">Sizə hələ heç bir hesabat cədvəli təyin edilməyib.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {tables.map((table) => (
            <TableEntryCard
              key={table.id}
              table={table}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
