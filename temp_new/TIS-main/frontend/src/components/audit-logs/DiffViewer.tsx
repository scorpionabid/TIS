import React from 'react';
import { Badge } from '@/components/ui/badge';

interface DiffViewerProps {
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ oldValues, newValues }) => {
  if (!newValues) return <div className="text-muted-foreground italic text-sm">Məlumat yoxdur</div>;
  
  const oldVal = oldValues || {};
  const newVal = newValues || {};
  
  // Get all unique keys from both objects
  const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));
  
  // Filter only keys where values have changed
  const changedKeys = allKeys.filter(key => {
    const v1 = oldVal[key];
    const v2 = newVal[key];
    
    // Simple comparison for primitive types
    if (v1 === v2) return false;
    
    // JSON stringify comparison for objects/arrays
    if (typeof v1 === 'object' || typeof v2 === 'object') {
      return JSON.stringify(v1) !== JSON.stringify(v2);
    }
    
    return v1 !== v2;
  });

  if (changedKeys.length === 0) {
    return <div className="text-muted-foreground text-sm">Dəyişiklik yoxdur</div>;
  }

  return (
    <div className="space-y-4">
      {changedKeys.map(key => {
        const v1 = oldVal[key];
        const v2 = newVal[key];
        
        const renderValue = (val: any) => {
          if (val === null) return <span className="text-muted-foreground italic">null</span>;
          if (val === undefined) return <span className="text-muted-foreground italic">yoxdur</span>;
          if (typeof val === 'boolean') return <span>{val ? 'Bəli' : 'Xeyr'}</span>;
          if (typeof val === 'object') return <pre className="text-[10px] m-0 bg-slate-50 p-1 rounded">{JSON.stringify(val, null, 2)}</pre>;
          return <span>{String(val)}</span>;
        };

        return (
          <div key={key} className="border rounded-lg overflow-hidden border-slate-100 shadow-sm">
            <div className="bg-slate-50/50 px-3 py-1.5 border-b border-slate-100 flex justify-between items-center">
              <span className="font-mono text-xs font-bold text-blue-700">{key}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Old value */}
              <div className="p-3 bg-red-50/30">
                <div className="text-[10px] uppercase text-red-500 font-bold mb-1">Köhnə</div>
                <div className="text-sm line-through text-red-700 opacity-60">
                  {renderValue(v1)}
                </div>
              </div>
              {/* New value */}
              <div className="p-3 bg-green-50/30">
                <div className="text-[10px] uppercase text-green-500 font-bold mb-1">Yeni</div>
                <div className="text-sm text-green-700 font-medium">
                  {renderValue(v2)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
