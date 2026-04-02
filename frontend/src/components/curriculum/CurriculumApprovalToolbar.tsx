import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Send, 
  RotateCcw, 
  AlertCircle, 
  Lock, 
  Unlock, 
  MessageSquare,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface CurriculumApproval {
  status: 'draft' | 'submitted' | 'approved' | 'returned';
  return_comment?: string;
  submitted_at?: string;
  approved_at?: string;
  returned_at?: string;
}

interface CurriculumApprovalToolbarProps {
  approval?: CurriculumApproval;
  userRole: 'schooladmin' | 'sektoradmin' | 'regionadmin' | 'superadmin';
  onSubmit: () => Promise<void>;
  onApprove: () => Promise<void>;
  onReturn: (comment: string) => Promise<void>;
  onReset: () => Promise<void>;
  isProcessing?: boolean;
  deadline?: string | null;
  isMinimal?: boolean;
}

export const CurriculumApprovalToolbar: React.FC<CurriculumApprovalToolbarProps> = ({
  approval = { status: 'draft' },
  userRole,
  onSubmit,
  onApprove,
  onReturn,
  onReset,
  isProcessing = false,
  deadline = null,
  isMinimal = false,
}) => {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnComment, setReturnComment] = useState('');

  const statusConfig = {
    draft: {
      label: 'Qaralama',
      icon: <Clock className="h-5 w-5" />,
      color: 'bg-slate-100 text-slate-600 border-slate-200',
      description: 'Plan hələ təsdiqə göndərilməyib.',
      accent: 'indigo'
    },
    submitted: {
      label: 'Yoxlanılır',
      icon: <Send className="h-5 w-5" />,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      description: 'Sektor tərəfindən yoxlanışdadır.',
      accent: 'blue'
    },
    approved: {
      label: 'Təsdiq Edilib',
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      description: 'Tədris planı rəsmi təsdiqlənib.',
      accent: 'emerald'
    },
    returned: {
      label: 'Geri Qaytarılıb',
      icon: <RotateCcw className="h-5 w-5" />,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
      description: 'Düzəliş üçün geri qaytarılıb.',
      accent: 'amber'
    }
  };

  const config = statusConfig[approval.status] || statusConfig.draft;

  const handleReturn = async () => {
    if (!returnComment.trim() || returnComment.trim().length < 5) return;
    try {
      await onReturn(returnComment);
      setIsReturnModalOpen(false);
      setReturnComment('');
    } catch (error) {
      // Modal stays open so user can fix and retry
      console.error('Return action failed:', error);
    }
  };

  return (
    <TooltipProvider>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mb-8"
      >
        <Card className={cn(
          "transition-all duration-500 overflow-hidden relative group border border-slate-100 bg-white",
          isMinimal 
            ? "flex flex-row items-center justify-between p-0 rounded-none h-auto gap-4 bg-transparent border-none shadow-none" 
            : "flex flex-col lg:flex-row lg:items-center justify-between p-6 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 gap-4 min-h-[120px]",
          !isMinimal && (approval.status === 'approved' ? "ring-1 ring-emerald-500/5" : 
          approval.status === 'submitted' ? "ring-1 ring-blue-500/5" :
          approval.status === 'returned' ? "ring-1 ring-amber-500/5" : "")
        )}>
          {/* Subtle Background Accent (Only for non-minimal) */}
          {!isMinimal && (
            <div className={cn(
              "absolute top-0 left-0 w-1.5 h-full transition-colors duration-500",
              approval.status === 'approved' ? "bg-emerald-500" : 
              approval.status === 'submitted' ? "bg-blue-500" :
              approval.status === 'returned' ? "bg-amber-500" : "bg-slate-300"
            )} />
          )}

          {/* 1. LEFT: Icon & Identity (Only for non-minimal) */}
          {!isMinimal && (
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex-shrink-0 flex items-center justify-center shadow-inner border transition-all duration-500 w-16 h-16 rounded-[2rem] group-hover:scale-105",
                config.color
              )}>
                {config.icon}
              </div>
              <div className="flex flex-col space-y-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Cari Status</span>
                <span className={cn("border shadow-sm py-1.5 px-4 rounded-full uppercase tracking-wider text-[11px] font-black", config.color)}>
                  {config.label}
                </span>
              </div>
            </div>
          )}

          {/* 2. MIDDLE: Status Label & Info (Integrated for minimal) */}
          <div className={cn(
             "flex items-center gap-4 transition-all transition-opacity px-4 border-l border-slate-100/50 ml-4",
             isMinimal ? "opacity-100" : "opacity-0 invisible h-0 w-0"
          )}>
            <span className={cn(
              "font-black py-1.5 px-4 rounded-full text-[11px] border shadow-sm transition-all whitespace-nowrap uppercase tracking-wider",
              config.color
            )}>
              {config.label}
            </span>
            <h3 className="font-bold text-slate-500 text-[13px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[400px] italic">
              {config.description}
            </h3>
          </div>

          {!isMinimal && (
            <h3 className="font-black text-slate-900 uppercase italic tracking-tight text-lg leading-none">
              {config.description}
            </h3>
          )}

          {/* 3. RIGHT: Actions & Deadline */}
          <div className="flex items-center gap-4">
            {deadline && (approval.status === 'draft' || approval.status === 'returned' || approval.status === 'submitted') && (
              <div className={cn(
                "flex border-slate-200/60 transition-all",
                isMinimal ? "flex-row items-center gap-2 pl-3 border-l" : "hidden sm:flex flex-col border-l pl-6 ml-2"
              )}>
                {!isMinimal && (
                  <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                    <Clock className="h-3 w-3" /> Son Tarix
                  </div>
                )}
                <div className={cn(
                  "font-bold tracking-tight tabular-nums whitespace-nowrap",
                  isMinimal ? "text-[8px] text-slate-400" : "text-base text-slate-800 font-black tracking-tighter",
                )}>
                  {isMinimal && <Clock size={8} className="inline mr-1 opacity-50" />}
                  {format(new Date(deadline), isMinimal ? 'dd.MM HH:mm' : 'dd.MM.yyyy HH:mm')}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5">
            {/* School Admin Actions */}
            {userRole === 'schooladmin' && (
              <>
                {(approval.status === 'draft' || approval.status === 'returned') && (
                  <Button 
                    onClick={onSubmit} 
                    disabled={isProcessing}
                    className={cn(
                      "text-white shadow-md transition-all hover:scale-105 active:scale-[0.98]",
                      isMinimal ? "h-10 bg-slate-900 hover:bg-slate-800 rounded-xl px-5 font-black text-[11px] uppercase tracking-widest" : "h-14 bg-slate-900 hover:bg-slate-800 rounded-2xl px-8 font-black uppercase tracking-[0.2em]"
                    )}
                  >
                    <Send className={cn("mr-1", isMinimal ? "h-4 w-4" : "mr-3 h-4 w-4")} /> Təsdiqə Göndər
                  </Button>
                )}
                {approval.status === 'submitted' && (
                  <div className={cn(
                    "flex items-center gap-2 text-blue-700",
                    isMinimal ? "px-4 py-2 rounded-xl bg-blue-50/50 border border-blue-100" : "px-6 py-4 rounded-[1.5rem] bg-blue-50/50 border border-blue-100"
                  )}>
                    <Lock className={cn(isMinimal ? "h-4 w-4" : "h-4 w-4")} /> 
                    <span className={cn(isMinimal ? "text-[10px] font-black uppercase tracking-widest" : "text-[11px] font-black uppercase tracking-widest")}>Gözləmədə</span>
                  </div>
                )}
                {approval.status === 'approved' && (
                  <div className={cn(
                    "flex items-center gap-2 text-emerald-700",
                    isMinimal ? "px-4 py-2 rounded-xl bg-emerald-50/50 border border-emerald-100" : "px-6 py-4 rounded-[1.5rem] bg-emerald-50/50 border border-emerald-100"
                  )}>
                    <CheckCircle2 className={cn(isMinimal ? "h-4 w-4" : "h-4 w-4")} /> 
                    <span className={cn(isMinimal ? "text-[10px] font-black uppercase tracking-widest" : "text-[11px] font-black uppercase tracking-widest")}>Təsdiqlənib</span>
                  </div>
                )}
              </>
            )}

            {/* Sector Admin Actions */}
            {userRole === 'sektoradmin' && (
              <>
                {approval.status === 'submitted' && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsReturnModalOpen(true)}
                      disabled={isProcessing}
                      className={cn(
                        "border-amber-200 bg-white text-amber-600 hover:bg-amber-50 transition-all",
                        isMinimal ? "h-10 rounded-xl px-4 font-black text-[10px] uppercase tracking-widest" : "h-12 rounded-2xl px-6 font-black uppercase tracking-widest text-[10px]"
                      )}
                    >
                      <RotateCcw className={cn("mr-1.5", isMinimal ? "h-4 w-4" : "h-4 w-4")} /> Geri
                    </Button>
                    <Button 
                      onClick={onApprove}
                      disabled={isProcessing}
                      className={cn(
                        "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all",
                        isMinimal ? "h-10 rounded-xl px-6 font-black text-[11px] uppercase tracking-[0.2em]" : "h-12 rounded-2xl px-8 font-black uppercase tracking-[0.2em] text-[10px]"
                      )}
                    >
                      <CheckCircle2 className={cn("mr-1.5", isMinimal ? "h-4 w-4" : "h-4 w-4")} /> Təsdiqlə
                    </Button>
                  </div>
                )}
                {approval.status === 'approved' && (
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center border border-emerald-100 bg-emerald-50/50 text-emerald-700",
                      isMinimal ? "px-3 py-2 rounded-lg gap-2" : "px-6 py-3 rounded-2xl gap-3"
                    )}>
                      <CheckCircle2 className={cn(isMinimal ? "h-3.5 w-3.5" : "h-4 w-4")} /> 
                      <span className={cn(isMinimal ? "text-xs font-medium" : "text-[11px] font-black uppercase tracking-widest")}>Təsdiq Edilib</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Region / Super Admin Actions */}
            {(userRole === 'regionadmin' || userRole === 'superadmin') && (
              <Button 
                variant="outline" 
                onClick={onReset}
                disabled={isProcessing}
                className={cn(
                  "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-sm transition-all hover:scale-105",
                  isMinimal ? "h-9 rounded-lg px-4 font-medium text-xs" : "h-12 rounded-2xl px-6 font-black uppercase tracking-widest text-[10px]"
                )}
              >
                <Unlock className={cn("mr-2", isMinimal ? "h-3.5 w-3.5" : "h-4 w-4")} /> Sıfırla (Reset)
              </Button>
            )}

            {/* Return Comment Display */}
            {approval.return_comment && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className={cn(
                    "flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all border border-amber-100 shadow-sm animate-bounce-slow",
                    isMinimal ? "w-9 h-9 rounded-lg" : "w-12 h-12 rounded-2xl"
                  )}>
                    <MessageSquare size={isMinimal ? 16 : 20} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[320px] p-6 bg-white border-0 rounded-[2rem] shadow-2xl ring-1 ring-slate-100 animate-in zoom-in-95 duration-200">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">İradlar / Şərhlər</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{approval.return_comment}"</p>
                    </div>
                    {approval.returned_at && (
                      <div className="flex items-center justify-end px-1">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">
                          {format(new Date(approval.returned_at), 'dd.MM.yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            </div>
          </div>
        </Card>

        {/* Return Modal */}
        <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
          <DialogContent className="max-w-[550px] rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-white ring-1 ring-slate-100 flex flex-col items-center">
            <div className="w-full p-10 bg-gradient-to-br from-amber-50/50 to-white border-b border-amber-50/50 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-amber-200 mb-6 group-hover:rotate-12 transition-transform">
                <RotateCcw className="h-7 w-7" />
              </div>
              <DialogTitle className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">
                Planı Geri Qaytar
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-bold text-xs uppercase tracking-[0.1em] max-w-[300px] leading-relaxed">
                Məktəbə düzəliş üçün göndəriləcək rəsmi irad və ya göstərişləri qeyd edin.
              </DialogDescription>
            </div>
            
            <div className="w-full p-10 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">İradın Səbəbi</Label>
                  <span className={cn(
                    "text-[9px] font-black uppercase transition-colors",
                    returnComment.trim().length >= 5 ? "text-emerald-500" : "text-amber-500"
                  )}>
                    {returnComment.trim().length < 5 ? "Min. 5 simvol" : "Tamamdır"}
                  </span>
                </div>
                <div className="relative group">
                  <Textarea 
                    value={returnComment}
                    onChange={(e) => setReturnComment(e.target.value)}
                    placeholder="Məsələn: 9-cu sinif planında dərnək saatları kəsir göstərir..."
                    className="min-h-[160px] p-6 rounded-[2rem] bg-slate-50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-200 transition-all font-medium text-sm leading-relaxed resize-none shadow-inner"
                  />
                  <div className="absolute bottom-4 right-6 pointer-events-none opacity-20">
                    <MessageSquare size={24} className="text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="w-full p-10 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center">
              <Button 
                variant="ghost" 
                onClick={() => setIsReturnModalOpen(false)} 
                className="w-full sm:w-auto px-8 h-14 rounded-2xl font-black text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all uppercase tracking-widest text-[10px]"
              >
                Ləğv et
              </Button>
              <Button 
                onClick={handleReturn}
                disabled={returnComment.trim().length < 5 || isProcessing}
                className="w-full sm:flex-1 h-14 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl px-10 font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isProcessing ? "Geri qaytarılır..." : "Təsdiqlə və Geri Qaytar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </TooltipProvider>
  );
};
