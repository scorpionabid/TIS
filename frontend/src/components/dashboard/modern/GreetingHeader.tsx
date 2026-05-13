import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import {
  Clock, Timer, TimerReset, X, RotateCcw,
  Sun, Cloud, CloudRain, Moon, Sparkles, MapPin, Keyboard,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

// ─── Quotes ──────────────────────────────────────────────────────────────────

const QUOTES = [
  "Yaxşı müəllim gələcəyi formalaşdırır, əla müəllim gələcəyi ilhamlandırır.",
  "Hər uşaq fərqlidir, hər öyrənmə yolu unikaldır.",
  "Liderlər insanları dəyişdirmir — onları özlərini kəşf etməyə kömək edir.",
  "Bilik paylaşıldıqca artır, saxlandıqda azalır.",
  "Ən böyük investisiya insanın özünə etdiyi investisiyadır.",
  "Uğurlu idarəetmə gücün deyil, etibarın nəticəsidir.",
  "Hər problem həll edilməmiş bir sual deyil, yeni bir imkandır.",
  "Müəllim toxum əkir, bəhrəsini isə gələcəklər görür.",
  "Komanda işi fərdi naliyyəti çoxaldır.",
  "Öyrənməyi dayandıran adam yaşamağı dayandırmış kimidir.",
  "Əsl lider başqalarını liderə çevirir.",
  "Səbir ən böyük pedaqoji alətdir.",
  "Hər uğur mütəşəkkillikdən doğur.",
  "Güclü sistem güclü insanlarla deyil, aydın proseslərlə qurulur.",
  "Bir kitab, bir qələm, bir uşaq dünyani dəyişə bilər.",
];

const getDailyQuote = () => {
  const d = new Date();
  const idx = (d.getDate() + d.getMonth() * 30) % QUOTES.length;
  return QUOTES[idx];
};

// ─── Weather ─────────────────────────────────────────────────────────────────

// Open-Meteo WMO weather code → Azerbaijani label + icon
const WMO_MAP: Record<number, { label: string; Icon: typeof Sun }> = {
  0: { label: 'Günəşli', Icon: Sun },
  1: { label: 'Açıq', Icon: Sun },
  2: { label: 'Az buludlu', Icon: Cloud },
  3: { label: 'Buludlu', Icon: Cloud },
  45: { label: 'Dumanlı', Icon: Cloud },
  48: { label: 'Dumanlı', Icon: Cloud },
  51: { label: 'Çiskin', Icon: CloudRain },
  53: { label: 'Çiskin', Icon: CloudRain },
  55: { label: 'Çiskin', Icon: CloudRain },
  61: { label: 'Yağışlı', Icon: CloudRain },
  63: { label: 'Yağışlı', Icon: CloudRain },
  65: { label: 'Güclü yağış', Icon: CloudRain },
  80: { label: 'Yağış', Icon: CloudRain },
  81: { label: 'Yağış', Icon: CloudRain },
  82: { label: 'Güclü yağış', Icon: CloudRain },
  95: { label: 'Tufan', Icon: CloudRain },
};

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  bakı:        { lat: 40.41, lon: 49.87 },
  gəncə:       { lat: 40.68, lon: 46.36 },
  sumqayıt:    { lat: 40.59, lon: 49.67 },
  mingəçevir:  { lat: 40.77, lon: 47.06 },
  naxçıvan:    { lat: 39.21, lon: 45.41 },
  lənkəran:    { lat: 38.75, lon: 48.85 },
  şirvan:      { lat: 39.93, lon: 48.92 },
};

interface WeatherData { temp: number; label: string; Icon: typeof Sun }

