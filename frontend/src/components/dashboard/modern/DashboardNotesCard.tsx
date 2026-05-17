import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Edit3, Plus, StickyNote, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  NoteColor,
  useCreateNote,
  useDeleteNote,
  useUpdateNote,
  useUserNotes,
} from '@/services/calendarService';

// ─── Color config ─────────────────────────────────────────────────────────────

const NOTE_COLORS: Record<NoteColor, { border: string; bg: string; dot: string; label: string }> = {
  yellow: { border: 'border-l-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/20',   dot: 'bg-amber-400',  label: 'Sarı' },
  red:    { border: 'border-l-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/20',     dot: 'bg-rose-500',   label: 'Qırmızı' },
  green:  { border: 'border-l-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', dot: 'bg-emerald-500', label: 'Yaşıl' },
  blue:   { border: 'border-l-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/20',     dot: 'bg-blue-500',   label: 'Mavi' },
  purple: { border: 'border-l-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/20', dot: 'bg-violet-500', label: 'Bənövşəyi' },
};

const COLOR_ORDER: NoteColor[] = ['yellow', 'red', 'green', 'blue', 'purple'];

interface DashboardNotesCardProps {
  title?: string;
}

export const DashboardNotesCard: React.FC<DashboardNotesCardProps> = ({
  title = 'Şəxsi Qeydlər',
}) => {
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineText, setInlineText] = useState('');
  const [inlineColor, setInlineColor] = useState<NoteColor>('yellow');
  const [filterColor, setFilterColor] = useState<NoteColor | 'all'>('all');
  // local-only "new note" draft before it's saved to backend
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftColor, setDraftColor] = useState<NoteColor>('yellow');

  const { data: allNotes = [] } = useUserNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const notes = filterColor === 'all'
    ? allNotes
    : allNotes.filter((n: any) => (n.color ?? 'yellow') === filterColor);

  const handleAdd = () => {
    setDraftText('');
    setDraftColor('yellow');
    setIsDrafting(true);
  };

  const handleDraftSave = () => {
    if (!draftText.trim()) { setIsDrafting(false); return; }
    createNote.mutate({ text: draftText.trim(), color: draftColor }, {
      onSuccess: () => setIsDrafting(false),
    });
  };

  const handleSave = () => {
    if (!inlineText.trim() || inlineEditingId === null) return;
    updateNote.mutate({ id: inlineEditingId, text: inlineText, color: inlineColor });
    setInlineEditingId(null);
  };

  const handleCancelEdit = () => {
    setInlineEditingId(null);
  };

  const startEdit = (note: any) => {
    setInlineEditingId(note.id);
    setInlineText(note.text);
    setInlineColor((note.color ?? 'yellow') as NoteColor);
  };

  return (
    <Card className="glass-card border-none modern-shadow rounded-[32px] overflow-hidden flex flex-col min-h-[280px] h-[44vh] sm:h-[400px] md:h-[450px] max-h-[500px]">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent pt-4 sm:pt-6 px-4 sm:px-6">
        {/* Title row */}
        <div className="flex items-center justify-between w-full mb-2 sm:mb-3 gap-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <StickyNote size={16} className="text-primary flex-shrink-0" />
            <CardTitle className="text-sm sm:text-base font-black truncate leading-tight">
              {title}
            </CardTitle>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-1.5 sm:px-2 py-0.5 rounded-full font-black text-[10px] uppercase flex-shrink-0 whitespace-nowrap">
              {allNotes.length}
            </Badge>
          </div>
          <Button onClick={handleAdd}
            className="rounded-xl h-7 sm:h-8 bg-primary/10 text-primary hover:bg-primary/20 font-black text-[10px] uppercase tracking-wider gap-1 px-2 flex-shrink-0">
            <Plus size={11} /> <span className="hidden md:inline">Əlavə et</span>
          </Button>
        </div>

        {/* Color filter */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterColor('all')}
            className={cn('text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-1 rounded-full transition-colors uppercase tracking-wider',
              filterColor === 'all' ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/20')}>
            Hamısı
          </button>
          {COLOR_ORDER.map((c) => {
            const cfg = NOTE_COLORS[c];
            return (
              <button key={c} onClick={() => setFilterColor(filterColor === c ? 'all' : c)}
                title={cfg.label}
                className={cn('w-6 h-6 sm:w-5 sm:h-5 rounded-full transition-all hover:scale-110', cfg.dot,
                  filterColor === c ? 'ring-2 ring-offset-1 ring-primary scale-125' : '')}>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 p-3 sm:p-5 pt-2 custom-scrollbar">

        {/* Draft card — shown before first API call */}
        <AnimatePresence>
          {isDrafting && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                'p-4 rounded-2xl border-l-4 shadow-xl ring-1 ring-primary/20',
                NOTE_COLORS[draftColor].border,
                NOTE_COLORS[draftColor].bg,
              )}
            >
              <textarea
                autoFocus
                className="w-full text-sm bg-transparent border-none focus:ring-0 resize-none min-h-[60px] font-semibold"
                placeholder="Qeydinizi yazın..."
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDraftSave(); }
                  if (e.key === 'Escape') setIsDrafting(false);
                }}
              />
              <div className="flex items-center justify-between border-t border-black/5 pt-2 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase">Rəng:</span>
                  {COLOR_ORDER.map((c) => (
                    <button key={c} type="button" onClick={() => setDraftColor(c)}
                      className={cn('w-6 h-6 sm:w-5 sm:h-5 rounded-full transition-all hover:scale-110', NOTE_COLORS[c].dot,
                        draftColor === c ? 'ring-2 ring-offset-1 ring-foreground scale-125' : '')} />
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsDrafting(false)} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                    Ləğv et
                  </button>
                  <button onClick={handleDraftSave} disabled={!draftText.trim()} className="text-xs font-black text-primary uppercase tracking-wider disabled:opacity-40">
                    Yadda saxla
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {notes.map((note: any) => {
            const color = (note.color ?? 'yellow') as NoteColor;
            const cfg = NOTE_COLORS[color];

            return (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  'p-4 rounded-2xl border-l-4 transition-all group relative',
                  cfg.border, cfg.bg,
                  inlineEditingId === note.id
                    ? 'shadow-xl scale-[1.02] ring-1 ring-primary/20'
                    : 'hover:shadow-md',
                )}
              >
                {inlineEditingId === note.id ? (
                  <div className="space-y-3">
                    <textarea
                      autoFocus
                      className="w-full text-sm bg-transparent border-none focus:ring-0 resize-none min-h-[60px] font-semibold"
                      placeholder="Qeydinizi yazın..."
                      value={inlineText}
                      onChange={(e) => setInlineText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    {/* Color picker */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-muted-foreground uppercase">Rəng:</span>
                      {COLOR_ORDER.map((c) => (
                        <button key={c} type="button" onClick={() => setInlineColor(c)}
                          className={cn('w-6 h-6 sm:w-5 sm:h-5 rounded-full transition-all hover:scale-110', NOTE_COLORS[c].dot,
                            inlineColor === c ? 'ring-2 ring-offset-1 ring-foreground scale-125' : '')} />
                      ))}
                    </div>
                    <div className="flex justify-end gap-2 border-t border-black/5 pt-2">
                      <button onClick={() => handleCancelEdit()}
                        className="text-xs font-bold text-muted-foreground hover:text-foreground">
                        Ləğv et
                      </button>
                      <button onClick={handleSave} className="text-xs font-black text-primary uppercase tracking-wider">
                        Yadda saxla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold leading-relaxed flex-1 text-slate-700 dark:text-slate-200">
                      {note.text || <span className="italic text-muted-foreground">Boş qeyd</span>}
                    </p>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => startEdit(note)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Edit3 size={13} /></button>
                      <button onClick={() => deleteNote.mutate(note.id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg"><Trash2 size={13} /></button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
