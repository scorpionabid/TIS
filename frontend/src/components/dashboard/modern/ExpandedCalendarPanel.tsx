import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  format, addMonths, subMonths, startOfYear, endOfYear,
  eachMonthOfInterval, getYear, setYear, addYears, subYears,
  startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSaturday, isSunday,
  addWeeks, subWeeks, parseISO,
} from 'date-fns';
import { az } from 'date-fns/locale';
import {
  Bell, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Clock, Edit3, Link as LinkIcon, Plus, RefreshCw, Repeat,
  Trash2, X,
} from 'lucide-react';
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
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  CalendarEvent, useCalendarEvents, useCreateEvent, useDeleteEvent,
  useRsvpEvent, useUpdateEvent,
} from '@/services/calendarService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventTypeOption { value: string; label: string }

interface ExpandedCalendarPanelProps {
  title: string;
  description?: string;
  eventTypeOptions?: EventTypeOption[];
  defaultTime?: string;
}

// ─── Color helpers ────────────────────────────────────────────────────────────

// ─── Azerbaijan national holidays ────────────────────────────────────────────
// Fixed-date holidays (MM-DD format)
const AZ_FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': 'Yeni il',      '01-02': 'Yeni il',
  '01-20': 'Qara Yanvar',
  '03-08': 'Qadınlar günü',
  '03-20': 'Novruz',       '03-21': 'Novruz',
  '03-22': 'Novruz',       '03-23': 'Novruz',
  '03-24': 'Novruz',
  '05-09': 'Zəfər günü',
  '05-28': 'Respublika günü',
  '06-15': 'Milli Qurtuluş günü',
  '06-26': 'Silahlı Qüvvələr günü',
  '10-18': 'Müstəqillik günü',
  '11-08': 'Zəfər günü',
  '11-09': 'Bayraq günü',
  '11-12': 'Konstitusiya günü',
  '11-17': 'Milli Dirçəliş günü',
  '12-31': 'Dünya Azərbaycanlıları Həmrəyliyi günü',
};

// Moveable Islamic holidays for 2025-2027 (YYYY-MM-DD)
const AZ_MOVEABLE_HOLIDAYS: Record<string, string> = {
  '2025-03-30': 'Ramazan Bayramı', '2025-03-31': 'Ramazan Bayramı',
  '2025-06-06': 'Qurban Bayramı',  '2025-06-07': 'Qurban Bayramı',
  '2026-03-20': 'Ramazan Bayramı', '2026-03-21': 'Ramazan Bayramı',
  '2026-05-27': 'Qurban Bayramı',  '2026-05-28': 'Qurban Bayramı',
  '2027-03-09': 'Ramazan Bayramı', '2027-03-10': 'Ramazan Bayramı',
  '2027-05-16': 'Qurban Bayramı',  '2027-05-17': 'Qurban Bayramı',
};

export const getAzHoliday = (date: Date): string | null => {
  const full = format(date, 'yyyy-MM-dd');
  const mmdd = format(date, 'MM-dd');
  return AZ_MOVEABLE_HOLIDAYS[full] ?? AZ_FIXED_HOLIDAYS[mmdd] ?? null;
};

