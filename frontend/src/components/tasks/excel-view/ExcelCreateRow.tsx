/**
 * ExcelCreateRow Component
 *
 * Always-visible create row at the bottom of Excel table
 */

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExcelCreateRowProps {
  onCreateClick: () => void;
  colSpan: number;
}

export function ExcelCreateRow({ onCreateClick, colSpan }: ExcelCreateRowProps) {
  return (
    <tr className="border-t-2 border-primary/20 bg-muted/20 hover:bg-muted/40 transition-colors">
      <td colSpan={colSpan} className="px-4 py-3">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-muted-foreground hover:text-primary',
            'transition-colors group'
          )}
          onClick={onCreateClick}
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <span className="font-medium">Yeni tapşırıq yarat</span>
            <span className="text-xs text-muted-foreground/60">
              (və ya modalı açmaq üçün klikləyin)
            </span>
          </div>
        </Button>
      </td>
    </tr>
  );
}
