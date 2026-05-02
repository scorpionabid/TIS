import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, FileDown, ClipboardList, Inbox as InboxIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { SurveyResponseForm } from '@/components/surveys/SurveyResponseForm';
import { SurveyListItem } from './SurveyListItem';

interface IncomingItem {
  id: string;
  surveyId: number;
  responseId?: number;
  title: string;
  description?: string;
  status: 'new' | 'draft' | 'submitted' | 'approved' | 'rejected' | 'completed' | 'in_progress';
  deadline?: string;
  lastUpdated?: string;
  questionsCount?: number;
}

const RESPONSE_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new:         { label: 'Yeni',        cls: 'bg-blue-100 text-blue-700 border-blue-200'       },
  in_progress: { label: 'Davam edir',  cls: 'bg-sky-100 text-sky-700 border-sky-200'          },
  draft:       { label: 'Qaralama',    cls: 'bg-amber-100 text-amber-700 border-amber-200'    },
  submitted:   { label: 'Göndərilib',  cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  approved:    { label: 'Təsdiqlənib', cls: 'bg-green-100 text-green-700 border-green-200'    },
  rejected:    { label: 'Rədd edilib', cls: 'bg-red-100 text-red-700 border-red-200'          },
  completed:   { label: 'Tamamlanıb',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

interface IncomingPanelProps {
  incomingFiltered: IncomingItem[];
  incomingCounts: { pending: number; submitted: number };
  selectedIn: string | null;
  setSelectedIn: (id: string | null) => void;
  selectedIncoming: IncomingItem | null;
  searchIn: string;
  setSearchIn: (s: string) => void;
  handleExport: (responseId: number) => void;
  exportingId: number | null;
  onResponseComplete: () => void;
  onResponseSave: () => void;
}

export function IncomingPanel({
  incomingFiltered,
  incomingCounts,
  selectedIn,
  setSelectedIn,
  selectedIncoming,
  searchIn,
  setSearchIn,
  handleExport,
  exportingId,
  onResponseComplete,
  onResponseSave,
}: IncomingPanelProps) {
  return (
    <>
      {/* Sol: incoming siyahısı */}
      <div className="w-72 xl:w-80 shrink-0 flex flex-col gap-2 min-h-0">
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 text-[10px] font-bold">
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                GÖZLƏYƏN: {incomingCounts.pending}
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                GÖNDƏRİLİB: {incomingCounts.submitted}
              </span>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Axtar..."
              value={searchIn}
              onChange={e => setSearchIn(e.target.value)}
              className="pl-8 h-8 text-sm border-slate-200 bg-slate-50 focus:bg-white rounded"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 pb-4">
          {incomingFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <InboxIcon className="h-8 w-8 mb-2" />
              <p className="text-sm">Gözləyən sorğu yoxdur</p>
            </div>
          ) : (
            incomingFiltered.map(item => {
              const st = RESPONSE_STATUS_BADGE[item.status] ?? { label: item.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
              const metaParts: string[] = [];
              if (item.questionsCount != null) metaParts.push(`${item.questionsCount} sual`);
              if (item.deadline && !isNaN(new Date(item.deadline).getTime())) {
                metaParts.push(`Son: ${format(new Date(item.deadline), 'dd.MM', { locale: az })}`);
              }
              return (
                <SurveyListItem
                  key={item.id}
                  title={item.title}
                  badge={st.label}
                  badgeCls={st.cls}
                  meta={metaParts.join(' · ')}
                  isSelected={selectedIn === item.id}
                  viewMode="card"
                  onClick={() => setSelectedIn(item.id)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Sağ: sorğu formu */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col min-h-0">
        {selectedIncoming ? (
          <>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 bg-purple-50 rounded-md flex items-center justify-center shrink-0">
                  <ClipboardList className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900 truncate">{selectedIncoming.title}</h2>
                  <div className="flex items-center gap-3 mt-0.5">
                    <Badge variant="outline" className={cn('text-xs border px-1.5 py-0', RESPONSE_STATUS_BADGE[selectedIncoming.status]?.cls)}>
                      {RESPONSE_STATUS_BADGE[selectedIncoming.status]?.label}
                    </Badge>
                    {selectedIncoming.lastUpdated && !isNaN(new Date(selectedIncoming.lastUpdated).getTime()) && (
                      <span className="text-xs text-slate-400">
                        Son yenilənmə: {format(new Date(selectedIncoming.lastUpdated), 'HH:mm', { locale: az })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {selectedIncoming.responseId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-sm shrink-0"
                  onClick={() => handleExport(selectedIncoming.responseId!)}
                  disabled={exportingId === selectedIncoming.responseId}
                >
                  <FileDown className="h-3.5 w-3.5" /> Hesabat
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <SurveyResponseForm
                  key={`${selectedIncoming.surveyId}-${selectedIncoming.responseId ?? 'new'}`}
                  surveyId={selectedIncoming.surveyId}
                  responseId={selectedIncoming.responseId}
                  onComplete={onResponseComplete}
                  onSave={onResponseSave}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4">
              <InboxIcon className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700">Sorğu seçilməyib</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-xs">
              Doldurmaq üçün sol siyahıdan bir sorğu seçin.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