// ─── Event colors ─────────────────────────────────────────────────────────────
export const EVENT_COLORS: Record<string, { border: string; dot: string; bg: string; text: string }> = {
  meeting: { border: '#3b82f6', dot: 'bg-blue-500',   bg: 'bg-blue-50 dark:bg-blue-950/30',   text: 'text-blue-700 dark:text-blue-300' },
  visit:   { border: '#f97316', dot: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-300' },
  task:    { border: '#10b981', dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300' },
  event:   { border: '#8b5cf6', dot: 'bg-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-300' },
};

const getColor = (type: string) =>
  EVENT_COLORS[type] ?? { border: '#64748b', dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-700' };

// ─── Draggable event card ─────────────────────────────────────────────────────

const DraggableEventCard: React.FC<{
  event: CalendarEvent;
  onEdit: (e: CalendarEvent) => void;
  onDelete: (id: number) => void;
  onRsvp?: (id: number, status: 'accepted' | 'declined') => void;
  isDragging?: boolean;
}> = ({ event, onEdit, onDelete, onRsvp, isDragging = false }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: event.id });
  const c = getColor(event.type);
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: c.border }}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      className={cn(
        'p-4 rounded-2xl bg-white dark:bg-slate-900 border border-primary/10 shadow-sm',
        'relative overflow-hidden group hover:shadow-lg transition-all border-l-4 cursor-grab active:cursor-grabbing select-none',
        c.bg,
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-bold flex items-center gap-1', c.text)}>
            <Clock size={12} /> {event.time ?? '—'}
          </span>
          {event.is_recurring_instance && (
            <span title="Təkrarlanan hadisə"><Repeat size={10} className="text-muted-foreground" /></span>
          )}
          {event.reminder_minutes != null && event.reminder_minutes > 0 && (
            <span title={`${event.reminder_minutes} dəq xatırlatma`}><Bell size={10} className="text-amber-500" /></span>
          )}
          {event.is_invited && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 rounded">Dəvət</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {event.is_invited && onRsvp ? (
            <>
              <button onClick={() => onRsvp(event.id, 'accepted')} className="px-2 py-0.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg">✓ Qəbul</button>
              <button onClick={() => onRsvp(event.id, 'declined')} className="px-2 py-0.5 text-[10px] font-bold text-rose-500 hover:bg-rose-50 rounded-lg">✗ Rədd</button>
            </>
          ) : (
            <>
              <button onClick={() => onEdit(event)} className="p-1.5 text-primary hover:bg-primary/5 rounded-lg"><Edit3 size={13} /></button>
              <button onClick={() => onDelete(event.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={13} /></button>
            </>
          )}
        </div>
      </div>
      <p className="text-sm font-black leading-tight mb-1">{event.title}</p>
      {event.participants && event.participants.length > 0 && (
        <p className="text-[10px] text-muted-foreground">{event.participants.length} iştirakçı</p>
      )}
      {event.link && (
        <a href={event.link} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline mt-1">
          <LinkIcon size={10} /> Keçid
        </a>
      )}
    </motion.div>
  );
};

// ─── Droppable day cell (week view) ──────────────────────────────────────────

const DroppableDayCell: React.FC<{
  date: Date;
  events: CalendarEvent[];
  onSelect: (d: Date) => void;
  selected: boolean;
}> = ({ date, events, onSelect, selected }) => {
  const { isOver, setNodeRef } = useDroppable({ id: format(date, 'yyyy-MM-dd') });
  const weekend = isSaturday(date) || isSunday(date);
  const todayDate = isToday(date);

  return (
    <div
      ref={setNodeRef}
      onClick={() => onSelect(date)}
      className={cn(
        'min-h-[100px] p-2 rounded-xl border transition-all cursor-pointer',
        todayDate ? 'border-primary/40 bg-primary/5' : 'border-transparent',
        weekend ? 'bg-slate-50/80 dark:bg-slate-900/40' : '',
        selected ? 'ring-2 ring-primary/50' : '',
        isOver ? 'bg-primary/10 border-primary/40' : '',
      )}
    >
      <div className={cn('text-xs font-black mb-1.5', todayDate ? 'text-primary' : weekend ? 'text-slate-400' : 'text-slate-600')}>
        {format(date, 'd')}
      </div>
      <div className="space-y-1">
        {events.slice(0, 3).map((e) => {
          const c = getColor(e.type);
          return (
            <div key={e.id} className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate', c.text, c.bg)}
              style={{ borderLeft: `2px solid ${c.border}` }}>
              {e.time ? `${e.time} ` : ''}{e.title}
            </div>
          );
        })}
        {events.length > 3 && (
          <div className="text-[9px] text-muted-foreground pl-1">+{events.length - 3} daha</div>
        )}
      </div>
    </div>
  );
};

// ─── Week view ────────────────────────────────────────────────────────────────

const WeekView: React.FC<{
  baseDate: Date;
  onDateChange: (d: Date) => void;
  events: CalendarEvent[];
  selectedDate: Date | undefined;
  onSelect: (d: Date) => void;
}> = ({ baseDate, onDateChange, events, selectedDate, onSelect }) => {
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 px-2">
        <span className="text-xl font-black">
          {format(weekStart, 'd MMM', { locale: az })} — {format(weekEnd, 'd MMM yyyy', { locale: az })}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => onDateChange(subWeeks(baseDate, 1))} className="h-8 w-8 rounded-lg"><ChevronLeft size={16} /></Button>
          <Button variant="ghost" size="icon" onClick={() => onDateChange(new Date())} className="h-8 w-8 rounded-lg text-xs">Bu həftə</Button>
          <Button variant="ghost" size="icon" onClick={() => onDateChange(addWeeks(baseDate, 1))} className="h-8 w-8 rounded-lg"><ChevronRight size={16} /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map((d) => (
          <div key={d.toISOString()} className={cn('text-center text-[10px] font-black uppercase tracking-wider pb-1',
            isSaturday(d) || isSunday(d) ? 'text-slate-400' : 'text-primary/50')}>
            {format(d, 'EEE', { locale: az })}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd');
          const dayEvs = events.filter((e) => e.date === key);
          return (
            <DroppableDayCell
              key={key}
              date={d}
              events={dayEvs}
              onSelect={onSelect}
              selected={selectedDate ? format(selectedDate, 'yyyy-MM-dd') === key : false}
            />
          );
        })}
      </div>
    </div>
  );
};

