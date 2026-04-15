import { useNavigate } from 'react-router-dom';
import { BookOpen, Download, Loader2, LayoutDashboard, Database, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CurriculumApprovalToolbar, CurriculumApproval } from '@/components/curriculum/CurriculumApprovalToolbar';

type TabKey = 'stats' | 'yigim' | 'subjects' | 'workload' | 'class_subject' | 'grades';

interface Props {
  urlId: string | undefined;
  isSchoolAdmin: boolean;
  isSaving: boolean;
  activeYear: { name?: string } | undefined;
  approval: CurriculumApproval;
  userRole: string | undefined;
  deadline: string | undefined;
  isProcessing: boolean;
  onSubmit: () => void;
  onApprove: () => void;
  onReturn: (comment: string) => void;
  onReset: () => void;
  onExportActive: () => void;
  onExportAll: () => void;
  activeTab: TabKey;
}

export function CurriculumPageHeader({
  urlId,
  isSchoolAdmin,
  isSaving,
  activeYear,
  approval,
  userRole,
  deadline,
  isProcessing,
  onSubmit,
  onApprove,
  onReturn,
  onReset,
  onExportActive,
  onExportAll,
}: Props) {
  const navigate = useNavigate();

  return (
    <header className={cn(
      'flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-10 rounded-[3rem] border transition-all duration-500',
      isSchoolAdmin
        ? 'bg-white border-slate-200 shadow-2xl shadow-slate-200/50 mb-10'
        : 'bg-white/60 backdrop-blur-xl border-white',
    )}>
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="flex items-center gap-4">
          {urlId && (
            <button
              onClick={() => navigate('/curriculum/dashboard')}
              className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center justify-center group"
              title="Siyahıya qayıt"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
          <div className={cn(
            'w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all shrink-0',
            isSchoolAdmin
              ? 'bg-gradient-to-br from-indigo-600 to-blue-700 shadow-indigo-200/50'
              : 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-300/40',
          )}>
            <BookOpen className="text-white h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase italic leading-none">
              {isSchoolAdmin ? 'Dərs yükü və Vakansiya' : 'Kurikulum Planı'}
              {isSaving && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 text-[10px] text-amber-600 font-black bg-amber-50 px-3 py-0.5 rounded-full border border-amber-100 uppercase italic shadow-sm"
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Autosave
                </motion.span>
              )}
            </h1>
            <p className="text-xs text-slate-400 font-black italic uppercase tracking-[0.2em] mt-2 leading-none">
              {activeYear?.name || '---'} ÜZRƏ İDARƏETMƏ PANELİ
            </p>
          </div>
        </div>

        {/* Approval Toolbar */}
        <div className="flex flex-col lg:flex-row items-center gap-6 ml-auto">
          <CurriculumApprovalToolbar
            approval={approval}
            userRole={userRole}
            deadline={deadline}
            onSubmit={onSubmit}
            onApprove={onApprove}
            onReturn={onReturn}
            onReset={onReset}
            isProcessing={isProcessing}
            isMinimal={true}
          />
        </div>
      </div>

      {/* Export Actions */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <button className="flex items-center gap-3 px-8 py-5 rounded-[1.5rem] text-[11px] font-black transition-all shadow-xl border bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 hover:shadow-emerald-200/50 uppercase tracking-[0.2em]">
            <Download size={18} className="stroke-[3px]" /> EKSPORT
          </button>
          <div className="absolute right-0 top-full mt-3 w-64 bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden transform origin-top-right scale-95 group-hover:scale-100">
            <div className="p-2 space-y-1">
              <button
                onClick={onExportActive}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <LayoutDashboard size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">Cari Görünüş</p>
                  <p className="text-[9px] text-slate-400 font-bold tracking-tight">Yalnız bu tabı yüklə</p>
                </div>
              </button>
              <div className="h-px bg-slate-100 mx-2" />
              <button
                onClick={onExportAll}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-600 group/item text-left transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <Database size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-800 group-hover/item:text-white uppercase tracking-tighter text-indigo-900">Bütün Plan</p>
                  <p className="text-[9px] text-slate-400 group-hover/item:text-indigo-100 font-bold tracking-tight">Vahid Excel Faylı</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
