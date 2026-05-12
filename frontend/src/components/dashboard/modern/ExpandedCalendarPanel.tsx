import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  format, addMonths, subMonths, startOfYear, endOfYear,
  eachMonthOfInterval, getYear, setYear, addYears, subYears,
} from 'date-fns';
import { az } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Edit3, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  CalendarEvent,
  useCalendarEvents,
  useCreateEvent,
  useDeleteEvent,
  useUpdateEvent,
} from '@/services/calendarService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventTypeOption {
  value: string;
  label: string;
}

interface ExpandedCalendarPanelProps {
  title: string;
  description?: string;
  eventTypeOptions?: EventTypeOption[];
  defaultTime?: string;
}

// ─── Internal 3-view calendar ─────────────────────────────────────────────────

const CalendarContent = ({
  selectedDate,
  onSelect,
  events,
}: {
  selectedDate: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  events: CalendarEvent[];
}) => {
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');
  const [activeMonth, setActiveMonth] = useState<Date>(selectedDate ?? new Date());

  const months = eachMonthOfInterval({ start: startOfYear(activeMonth), end: endOfYear(activeMonth) });
  const startYear = Math.floor(getYear(activeMonth) / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => startYear + i);

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {view === 'days' && (
          <motion.div key="days" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center justify-between mb-4 px-2">
              <button onClick={() => setView('months')} className="text-xl font-black hover:text-primary transition-colors flex items-center gap-2 group">
                {format(activeMonth, 'MMMM yyyy', { locale: az })}
                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-all -ml-1" />
              </button>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setActiveMonth(subMonths(activeMonth, 1))} className="h-8 w-8 rounded-lg"><ChevronLeft size={16} /></Button>
                <Button variant="ghost" size="icon" onClick={() => setActiveMonth(addMonths(activeMonth, 1))} className="h-8 w-8 rounded-lg"><ChevronRight size={16} /></Button>
              </div>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { onSelect(d); if (d) setActiveMonth(d); }}
              month={activeMonth}
              onMonthChange={setActiveMonth}
              fixedWeeks
              locale={az}
              className="p-0"
              classNames={{
                day: cn('h-20 w-20 p-0 font-bold text-2xl rounded-2xl transition-all hover:bg-primary/10 hover:text-primary active:scale-95 flex items-center justify-center mx-auto'),
                cell: 'h-20 w-20 text-center text-2xl p-0 relative focus-within:relative focus-within:z-20',
                head_cell: 'text-primary/40 rounded-md w-20 font-black text-[14px] uppercase tracking-widest pb-4 text-center',
                table: 'w-full border-collapse mx-auto',
                day_selected: 'bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white shadow-xl shadow-primary/30 scale-110 z-10',
                caption: 'hidden',
              }}
              modifiers={{ hasEvent: (date) => events.some((e) => e.date === format(date, 'yyyy-MM-dd')) }}
              modifiersClassNames={{ hasEvent: 'after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-amber-500 after:rounded-full relative' }}
            />
          </motion.div>
        )}

        {view === 'months' && (
          <motion.div key="months" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.2 }} className="min-h-[650px]">
            <div className="flex items-center justify-between mb-8 px-2">
              <button onClick={() => setView('years')} className="text-xl font-black hover:text-primary transition-colors flex items-center gap-2 group">
                {format(activeMonth, 'yyyy')}
                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-all -ml-1" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {months.map((month, i) => (
                <button key={i} onClick={() => { setActiveMonth(month); setView('days'); }}
                  className={cn('h-16 rounded-2xl font-bold text-sm transition-all hover:bg-primary/10 hover:text-primary active:scale-95',
                    getYear(month) === getYear(new Date()) && month.getMonth() === new Date().getMonth() ? 'border border-primary/20 bg-primary/5' : '')}>
                  {format(month, 'MMM', { locale: az })}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'years' && (
          <motion.div key="years" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.2 }} className="min-h-[650px]">
            <div className="flex items-center justify-between mb-8 px-2">
              <span className="text-xl font-black">{years[0]} — {years[years.length - 1]}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setActiveMonth(subYears(activeMonth, 12))} className="h-8 w-8 rounded-lg"><ChevronLeft size={16} /></Button>
                <Button variant="ghost" size="icon" onClick={() => setActiveMonth(addYears(activeMonth, 12))} className="h-8 w-8 rounded-lg"><ChevronRight size={16} /></Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {years.map((year) => (
                <button key={year} onClick={() => { setActiveMonth(setYear(activeMonth, year)); setView('months'); }}
                  className={cn('h-16 rounded-2xl font-bold text-sm transition-all hover:bg-primary/10 hover:text-primary active:scale-95',
                    year === getYear(new Date()) ? 'border border-primary/20 bg-primary/5' : '')}>
                  {year}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_EVENT_TYPES: EventTypeOption[] = [
  { value: 'meeting', label: 'İclas' },
  { value: 'visit', label: 'Monitorinq' },
  { value: 'task', label: 'Tapşırıq' },
  { value: 'event', label: 'Tədbir' },
];

export const ExpandedCalendarPanel: React.FC<ExpandedCalendarPanelProps> = ({
  title,
  description,
  eventTypeOptions = DEFAULT_EVENT_TYPES,
  defaultTime = '09:00',
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({
    title: '',
    type: eventTypeOptions[0]?.value ?? 'meeting',
    time: defaultTime,
    link: '',
  });

  const { data: events = [] } = useCalendarEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return events.filter((e) => e.date === key);
  }, [events, selectedDate]);

  const openCreate = () => {
    setEditingEvent(null);
    setForm({ title: '', type: eventTypeOptions[0]?.value ?? 'meeting', time: defaultTime, link: '' });
    setIsModalOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setForm({ title: event.title, type: event.type, time: event.time ?? defaultTime, link: event.link ?? '' });
    setSelectedDate(new Date(event.date));
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !selectedDate) return;
    const payload = { ...form, date: format(selectedDate, 'yyyy-MM-dd') };
    if (editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, ...payload });
    } else {
      createEvent.mutate(payload);
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <Card className="glass-card border-none modern-shadow rounded-[32px] h-full overflow-hidden flex flex-col min-h-[600px]">
        <CardHeader className="border-b border-primary/5 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4 p-8">
          <div>
            <CardTitle className="text-3xl font-black flex items-center gap-3">
              <CalendarIcon className="text-primary" size={32} />
              {title}
            </CardTitle>
            {description && <CardDescription className="text-base">{description}</CardDescription>}
          </div>
          <Button onClick={openCreate} className="rounded-xl bg-primary/10 text-primary hover:bg-primary/20 gap-1.5 h-10 px-4 text-xs font-black uppercase tracking-wider transition-all">
            <Plus size={14} /> Tədbir əlavə et
          </Button>
        </CardHeader>

        <CardContent className="p-0 flex-1">
          <div className="flex flex-col md:flex-row h-full">
            {/* 3-view calendar */}
            <div className="p-10 border-r border-primary/5 flex-1 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/40 relative overflow-hidden">
              <div className="w-full max-w-[900px] bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/20 p-8">
                <CalendarContent selectedDate={selectedDate} onSelect={setSelectedDate} events={events} />
              </div>
            </div>

            {/* Day events */}
            <div className="w-full md:w-96 p-8 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">
                  {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: az }) : 'Günün Planı'}
                </h3>
                <Badge variant="outline" className="rounded-full px-3">{dayEvents.length} Tədbir</Badge>
              </div>
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {dayEvents.length > 0 ? dayEvents.map((event) => (
                  <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-primary/10 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all border-l-4"
                    style={{ borderLeftColor: event.type === 'meeting' ? '#3b82f6' : event.type === 'visit' ? '#f43f5e' : event.type === 'task' ? '#10b981' : '#f59e0b' }}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                        <Clock size={14} /> {event.time}
                      </p>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(event)} className="p-1.5 text-primary hover:bg-primary/5 rounded-lg"><Edit3 size={14} /></button>
                        <button onClick={() => deleteEvent.mutate(event.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <p className="text-base font-black leading-tight mb-2">{event.title}</p>
                    {event.link && (
                      <a href={event.link} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">
                        <LinkIcon size={10} /> Linkə keçid
                      </a>
                    )}
                  </motion.div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 italic py-20 text-center">
                    <CalendarIcon size={64} className="mb-4" />
                    <p className="font-bold">Bu gün üçün planlaşdırılmış tədbir tapılmadı.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingEvent(null); }}>
        <DialogContent className="sm:max-w-[450px] rounded-[32px] glass-card border-none p-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black">{editingEvent ? 'Tədbiri Redaktə Et' : 'Yeni Tədbir'}</DialogTitle>
            <DialogDescription className="text-base font-medium">
              {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: az }) : ''} üçün plan nizamlayın.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label className="text-xs font-black uppercase tracking-widest text-primary">Tədbirin Başlığı</Label>
              <Input
                placeholder="Məs: İclas, Monitorinq..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="rounded-2xl h-14 text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-primary">Saat</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="rounded-2xl h-14" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-primary">Növ</Label>
                <select
                  className="flex h-14 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {eventTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-black uppercase tracking-widest text-primary">Keçid Linki (Könüllü)</Label>
              <div className="relative">
                <LinkIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="https://..."
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className="rounded-2xl h-14 pl-12"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSave} disabled={!form.title.trim()} className="w-full rounded-2xl h-16 text-lg font-black shadow-2xl shadow-primary/30 uppercase tracking-widest">
              {editingEvent ? 'DƏYİŞİKLİKLƏRİ YADDA SAXLA' : 'TƏDBİRİ TƏSDİQLƏ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
