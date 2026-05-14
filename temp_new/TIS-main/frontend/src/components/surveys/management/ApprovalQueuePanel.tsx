import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  CheckCircle2,
  XCircle,
  Inbox,
  Building2,
  User,
  Calendar,
  ClipboardList,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/services/api';
import { toast as sonnerToast } from 'sonner';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface ApprovalItem {
  id: number;
  survey_id: number;
  survey_title: string;
  questions_count?: number;
  end_date?: string;
  institution: { id: number; name: string; sector?: string };
  respondent: string;
  status: string;
  submitted_at?: string;
  updated_at?: string;
}

interface Props {
  currentUserRole: string;
}

/* ─── Component ──────────────────────────────────────────────────────────────── */

export function ApprovalQueuePanel({ currentUserRole }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'submitted' | 'approved' | 'rejected'>('submitted');
  const [selected, setSelected] = useState<ApprovalItem | null>(null);
  const [comment, setComment] = useState('');
  const [rejectMode, setRejectMode] = useState(false);

  /* ── Roles that can approve ───────────────────────────────────────────── */
  const canApprove = ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin'].includes(
    currentUserRole
  );

  /* ── Query ────────────────────────────────────────────────────────────── */
  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['approval-queue', search, status],
    queryFn: async () => {
      const params: any = { per_page: 100, status };
      if (search.trim()) params.search = search.trim();

      // Backend response structure:
      // res.data = { success: true, data: LengthAwarePaginator }
      const res = await apiClient.get<any>('/surveys/pending-my-approval', params);
      const body      = (res as any)?.data;
      const paginator = body?.data;
      const items     = paginator?.data ?? paginator;

      return (Array.isArray(items) ? items : []) as ApprovalItem[];
    },
    enabled: canApprove,
  });

  /* ── Approve mutation ─────────────────────────────────────────────────── */
  const approveMut = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.post(`/survey-responses/${id}/approve`, { comments: comment || 'Təsdiqləndi' });
    },
    onSuccess: () => {
      sonnerToast.success('Cavab təsdiqləndi');
      setSelected(null);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
    },
    onError: () => sonnerToast.error('Təsdiqləmə zamanı xəta baş verdi'),
  });

  /* ── Reject mutation ─────────────────────────────────────────────────── */
  const rejectMut = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.post(`/survey-responses/${id}/reject`, {
        comments: comment || 'Rədd edildi',
      });
    },
    onSuccess: () => {
      sonnerToast.success('Cavab rədd edildi');
      setSelected(null);
      setComment('');
      setRejectMode(false);
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
    },
    onError: () => sonnerToast.error('Rədd zamanı xəta baş verdi'),
  });

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  const isPending = approveMut.isPending || rejectMut.isPending;

  const filtered = search.trim()
    ? raw.filter(
        (i) =>
          i.survey_title.toLowerCase().includes(search.toLowerCase()) ||
          i.institution.name.toLowerCase().includes(search.toLowerCase())
      )
    : raw;

  if (!canApprove) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm py-16">
        <AlertTriangle className="h-8 w-8 mb-2 text-amber-400" />
        <p>Bu funksiya sizin rolunuz üçün mövcud deyil</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 gap-3 overflow-hidden">
      {/* Left: list */}
      <div className="w-72 xl:w-80 shrink-0 flex flex-col gap-2 min-h-0">
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm space-y-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {[
              { id: 'submitted', label: 'Gözləyən' },
              { id: 'approved',  label: 'Təsdiqlənmiş' },
              { id: 'rejected',  label: 'Rədd edilmiş' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => { setStatus(t.id as any); setSelected(null); }}
                className={cn(
                  "flex-1 px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                  status === t.id 
                    ? "bg-white text-blue-700 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t.label.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Axtar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm border-slate-200 bg-slate-50 focus:bg-white rounded"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Inbox className="h-8 w-8 mb-2" />
              <p className="text-sm">Məlumat yoxdur</p>
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => { setSelected(item); setComment(''); setRejectMode(false); }}
                className={cn(
                  'w-full text-left rounded-lg border p-3 transition-all text-sm',
                  selected?.id === item.id
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-800 line-clamp-2 leading-snug">
                    {item.survey_title}
                  </p>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Building2 className="h-3 w-3 text-slate-400" />
                  <span className="text-xs text-slate-500 truncate">{item.institution.name}</span>
                </div>
                {item.submitted_at && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-400">
                      {format(new Date(item.submitted_at), 'dd.MM.yyyy HH:mm', { locale: az })}
                    </span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: detail + actions */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col min-h-0">
        {selected ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-start gap-3 shrink-0">
              <div className="h-10 w-10 bg-amber-50 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                <ClipboardList className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-slate-900 truncate">{selected.survey_title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs border px-1.5 py-0",
                      selected.status === 'submitted' ? "bg-amber-50 text-amber-700 border-amber-200" :
                      selected.status === 'approved' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      "bg-red-50 text-red-700 border-red-200"
                    )}
                  >
                    {selected.status === 'submitted' ? 'Təsdiq gözləyir' : 
                     selected.status === 'approved' ? 'Təsdiqlənib' : 'Rədd edilib'}
                  </Badge>
                  {selected.questions_count != null && (
                    <span className="text-xs text-slate-400">{selected.questions_count} sual</span>
                  )}
                </div>
              </div>
            </div>

            {/* Info cards */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-medium text-slate-500">Müəssisə</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{selected.institution.name}</p>
                  {selected.institution.sector && (
                    <p className="text-xs text-slate-400 mt-0.5">{selected.institution.sector}</p>
                  )}
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-medium text-slate-500">Cavablayan</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{selected.respondent || '—'}</p>
                </div>
                {selected.submitted_at && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-xs font-medium text-slate-500">Göndərilmə tarixi</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      {format(new Date(selected.submitted_at), 'dd MMMM yyyy, HH:mm', { locale: az })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions - ONLY SHOW IF SUBMITTED */}
            {selected.status === 'submitted' && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                {rejectMode ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-red-600 px-1 uppercase tracking-wider">İmtina səbəbi:</p>
                    <textarea
                      className="w-full rounded-md border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all"
                      rows={3}
                      placeholder="Məktəbə göndəriləcək qeyd..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        className="flex-1 font-bold h-10 shadow-sm"
                        onClick={() => rejectMut.mutate(selected.id)}
                        disabled={isPending}
                      >
                        {rejectMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                        RƏDD ET
                      </Button>
                      <Button
                        variant="outline"
                        className="font-bold h-10 px-6 border-slate-200"
                        onClick={() => setRejectMode(false)}
                        disabled={isPending}
                      >
                        LƏĞV ET
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-[hsl(220_85%_25%)] hover:bg-[hsl(220_85%_30%)] font-bold h-11 shadow-sm"
                        onClick={() => approveMut.mutate(selected.id)}
                        disabled={isPending}
                      >
                        {approveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        TƏSDİQLƏ
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50 font-bold h-11"
                        onClick={() => setRejectMode(true)}
                        disabled={isPending}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        RƏDD ET
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="h-12 w-12 bg-amber-50 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-amber-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700">Cavab seçilməyib</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-xs">
              Təsdiq etmək üçün sol siyahıdan bir cavab seçin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
