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
      'flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-[2rem] border transition-all duration-500',
      isSchoolAdmin
        ? 'bg-white border-slate-200 shadow-xl shadow-slate-200/40 mb-6'
        : 'bg-white/60 backdrop-blur-xl border-white',
    )}>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="flex items-center gap-3">
          {urlId && (
            <button
              onClick={() => navigate('/curriculum/dashboard')}
              className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center justify-center group"
              title="Siyahıya qayıt"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
          <div className={cn(
            'w-12 h-12 rounded-[1.25rem] flex items-center justify-center shadow-xl transition-all shrink-0',
            isSchoolAdmin
              ? 'bg-gradient-to-br from-indigo-600 to-blue-700 shadow-indigo-200/50'
              : 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-300/40',
          )}>
            <BookOpen className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase italic leading-none">
              {isSchoolAdmin ? 'Dərs yükü və Vakansiya' : 'Kurikulum Planı'}
              {isSaving && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 text-[9px] text-amber-600 font-black bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase italic shadow-sm"
                >
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  Yadda saxlanılır
                </motion.span>
              )}
            </h1>
            <p className="text-[10px] text-slate-400 font-black italic uppercase tracking-[0.2em] mt-2 leading-none">
              {activeYear?.name || '---'} ÜZRƏ İDARƏETMƏ PANELİ
            </p>
          </div>
        </div>
 
        {/* Approval Toolbar */}
        <div className="flex flex-col lg:flex-row items-center gap-4 ml-auto">
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
      <div className="flex items-center gap-3">
        <div className="relative group">
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black transition-all shadow-lg border bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 hover:shadow-emerald-200/50 uppercase tracking-[0.1em]">
            <Download size={16} className="stroke-[3px]" /> EKSPORT
          </button>
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden transform origin-top-right scale-95 group-hover:scale-100">
            <div className="p-1.5 space-y-0.5">
              <button
                onClick={onExportActive}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <LayoutDashboard size={14} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-800 uppercase tracking-tighter">Cari Görünüş</p>
                  <p className="text-[8px] text-slate-400 font-bold tracking-tight">Yalnız bu tabı yüklə</p>
                </div>
              </button>
              <div className="h-px bg-slate-100 mx-2" />
              <button
                onClick={onExportAll}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-600 group/item text-left transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <Database size={14} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-800 group-hover/item:text-white uppercase tracking-tighter">Bütün Plan</p>
                  <p className="text-[8px] text-slate-400 group-hover/item:text-indigo-100 font-bold tracking-tight">Vahid Excel Faylı</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
