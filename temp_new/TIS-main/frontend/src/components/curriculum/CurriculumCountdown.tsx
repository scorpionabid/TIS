import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { curriculumService } from '@/services/curriculumService';
import { Clock, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export const CurriculumCountdown: React.FC = () => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['curriculum-settings'],
    queryFn: () => curriculumService.getSettings(),
    refetchInterval: 60000, // Refresh every minute
  });

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    if (!settings?.deadline) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const deadline = new Date(settings.deadline).getTime();
      const now = new Date().getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        isExpired: false,
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [settings?.deadline]);

  if (isLoading || (!settings?.deadline && !settings?.is_locked)) return null;

  const isWarning = timeLeft && !timeLeft.isExpired && timeLeft.days < 3;
  const isCritical = timeLeft && !timeLeft.isExpired && timeLeft.days < 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-2xl border shadow-sm backdrop-blur-md transition-all duration-500",
          settings?.is_locked 
            ? "bg-rose-50 border-rose-100 text-rose-600" 
            : timeLeft?.isExpired 
              ? "bg-slate-100 border-slate-200 text-slate-500"
              : isCritical 
                ? "bg-amber-50 border-amber-100 text-amber-600 animate-pulse"
                : "bg-indigo-50/50 border-indigo-100/50 text-indigo-600"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center shadow-inner",
          settings?.is_locked ? "bg-rose-600 text-white" : "bg-white/80"
        )}>
          {settings?.is_locked ? <Lock size={16} /> : <Clock size={16} />}
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-tighter opacity-70 leading-none mb-1">
            {settings?.is_locked ? 'DƏRS BÖLGÜSÜ SİSTEMİ' : 'TƏDRİS PLANI ÜÇÜN QALAN VAXT:'}
          </span>
          
          {settings?.is_locked ? (
            <span className="text-sm font-black tracking-tight uppercase">Qəbul dayandırılıb</span>
          ) : timeLeft ? (
            <div className="flex items-center gap-1.5 text-sm font-black tracking-tight tabular-nums">
              {timeLeft.isExpired ? (
                <span className="text-rose-500 flex items-center gap-1">
                  <AlertTriangle size={14} /> Vaxt bitib
                </span>
              ) : (
                <>
                  {timeLeft.days > 0 && <span>{timeLeft.days}d</span>}
                  <span>{timeLeft.hours.toString().padStart(2, '0')}saat</span>
                  <span>{timeLeft.minutes.toString().padStart(2, '0')}dəq</span>
                  <span className="text-[10px] opacity-60 w-4 font-bold">{timeLeft.seconds.toString().padStart(2, '0')}s</span>
                </>
              )}
            </div>
          ) : (
            <span className="text-sm font-bold opacity-40">Müddət təyin edilməyib</span>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