const fetchWeather = async (location: string): Promise<WeatherData | null> => {
  try {
    const locKey = Object.keys(CITY_COORDS).find((k) => location.toLowerCase().includes(k));
    let lat: number, lon: number;

    if (locKey) {
      ({ lat, lon } = CITY_COORDS[locKey]);
    } else {
      // Geocoding fallback
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=az`,
      );
      const geoData = await geoRes.json();
      if (!geoData.results?.[0]) return null;
      lat = geoData.results[0].latitude;
      lon = geoData.results[0].longitude;
    }

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
    );
    const data = await res.json();
    const cw = data.current_weather;
    const wmo = WMO_MAP[cw.weathercode] ?? { label: 'Açıq', Icon: Sun };
    return { temp: Math.round(cw.temperature), label: wmo.label, Icon: wmo.Icon };
  } catch {
    return null;
  }
};


// ─── Main component ───────────────────────────────────────────────────────────

export const GreetingHeader = () => {
  const { currentUser } = useAuth();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTimePanelOpen, setIsTimePanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'clock' | 'timer' | 'stopwatch'>('clock');
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Timer & Stopwatch
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerInitial, setTimerInitial] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('0');
  const [manualSeconds, setManualSeconds] = useState('0');
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

  // Clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Weather — fetch once, cache 1 hour
  useEffect(() => {
    const location = currentUser?.region?.name ?? currentUser?.institution?.name ?? 'Bakı';
    const cacheKey = `atis_weather_${location}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < 3_600_000) { setWeather(data); return; }
      } catch { /* ignore */ }
    }
    fetchWeather(location).then((data) => {
      if (data) {
        setWeather(data);
        localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
      }
    });
  }, [currentUser]);


  // Timer countdown
  useEffect(() => {
    let id: ReturnType<typeof setInterval>;
    if (isTimerRunning && timerSeconds > 0) {
      id = setInterval(() => setTimerSeconds((s) => s - 1), 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      // Timer notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⏱ Taymer bitdi!', { body: 'Fokus sessiyanız tamamlandı.', icon: '/favicon.ico' });
      } else if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((p) => {
          if (p === 'granted') new Notification('⏱ Taymer bitdi!', { body: 'Fokus sessiyanız tamamlandı.' });
        });
      }
    }
    return () => clearInterval(id);
  }, [isTimerRunning, timerSeconds]);

  // Stopwatch
  useEffect(() => {
    let id: ReturnType<typeof setInterval>;
    if (isStopwatchRunning) id = setInterval(() => setStopwatchMs((ms) => ms + 10), 10);
    return () => clearInterval(id);
  }, [isStopwatchRunning]);

  const handleSetManualTimer = () => {
    const s = (parseInt(manualMinutes) || 0) * 60 + (parseInt(manualSeconds) || 0);
    setTimerSeconds(s);
    setTimerInitial(s);
    setIsTimerRunning(false);
  };

  const hour = currentTime.getHours();
  const userName = currentUser?.name || currentUser?.username || 'Admin';
  const userRegion = currentUser?.region?.name ?? currentUser?.institution?.name ?? 'Bakı';

  const greeting = hour >= 5 && hour < 12
    ? { text: 'Sabahınız xeyir', icon: <Sun className="text-amber-500" /> }
    : hour >= 12 && hour < 18
    ? { text: 'Günortanız xeyir', icon: <Cloud className="text-blue-400" /> }
    : hour >= 18 && hour < 22
    ? { text: 'Axşamınız xeyir', icon: <CloudRain className="text-indigo-400" /> }
    : { text: 'Gecəniz xeyir', icon: <Moon className="text-slate-400" /> };

  const formatStopwatch = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  const WeatherIcon = weather?.Icon ?? Sun;

  return (
    <div className="relative p-6 md:p-8 rounded-3xl overflow-hidden mb-4 bg-gradient-to-br border border-white/10 shadow-2xl from-slate-500/10 via-slate-500/5 to-transparent">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />

      <div className="relative z-10">
        {/* Top row */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-5">
          {/* Left: greeting */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3 flex-1">
            <div className="flex items-center gap-3 text-primary/80 font-bold tracking-widest uppercase text-[10px] md:text-xs">
              {greeting.icon}
              <span>{greeting.text}</span>
              <span className="hidden sm:block w-8 h-[1px] bg-primary/30" />
              <span className="text-muted-foreground flex items-center gap-1.5"><MapPin size={12} /> {userRegion}</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
              Xoş gəldiniz, <span className="text-primary">{userName}</span>!
              <Sparkles className="inline-block ml-2 text-amber-400 animate-pulse h-5 w-5 md:h-7 md:w-7" />
            </h1>
            {/* Daily quote */}
            <p className="text-xs md:text-sm text-muted-foreground italic max-w-lg border-l-2 border-primary/20 pl-3">
              "{getDailyQuote()}"
            </p>
          </motion.div>

          {/* Right: weather + clock */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-6 md:gap-10 lg:border-l border-primary/10 lg:pl-8 flex-shrink-0">
            {/* Weather */}
            <div className="flex flex-col items-end border-r border-primary/10 pr-6 hidden sm:flex">
              <div className="flex items-center gap-2 text-amber-500 mb-0.5">
                <WeatherIcon size={28} className={weather?.label === 'Günəşli' ? 'animate-spin-slow' : ''} />
                <span className="text-2xl md:text-4xl font-black tracking-tighter tabular-nums">
                  {weather ? `${weather.temp}°C` : '—°C'}
                </span>
              </div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {userRegion}, {weather?.label ?? '…'}
              </div>
            </div>

            {/* Clock */}
            <button onClick={() => setIsTimePanelOpen(true)}
              className="group text-center lg:text-right transition-all hover:scale-105 active:scale-95">
              <div className="text-4xl md:text-6xl font-black tracking-widest leading-none mb-1 tabular-nums flex items-baseline gap-0.5">
                {format(currentTime, 'HH:mm')}
                <span className="text-sm md:text-lg font-bold text-primary animate-pulse tracking-normal tabular-nums inline-block w-[2ch] text-left">
                  {format(currentTime, 'ss')}
                </span>
              </div>
              <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                {format(currentTime, 'd MMMM yyyy', { locale: az })}
              </div>
              <div className="text-[9px] font-black text-primary/40 uppercase tracking-[0.3em] group-hover:text-primary transition-colors">
                Zaman Paneli
              </div>
            </button>
          </motion.div>
        </div>

      </div>

      {/* ── Time panel dialog ─────────────────────────────────────────────────── */}
      <Dialog open={isTimePanelOpen} onOpenChange={setIsTimePanelOpen}>
        <DialogContent className="sm:max-w-7xl p-0 overflow-hidden border-none glass-card rounded-[32px] md:rounded-[40px] modern-shadow h-[90vh] md:h-[85vh] w-[98vw]">
          <div className="flex flex-col md:flex-row h-full">
            {/* Sidebar */}
            <div className="w-full md:w-24 flex md:flex-col items-center justify-center md:py-10 bg-slate-900/5 dark:bg-white/5 border-b md:border-b-0 md:border-r border-primary/5 gap-6 md:gap-10 p-4 md:p-0">
              {[
                { id: 'clock', icon: Clock, label: 'Saat' },
                { id: 'timer', icon: Timer, label: 'Taymer' },
                { id: 'stopwatch', icon: TimerReset, label: 'Saniyə' },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as 'clock' | 'timer' | 'stopwatch')}
                  className={cn('flex flex-col items-center gap-1 md:gap-2 p-2 md:p-4 rounded-2xl md:rounded-3xl transition-all group',
                    activeTab === tab.id ? 'bg-primary text-white shadow-xl shadow-primary/40 scale-110' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary')}>
                  <tab.icon size={24} />
                  <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 p-6 md:p-12 flex flex-col bg-white/95 dark:bg-slate-950/95 overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl md:text-3xl font-black capitalize flex items-center gap-3">
                  <span className="h-8 w-1 bg-primary rounded-full" />
                  {activeTab === 'clock' ? 'Canlı Saat' : activeTab === 'timer' ? 'Fokus Taymer' : 'Saniyəölçən'}
                </h2>
                <button onClick={() => setIsTimePanelOpen(false)} className="p-2 md:p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"><X size={20} /></button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center py-4">
                <AnimatePresence mode="wait">
                  {activeTab === 'clock' && (
                    <motion.div key="clock" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
                      <div className="text-6xl sm:text-8xl md:text-[10rem] font-black font-mono tracking-widest leading-none flex items-baseline justify-center tabular-nums">
                        {format(currentTime, 'HH:mm')}
                        <span className="text-2xl md:text-4xl ml-2 text-primary animate-pulse tabular-nums inline-block w-[2ch] text-left">{format(currentTime, 'ss')}</span>
                      </div>
                      <div className="p-4 md:p-5 rounded-2xl bg-primary/5 border border-primary/10 inline-block px-8">
                        <div className="text-sm md:text-xl font-bold tracking-tight">{format(currentTime, 'd MMMM yyyy, EEEE', { locale: az })}</div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'timer' && (
                    <motion.div key="timer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl text-center space-y-8">
                      <div className="relative">
                        <div className="text-6xl sm:text-8xl md:text-[9rem] font-black font-mono tracking-widest leading-none tabular-nums">
                          {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:{String(timerSeconds % 60).padStart(2, '0')}
                        </div>
                        {timerInitial > 0 && (
                          <div className="w-full bg-primary/10 rounded-full h-1.5 mt-4">
                            <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${(timerSeconds / timerInitial) * 100}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {[5, 10, 15, 25, 45, 60].map((m) => (
                          <Button key={m} variant="outline" onClick={() => { setTimerSeconds(m * 60); setTimerInitial(m * 60); setIsTimerRunning(false); }}
                            className="rounded-2xl font-black border-2 min-w-[80px] h-12">
                            {m} dəq
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 justify-center bg-primary/5 p-5 rounded-3xl border border-primary/10 max-w-sm mx-auto">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-primary uppercase">Dəq</span>
                          <Input type="number" value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)} className="w-20 h-12 text-xl font-black text-center rounded-xl border-primary/20" />
                        </div>
                        <span className="text-2xl font-black mt-4">:</span>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-primary uppercase">San</span>
                          <Input type="number" value={manualSeconds} onChange={(e) => setManualSeconds(e.target.value)} className="w-20 h-12 text-xl font-black text-center rounded-xl border-primary/20" />
                        </div>
                        <Button onClick={handleSetManualTimer} className="h-12 px-5 rounded-xl mt-4 font-black text-xs gap-1.5"><Keyboard size={14} /> Tət.</Button>
                      </div>
                      <div className="flex gap-4 justify-center">
                        <Button onClick={() => setIsTimerRunning(!isTimerRunning)} size="lg" className="rounded-3xl h-16 px-12 font-black shadow-xl shadow-primary/20">
                          {isTimerRunning ? 'DURDUR' : 'BAŞLAT'}
                        </Button>
                        <Button variant="outline" onClick={() => { setTimerSeconds(timerInitial); setIsTimerRunning(false); }} size="lg" className="rounded-3xl h-16 px-8 border-2">
                          <RotateCcw size={22} />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'stopwatch' && (
                    <motion.div key="stopwatch" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-12">
                      <div className="text-5xl sm:text-7xl md:text-[9rem] font-black font-mono tracking-widest leading-none tabular-nums">
                        {formatStopwatch(stopwatchMs)}
                      </div>
                      <div className="flex gap-6 justify-center">
                        <Button onClick={() => setIsStopwatchRunning(!isStopwatchRunning)} size="lg" className="rounded-3xl h-16 px-16 font-black shadow-xl shadow-primary/20">
                          {isStopwatchRunning ? 'DAYANDIR' : 'BAŞLA'}
                        </Button>
                        <Button variant="outline" onClick={() => { setStopwatchMs(0); setIsStopwatchRunning(false); }} size="lg" className="rounded-3xl h-16 px-10 border-2">
                          <RotateCcw size={24} />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-auto pt-6 text-center text-[9px] font-black uppercase tracking-[0.4em] opacity-20">
                Zaman İdarəetmə Mərkəzi
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
