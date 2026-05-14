import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AuditLogEntry } from '@/services/auditLogService';
import { DiffViewer } from './DiffViewer';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { User, Activity, Globe, Monitor, Clock, Landmark } from 'lucide-react';

interface AuditLogDetailSheetProps {
  log: AuditLogEntry | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AuditLogDetailSheet: React.FC<AuditLogDetailSheetProps> = ({ log, isOpen, onOpenChange }) => {
  if (!log) return null;

  const getEventColor = (event: string) => {
    switch (event) {
      case 'created': return 'bg-green-500';
      case 'updated': return 'bg-blue-500';
      case 'deleted': return 'bg-red-500';
      case 'authentication': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col">
        <SheetHeader className="p-6 border-b bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={getEventColor(log.event)}>{log.event}</Badge>
            <span className="text-xs text-muted-foreground font-mono">ID: #{log.id}</span>
          </div>
          <SheetTitle className="text-2xl font-bold">Audit Detalları</SheetTitle>
          <SheetDescription>
            {log.auditable_type?.split('\\').pop()} #{log.auditable_id} üzərində icra edilən əməliyyat
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {/* Context Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-blue-100 p-2 rounded-lg text-blue-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">İstifadəçi</div>
                    <div className="text-sm font-medium">
                      {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Sistem'}
                    </div>
                    {log.user && <div className="text-xs text-muted-foreground">@{log.user.username}</div>}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-purple-100 p-2 rounded-lg text-purple-600">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Müəssisə</div>
                    <div className="text-sm font-medium">{log.institution?.name || '-'}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-green-100 p-2 rounded-lg text-green-600">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Şəbəkə Məlumatı</div>
                    <div className="text-sm font-medium">IP: {log.ip_address || 'naməlum'}</div>
                    <div className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={log.url || ''}>
                      {log.url}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-orange-100 p-2 rounded-lg text-orange-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Tarix</div>
                    <div className="text-sm font-medium">
                      {format(new Date(log.created_at), 'dd MMMM yyyy HH:mm:ss', { locale: az })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Changes / Diff Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <h3 className="font-bold text-sm">Dəyişikliklər</h3>
              </div>
              <DiffViewer oldValues={log.old_values} newValues={log.new_values} />
            </div>

            {/* Technical Metadata */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-3">
              <div className="flex items-start gap-2 text-slate-500">
                <Monitor className="h-4 w-4 mt-1" />
                <div className="text-[11px] leading-relaxed break-all font-mono">
                  {log.user_agent}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