// ─── 3-view calendar ─────────────────────────────────────────────────────────

const CalendarDaysView: React.FC<{
  selectedDate: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  events: CalendarEvent[];
  onViewChange: (v: 'days' | 'months' | 'years' | 'week') => void;
  activeMonth: Date;
  onMonthChange: (d: Date) => void;
}> = ({ selectedDate, onSelect, events, onViewChange, activeMonth, onMonthChange }) => {
  const months = eachMonthOfInterval({ start: startOfYear(activeMonth), end: endOfYear(activeMonth) });
  const startYear = Math.floor(getYear(activeMonth) / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => startYear + i);
  const [subView, setSubView] = useState<'days' | 'months' | 'years'>('days');

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {subView === 'days' && (
          <motion.div key="days" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <button onClick={() => setSubView('months')} className="text-xl font-black hover:text-primary transition-colors flex items-center gap-1 group">
                  {format(activeMonth, 'MMMM yyyy', { locale: az })}
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 -ml-1" />
                </button>
                <button onClick={() => onViewChange('week')} className="text-[10px] font-black text-primary/50 border border-primary/20 rounded-lg px-2 py-1 hover:bg-primary/10 transition-colors uppercase tracking-wider">
                  Həftə
                </button>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(activeMonth, 1))} className="h-8 w-8 rounded-lg"><ChevronLeft size={16} /></Button>
                <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(activeMonth, 1))} className="h-8 w-8 rounded-lg"><ChevronRight size={16} /></Button>
              </div>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { if (d) { onSelect(d); onMonthChange(d); } }}
              month={activeMonth}
              onMonthChange={onMonthChange}
              fixedWeeks
              locale={az}
              className="p-0"
              classNames={{
                day: cn('h-20 w-20 p-0 font-bold text-2xl rounded-2xl transition-all hover:bg-primary/10 hover:text-primary active:scale-95 flex items-center justify-center mx-auto relative'),
                cell: 'h-20 w-20 text-center text-2xl p-0 relative focus-within:relative focus-within:z-20',
                head_cell: 'text-primary/40 rounded-md w-20 font-black text-[14px] uppercase tracking-widest pb-4 text-center',
                table: 'w-full border-collapse mx-auto',
                day_selected: 'bg-primary text-white hover:bg-primary hover:text-white shadow-xl shadow-primary/30 scale-110 z-10',
                caption: 'hidden',
              }}
              modifiers={{
                hasMeeting:  (d) => events.some((e) => e.date === format(d, 'yyyy-MM-dd') && e.type === 'meeting'),
                hasVisit:    (d) => events.some((e) => e.date === format(d, 'yyyy-MM-dd') && e.type === 'visit'),
                hasTask:     (d) => events.some((e) => e.date === format(d, 'yyyy-MM-dd') && e.type === 'task'),
                hasEvent:    (d) => events.some((e) => e.date === format(d, 'yyyy-MM-dd') && e.type === 'event'),
                weekend:     (d) => isSaturday(d) || isSunday(d),
                holiday:     (d) => !!getAzHoliday(d),
              }}
              modifiersClassNames={{
                weekend:    'text-slate-400 bg-slate-50/60 dark:bg-slate-900/40',
                holiday:    'text-rose-600 font-black bg-rose-50/60 dark:bg-rose-950/20',
                hasMeeting: 'after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-blue-500 after:rounded-full relative',
                hasVisit:   'after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-orange-500 after:rounded-full relative',
                hasTask:    'after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-emerald-500 after:rounded-full relative',
                hasEvent:   'after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-violet-500 after:rounded-full relative',
              }}
            />
          </motion.div>
        )}
        {subView === 'months' && (
          <motion.div key="months" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.2 }} className="min-h-[650px]">
            <div className="flex items-center justify-between mb-8 px-2">
              <button onClick={() => setSubView('years')} className="text-xl font-black hover:text-primary flex items-center gap-1 group">
                {format(activeMonth, 'yyyy')}
                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 -ml-1" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {months.map((m, i) => (
                <button key={i} onClick={() => { onMonthChange(m); setSubView('days'); }}
                  className={cn('h-16 rounded-2xl font-bold text-sm transition-all hover:bg-primary/10 hover:text-primary active:scale-95',
                    getYear(m) === getYear(new Date()) && m.getMonth() === new Date().getMonth() ? 'border border-primary/20 bg-primary/5' : '')}>
                  {format(m, 'MMM', { locale: az })}
                </button>
              ))}
            </div>
          </motion.div>
        )}
        {subView === 'years' && (
          <motion.div key="years" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.2 }} className="min-h-[650px]">
            <div className="flex items-center justify-between mb-8 px-2">
              <span className="text-xl font-black">{years[0]} — {years[years.length - 1]}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onMonthChange(subYears(activeMonth, 12))} className="h-8 w-8 rounded-lg"><ChevronLeft size={16} /></Button>
                <Button variant="ghost" size="icon" onClick={() => onMonthChange(addYears(activeMonth, 12))} className="h-8 w-8 rounded-lg"><ChevronRight size={16} /></Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {years.map((y) => (
                <button key={y} onClick={() => { onMonthChange(setYear(activeMonth, y)); setSubView('months'); }}
                  className={cn('h-16 rounded-2xl font-bold text-sm transition-all hover:bg-primary/10 hover:text-primary active:scale-95',
                    y === getYear(new Date()) ? 'border border-primary/20 bg-primary/5' : '')}>
                  {y}
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
  { value: 'visit',   label: 'Monitorinq' },
  { value: 'task',    label: 'Tapşırıq' },
  { value: 'event',   label: 'Tədbir' },
];

const REMINDER_OPTIONS = [
  { value: 0,    label: 'Xatırlatma yox' },
  { value: 10,   label: '10 dəqiqə əvvəl' },
  { value: 30,   label: '30 dəqiqə əvvəl' },
  { value: 60,   label: '1 saat əvvəl' },
  { value: 1440, label: '1 gün əvvəl' },
];

export const ExpandedCalendarPanel: React.FC<ExpandedCalendarPanelProps> = ({
  title,
  description,
  eventTypeOptions = DEFAULT_EVENT_TYPES,
  defaultTime = '09:00',
}) => {
  const [calendarView, setCalendarView] = useState<'days' | 'week'>('days');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activeMonth, setActiveMonth] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [draggedEventId, setDraggedEventId] = useState<number | null>(null);

  const [form, setForm] = useState({
    title: '',
    type: eventTypeOptions[0]?.value ?? 'meeting',
    date: format(new Date(), 'yyyy-MM-dd'), // independent from calendar selectedDate
    time: defaultTime,
    link: '',
    reminder_minutes: 0,
    recurrence_rule: 'none' as 'none' | 'daily' | 'weekly' | 'monthly',
    recurrence_end_date: '',
  });

  const { data: events = [] } = useCalendarEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const rsvpEvent = useRsvpEvent();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return events.filter((e) => e.date === key);
  }, [events, selectedDate]);

  // ─── Reminder notification checker ──────────────────────────────────────────
  const checkReminders = useCallback(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date();
    events.forEach((event) => {
      if (!event.reminder_minutes || event.reminder_minutes <= 0) return;
      const eventDate = new Date(`${event.date}T${event.time ?? '00:00'}`);
      const msBefore = event.reminder_minutes * 60 * 1000;
      const diff = eventDate.getTime() - now.getTime();
      if (diff > 0 && diff <= msBefore + 30_000 && diff >= msBefore - 30_000) {
        new Notification(`📅 ${event.title}`, {
          body: `${event.reminder_minutes} dəqiqə sonra başlayır`,
          icon: '/favicon.ico',
        });
      }
    });
  }, [events]);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const id = setInterval(checkReminders, 60_000);
    return () => clearInterval(id);
  }, [checkReminders]);

  // ─── DnD handlers ────────────────────────────────────────────────────────────
  const handleDragStart = (e: DragStartEvent) => setDraggedEventId(e.active.id as number);

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggedEventId(null);
    if (!e.over) return;
    const newDate = String(e.over.id);
    const event = events.find((ev) => ev.id === e.active.id);
    if (event && event.date !== newDate) {
      updateEvent.mutate({ id: event.id, date: newDate });
    }
  };

  // ─── Modal helpers ───────────────────────────────────────────────────────────
  const resetForm = (date?: string) => setForm({
    title: '',
    type: eventTypeOptions[0]?.value ?? 'meeting',
    date: date ?? format(selectedDate ?? new Date(), 'yyyy-MM-dd'),
    time: defaultTime,
    link: '',
    reminder_minutes: 0,
    recurrence_rule: 'none',
    recurrence_end_date: '',
  });

  const openCreate = () => {
    setEditingEvent(null);
    resetForm(format(selectedDate ?? new Date(), 'yyyy-MM-dd'));
    setIsModalOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      type: event.type,
      date: event.date,           // use event's own date, NOT selectedDate
      time: event.time ?? defaultTime,
      link: event.link ?? '',
      reminder_minutes: event.reminder_minutes ?? 0,
      recurrence_rule: event.recurrence_rule ?? 'none',
      recurrence_end_date: event.recurrence_end_date ?? '',
    });
    setIsModalOpen(true);
    // Navigate calendar to event date so user sees context
    const d = new Date(event.date + 'T00:00:00');
    setSelectedDate(d);
    setActiveMonth(d);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.date) return;
    const payload = {
      title: form.title,
      type: form.type as CalendarEvent['type'],
      date: form.date,            // form.date is the source of truth
      time: form.time || undefined,
      link: form.link || undefined,
      reminder_minutes: form.reminder_minutes || undefined,
      recurrence_rule: form.recurrence_rule === 'none' ? undefined : form.recurrence_rule,
      recurrence_end_date: form.recurrence_end_date || undefined,
    };
    if (editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, ...payload });
    } else {
      createEvent.mutate(payload);
    }
    // After save, navigate calendar to the event's date so user can see it
    const d = new Date(form.date + 'T00:00:00');
    setSelectedDate(d);
    setActiveMonth(d);
    setIsModalOpen(false);
  };


  const draggedEvent = draggedEventId ? events.find((e) => e.id === draggedEventId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Card className="glass-card border-none modern-shadow rounded-[32px] h-full overflow-hidden flex flex-col min-h-[600px]">
        <CardHeader className="border-b border-primary/5 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4 p-8">
          <div>
            <CardTitle className="text-3xl font-black flex items-center gap-3">
              <CalendarIcon className="text-primary" size={32} />
              {title}
            </CardTitle>
            {description && <CardDescription className="text-base">{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalendarView(calendarView === 'days' ? 'week' : 'days')}
              className="rounded-xl text-xs font-black uppercase tracking-wider gap-1.5"
            >
              <RefreshCw size={12} />
              {calendarView === 'days' ? 'Həftəlik' : 'Aylıq'}
            </Button>
            <Button onClick={openCreate} className="rounded-xl bg-primary/10 text-primary hover:bg-primary/20 gap-1.5 h-10 px-4 text-xs font-black uppercase tracking-wider">
              <Plus size={14} /> Tədbir əlavə et
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1">
          <div className="flex flex-col md:flex-row h-full">
            {/* Calendar area */}
            <div className="p-6 md:p-10 border-r border-primary/5 flex-1 flex flex-col items-center justify-start bg-white/40 dark:bg-slate-900/40 overflow-auto">
              <div className="w-full max-w-[900px] bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/20 p-6 md:p-8">
                {calendarView === 'week' ? (
                  <WeekView
                    baseDate={activeMonth}
                    onDateChange={setActiveMonth}
                    events={events}
                    selectedDate={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setCalendarView('days'); }}
                  />
                ) : (
                  <CalendarDaysView
                    selectedDate={selectedDate}
                    onSelect={setSelectedDate}
                    events={events}
                    onViewChange={setCalendarView}
                    activeMonth={activeMonth}
                    onMonthChange={setActiveMonth}
                  />
                )}
              </div>
              {/* Color legend */}
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {Object.entries(EVENT_COLORS).map(([type, c]) => (
                  <span key={type} className={cn('text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1', c.text, c.bg)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
                    {eventTypeOptions.find((o) => o.value === type)?.label ?? type}
                  </span>
                ))}
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                  Şənbə/Bazar
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 text-rose-600 bg-rose-50 dark:bg-rose-950/20">
                  🇦🇿 Bayram
                </span>
              </div>
            </div>

            {/* Day events panel */}
            <div className="w-full md:w-96 p-8 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">
                    {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: az }) : 'Günün Planı'}
                  </h3>
                  {selectedDate && getAzHoliday(selectedDate) && (
                    <p className="text-xs font-bold text-rose-500 mt-0.5 flex items-center gap-1">
                      🇦🇿 {getAzHoliday(selectedDate)}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="rounded-full px-3">{dayEvents.length} Tədbir</Badge>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {dayEvents.length > 0 ? dayEvents.map((event) => (
                  <DraggableEventCard
                    key={event.id}
                    event={event}
                    onEdit={openEdit}
                    onDelete={(id) => deleteEvent.mutate(id)}
                    onRsvp={(id, status) => rsvpEvent.mutate({ id, status })}
                    isDragging={draggedEventId === event.id}
                  />
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 italic py-16 text-center">
                    <CalendarIcon size={56} className="mb-3" />
                    <p className="font-bold text-sm">Bu gün üçün plan tapılmadı.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drag overlay */}
      <DragOverlay>
        {draggedEvent && (
          <div className="p-4 rounded-2xl bg-white shadow-2xl border border-primary/20 opacity-90 cursor-grabbing"
            style={{ borderLeft: `4px solid ${getColor(draggedEvent.type).border}` }}>
            <p className="text-sm font-black">{draggedEvent.title}</p>
          </div>
        )}
      </DragOverlay>

      {/* Event modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) { setEditingEvent(null); setParticipantQuery(''); } }}>
        <DialogContent className="sm:max-w-[500px] rounded-[32px] glass-card border-none p-8 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingEvent ? 'Tədbiri Redaktə Et' : 'Yeni Tədbir'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-black uppercase tracking-widest text-primary">Başlıq</Label>
              <Input placeholder="Məs: İclas, Monitorinq..." value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="rounded-2xl h-12 text-base" autoFocus />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-black uppercase tracking-widest text-primary">Tarix</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="rounded-2xl h-12"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-black uppercase tracking-widest text-primary">Saat</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="rounded-2xl h-12" />
              </div>
            </div>

            {/* Type */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-black uppercase tracking-widest text-primary">Növ</Label>
              <div className="grid grid-cols-2 gap-2">
                {eventTypeOptions.map((opt) => {
                  const c = EVENT_COLORS[opt.value] ?? EVENT_COLORS.event;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: opt.value })}
                      className={cn(
                        'h-10 rounded-xl text-xs font-black border-2 transition-all flex items-center justify-center gap-1.5',
                        form.type === opt.value
                          ? `border-transparent text-white`
                          : 'border-input bg-background text-muted-foreground hover:border-primary/30',
                      )}
                      style={form.type === opt.value ? { backgroundColor: c.border } : {}}
                    >
                      <span className={cn('w-2 h-2 rounded-full', form.type === opt.value ? 'bg-white/70' : c.dot)} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Link */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-black uppercase tracking-widest text-primary">Keçid Linki (Könüllü)</Label>
              <div className="relative">
                <LinkIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="https://..." value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className="rounded-2xl h-12 pl-10" />
              </div>
            </div>

            {/* Reminder */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                <Bell size={12} /> Xatırlatma
              </Label>
              <select className="flex h-12 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm font-bold"
                value={form.reminder_minutes}
                onChange={(e) => setForm({ ...form, reminder_minutes: Number(e.target.value) })}>
                {REMINDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Recurrence */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                <Repeat size={12} /> Təkrarlama
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <select className="flex h-12 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm font-bold"
                  value={form.recurrence_rule}
                  onChange={(e) => setForm({ ...form, recurrence_rule: e.target.value as 'none' | 'daily' | 'weekly' | 'monthly' })}>
                  <option value="none">Bir dəfə</option>
                  <option value="daily">Hər gün</option>
                  <option value="weekly">Hər həftə</option>
                  <option value="monthly">Hər ay</option>
                </select>
                {form.recurrence_rule !== 'none' && (
                  <div className="grid gap-1">
                    <Label className="text-[9px] text-muted-foreground uppercase">Son tarix</Label>
                    <Input type="date" value={form.recurrence_end_date}
                      onChange={(e) => setForm({ ...form, recurrence_end_date: e.target.value })}
                      className="rounded-2xl h-12 text-sm" />
                  </div>
                )}
              </div>
            </div>

          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-2xl h-12 gap-1.5">
              <X size={14} /> Ləğv et
            </Button>
            <Button onClick={handleSave} disabled={!form.title.trim()} className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest shadow-lg shadow-primary/20">
              {editingEvent ? 'Yadda Saxla' : 'Tədbiri Yarat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
};
