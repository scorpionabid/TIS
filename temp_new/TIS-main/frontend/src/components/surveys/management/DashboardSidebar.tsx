import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, LayoutGrid, List as ListIcon, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SurveyListItem } from './SurveyListItem';
import type { UnifiedItem } from '@/pages/surveys/ManagerSurveyDashboard';

type ViewMode = 'card' | 'list';

const RESP_BADGE: Record<string, { label: string; cls: string }> = {
  new:         { label: 'Yeni',        cls: 'bg-blue-100 text-blue-700 border-blue-200'    },
  in_progress: { label: 'Davam edir',  cls: 'bg-sky-100 text-sky-700 border-sky-200'       },
  draft:       { label: 'Qaralama',    cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  submitted:   { label: 'Göndərilib',  cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  approved:    { label: 'Təsdiqlənib', cls: 'bg-green-100 text-green-700 border-green-200' },
  rejected:    { label: 'Rədd edilib', cls: 'bg-red-100 text-red-700 border-red-200'       },
  completed:   { label: 'Tamamlanıb',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const SURVEY_BADGE: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Qaralama',     cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  published: { label: 'Yayımlanıb',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  active:    { label: 'Aktiv',        cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  paused:    { label: 'Dayandırılıb', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  archived:  { label: 'Arxiv',        cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const MONITOR_BADGE = { label: 'Nəzarət', cls: 'bg-violet-100 text-violet-700 border-violet-200' };

interface DashboardSidebarProps {
  items: UnifiedItem[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  search: string;
  setSearch: (val: string) => void;
  viewMode: ViewMode;
  setViewMode: (val: ViewMode) => void;
  completionMap: Record<number, number>;
}

function getBadge(item: UnifiedItem): { label: string; cls: string } {
  if (item.origin === 'monitoring') return MONITOR_BADGE;
  if (item.origin === 'respond')    return RESP_BADGE[item.status] ?? { label: item.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return SURVEY_BADGE[item.status] ?? { label: item.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
}

function getMeta(item: UnifiedItem): string {
  const parts: string[] = [];
  if (item.origin === 'own' && item.responseCount != null) parts.push(`${item.responseCount} cavab`);
  if (item.questionsCount != null) parts.push(`${item.questionsCount} sual`);
  if (item.creatorInfo && item.origin !== 'own') parts.push(item.creatorInfo);
  return parts.join(' · ');
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  items,
  selectedId,
  setSelectedId,
  search,
  setSearch,
  viewMode,
  setViewMode,
  completionMap,
}) => {
  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded">
            {(['card', 'list'] as ViewMode[]).map((m, i) => {
              const Icon = i === 0 ? LayoutGrid : ListIcon;
              return (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={cn(
                    'p-1.5 rounded transition-all',
                    viewMode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-400 hover:text-slate-600',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
          <span className="text-xs text-slate-400 font-medium">{items.length} sorğu</span>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Axtar..."
            className="pl-8 h-8 text-sm bg-white border-slate-200"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Inbox className="h-8 w-8 mb-2" />
            <p className="text-sm">Bu kateqoriyada sorğu yoxdur</p>
          </div>
        ) : (
          items.map(item => {
            const badge = getBadge(item);
            const completion = item.origin !== 'respond' ? completionMap[item.surveyId] : undefined;
            return (
              <SurveyListItem
                key={item.id}
                title={item.title}
                badge={badge.label}
                badgeCls={badge.cls}
                meta={getMeta(item)}
                isSelected={selectedId === item.id}
                viewMode={viewMode}
                onClick={() => setSelectedId(item.id)}
                completion={completion}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
