import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { 
  Clock, 
  Timer, 
  TimerReset,
  X,
  Plus,
  Play,
  Square,
  RotateCcw,
  Sun,
  Cloud,
  CloudRain,
  Moon,
  Sparkles,
  MapPin,
  Keyboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

export const GreetingHeader = () => {
  const { currentUser } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTimePanelOpen, setIsTimePanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'clock' | 'timer' | 'stopwatch'>('clock');

  // Timer & Stopwatch States
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('0');
  const [manualSeconds, setManualSeconds] = useState('0');
  
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds(s => s - 1), 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  useEffect(() => {
    let interval: any;
    if (isStopwatchRunning) {
      interval = setInterval(() => setStopwatchMs(ms => ms + 10), 10);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  const handleSetManualTimer = () => {
    const m = parseInt(manualMinutes) || 0;
    const s = parseInt(manualSeconds) || 0;
    setTimerSeconds(m * 60 + s);
    setIsTimerRunning(false);
  };

  const hour = currentTime.getHours();
  const userName = currentUser?.name || currentUser?.username || "Admin";
  const userRegion = currentUser?.region?.name || currentUser?.sector?.name || currentUser?.school?.name || "Bakı";
  
  const getWeatherData = (location: string) => {
    const loc = location.toLowerCase();
    if (loc.includes("bakı")) return { temp: 24, status: "Günəşli", icon: <Sun size={36} className="animate-spin-slow" /> };
    if (loc.includes("gəncə")) return { temp: 22, status: "Az buludlu", icon: <Cloud size={36} /> };
    if (loc.includes("sumqayıt")) return { temp: 23, status: "Küləkli", icon: <CloudRain size={36} /> };
    return { temp: 21, status: "Açıq hava", icon: <Sun size={36} /> };
  };

  const weather = getWeatherData(userRegion);

  const getGreeting = () => {
    if (hour >= 5 && hour < 12) return { text: "Sabahınız xeyir", icon: <Sun className="text-amber-500" /> };
    if (hour >= 12 && hour < 18) return { text: "Günortanız xeyir", icon: <Cloud className="text-blue-400" /> };
    if (hour >= 18 && hour < 22) return { text: "Axşamınız xeyir", icon: <CloudRain className="text-indigo-400" /> };
    return { text: "Gecəniz xeyir", icon: <Moon className="text-slate-400" /> };
  };

  const greeting = getGreeting();

  const formatStopwatch = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const csec = Math.floor((ms % 1000) / 10);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${csec.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "relative p-6 md:p-8 rounded-3xl overflow-hidden mb-4 transition-all duration-1000 bg-gradient-to-br border border-white/10 shadow-2xl from-slate-500/10 via-slate-500/5 to-transparent"
    )}>
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 flex-1">
          <div className="flex items-center gap-3 text-primary/80 font-bold tracking-widest uppercase text-[10px] md:text-xs">
            {greeting.icon}
            <span>{greeting.text}</span>
            <span className="hidden sm:block w-8 h-[1px] bg-primary/30" />
            <span className="text-muted-foreground flex items-center gap-2"><MapPin size={12} /> {userRegion}</span>
          </div>
          <h1 className="text-2xl md:text-5xl font-black tracking-tight leading-tight">
            Xoş gəldiniz, <br className="sm:hidden" /> <span className="text-primary">{userName}</span>!
            <Sparkles className="inline-block ml-3 text-amber-400 animate-pulse h-6 w-6 md:h-8 md:w-8" />
          </h1>
          <p className="text-muted-foreground font-medium text-xs md:text-lg max-w-xl">
            Sistemin cari vəziyyəti və bugünkü mühüm tədbirlərlə tanış olun.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center lg:items-end justify-center lg:border-l border-primary/10 lg:pl-8 lg:pl-12">
          <div className="flex items-center gap-6 md:gap-10">
            <div className="flex flex-col items-end border-r border-primary/10 pr-6 md:pr-10 hidden sm:flex">
              <div className="flex items-center gap-3 text-amber-500 mb-1">
                {weather.icon}
                <span className="text-3xl md:text-5xl font-black tracking-tighter">{weather.temp}°C</span>
              </div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                {userRegion}, {weather.status}
              </div>
            </div>

            <button onClick={() => setIsTimePanelOpen(true)} className="group text-center lg:text-right transition-all hover:scale-105 active:scale-95">
              <div className="text-5xl md:text-7xl font-black tracking-widest leading-none mb-2 flex items-baseline justify-center lg:justify-end gap-1">
                {format(currentTime, "HH:mm")}
                <span className="text-base md:text-xl font-bold text-primary animate-pulse tracking-normal">{format(currentTime, "ss")}</span>
              </div>
              <div className="text-[10px] md:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                {format(currentTime, "d MMMM yyyy", { locale: az })}
              </div>
              <div className="flex items-center justify-center lg:justify-end gap-2 text-[9px] font-black text-primary/40 uppercase tracking-[0.3em] group-hover:text-primary transition-colors">
                Geniş Zaman Paneli
              </div>
            </button>
          </div>
        </motion.div>
      </div>

      <Dialog open={isTimePanelOpen} onOpenChange={setIsTimePanelOpen}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-none glass-card rounded-[32px] md:rounded-[40px] modern-shadow h-[90vh] md:h-[80vh] w-[95vw]">
          <div className="flex flex-col md:flex-row h-full">
            {/* Sidebar / Top Nav on Mobile */}
            <div className="w-full md:w-24 flex md:flex-col items-center justify-center md:py-10 bg-slate-900/5 dark:bg-white/5 border-b md:border-b-0 md:border-r border-primary/5 gap-6 md:gap-10 p-4 md:p-0">
              {[
                { id: 'clock', icon: Clock, label: 'Saat' },
                { id: 'timer', icon: Timer, label: 'Taymer' },
                { id: 'stopwatch', icon: TimerReset, label: 'Saniyə' }
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("flex flex-col items-center gap-1 md:gap-2 p-2 md:p-4 rounded-2xl md:rounded-3xl transition-all group", activeTab === tab.id ? "bg-primary text-white shadow-xl shadow-primary/40 scale-110" : "text-muted-foreground hover:bg-primary/10 hover:text-primary")}>
                  <tab.icon size={window?.innerWidth < 768 ? 20 : 28} />
                  <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 p-6 md:p-12 flex flex-col bg-white/95 dark:bg-slate-950/95 relative overflow-y-auto">
              <div className="flex justify-between items-center mb-6 md:mb-10">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="h-8 md:h-12 w-1 md:w-1.5 bg-primary rounded-full" />
                  <h2 className="text-xl md:text-3xl font-black tracking-tight capitalize">{activeTab === 'clock' ? 'Canlı Saat' : activeTab === 'timer' ? 'Fokus Taymer' : 'Saniyəölçən'}</h2>
                </div>
                <button onClick={() => setIsTimePanelOpen(false)} className="p-2 md:p-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"><X size={24} /></button>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center py-4 md:py-0">
                <AnimatePresence mode="wait">
                  {activeTab === 'clock' && (
                    <motion.div key="clock" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 md:space-y-10">
                      <div className="text-6xl sm:text-8xl md:text-[12rem] font-black font-mono tracking-widest leading-none text-slate-900 dark:text-white flex items-baseline justify-center">
                        {format(currentTime, "HH:mm")}
                        <span className="text-2xl md:text-5xl ml-2 md:ml-4 text-primary animate-pulse tracking-normal">{format(currentTime, "ss")}</span>
                      </div>
                      <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-primary/5 border border-primary/10 inline-block px-6 md:px-12">
                        <div className="text-sm md:text-2xl font-bold tracking-tight">{format(currentTime, "d MMMM yyyy, EEEE", { locale: az })}</div>
                      </div>
                    </motion.div>
                  )}
                  {activeTab === 'timer' && (
                    <motion.div key="timer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl text-center space-y-8 md:space-y-12">
                      <div className="text-6xl sm:text-8xl md:text-[10rem] font-black font-mono tracking-widest leading-none">{(Math.floor(timerSeconds/60)).toString().padStart(2,'0')}:{(timerSeconds%60).toString().padStart(2,'0')}</div>
                      
                      <div className="flex flex-col items-center gap-6 bg-primary/5 p-4 md:p-8 rounded-[24px] md:rounded-[32px] border border-primary/10">
                        <div className="flex items-center gap-2 md:gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] md:text-[10px] font-black text-primary uppercase text-left">Dəqiqə</span>
                            <Input type="number" value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)} className="w-16 md:w-24 h-10 md:h-14 text-lg md:text-2xl font-black text-center rounded-lg md:rounded-xl border-primary/20" />
                          </div>
                          <span className="text-xl md:text-3xl font-black mt-4">:</span>
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] md:text-[10px] font-black text-primary uppercase text-left">Saniyə</span>
                            <Input type="number" value={manualSeconds} onChange={(e) => setManualSeconds(e.target.value)} className="w-16 md:w-24 h-10 md:h-14 text-lg md:text-2xl font-black text-center rounded-lg md:rounded-xl border-primary/20" />
                          </div>
                          <Button onClick={handleSetManualTimer} className="h-10 md:h-14 px-4 md:px-8 rounded-lg md:rounded-xl mt-4 bg-primary font-black gap-2 text-xs md:text-base"><Keyboard size={16} className="hidden sm:block" /> TƏYİN ET</Button>
                        </div>
                      </div>

                      <div className="flex gap-4 md:gap-6 justify-center">
                        <Button onClick={() => setIsTimerRunning(!isTimerRunning)} size="lg" className="rounded-2xl md:rounded-3xl h-14 md:h-20 px-8 md:px-16 text-sm md:text-xl font-black shadow-xl shadow-primary/20">{isTimerRunning ? "DURDUR" : "BAŞLAT"}</Button>
                        <Button variant="outline" onClick={() => {setTimerSeconds(0); setIsTimerRunning(false)}} size="lg" className="rounded-2xl md:rounded-3xl h-14 md:h-20 px-6 md:px-12 border-2"><RotateCcw size={24} className="md:w-8 md:h-8" /></Button>
                      </div>
                    </motion.div>
                  )}
                  {activeTab === 'stopwatch' && (
                    <motion.div key="stopwatch" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-10 md:space-y-16">
                      <div className="text-5xl sm:text-7xl md:text-[10rem] font-black font-mono tracking-widest leading-none">{formatStopwatch(stopwatchMs)}</div>
                      <div className="flex gap-4 md:gap-8 justify-center">
                        <Button onClick={() => setIsStopwatchRunning(!isStopwatchRunning)} size="lg" className="rounded-2xl md:rounded-3xl h-14 md:h-20 px-10 md:px-20 text-sm md:text-xl font-black shadow-xl shadow-primary/20">{isStopwatchRunning ? "DAYANDIR" : "BAŞLA"}</Button>
                        <Button variant="outline" onClick={() => {setStopwatchMs(0); setIsStopwatchRunning(false)}} size="lg" className="rounded-2xl md:rounded-3xl h-14 md:h-20 px-6 md:px-12 border-2"><RotateCcw size={24} className="md:w-8 md:h-8" /></Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="mt-auto pt-6 text-center text-muted-foreground text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] opacity-30">
                Zaman İdarəetmə Mərkəzi
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
