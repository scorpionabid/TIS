import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Edit3, Plus, StickyNote, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  useCreateNote,
  useDeleteNote,
  useUpdateNote,
  useUserNotes,
} from '@/services/calendarService';

interface DashboardNotesCardProps {
  title?: string;
}

export const DashboardNotesCard: React.FC<DashboardNotesCardProps> = ({
  title = 'Şəxsi Qeydlər',
}) => {
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineText, setInlineText] = useState('');

  const { data: notes = [] } = useUserNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const handleAdd = () => {
    createNote.mutate({ text: '' }, {
      onSuccess: (note) => {
        setInlineEditingId(note.id);
        setInlineText('');
      },
    });
  };

  const handleSave = () => {
    if (!inlineText.trim() || inlineEditingId === null) return;
    updateNote.mutate({ id: inlineEditingId, text: inlineText });
    setInlineEditingId(null);
  };

  const handleCancelEdit = (noteId: number, noteText: string) => {
    if (!noteText) deleteNote.mutate(noteId);
    setInlineEditingId(null);
  };

  return (
    <Card className="glass-card border-none modern-shadow rounded-[32px] overflow-hidden flex flex-col h-[450px]">
      <CardHeader className="pb-6 bg-gradient-to-r from-primary/10 to-transparent pt-8 px-6">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <CardTitle className="text-2xl font-black flex items-center gap-3">
              <StickyNote size={28} className="text-primary" />
              {title}
            </CardTitle>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 rounded-full font-black text-xs uppercase">
              {notes.length} qeyd
            </Badge>
          </div>
          <Button
            onClick={handleAdd}
            className="rounded-xl h-10 bg-primary/10 text-primary hover:bg-primary/20 font-black text-xs uppercase tracking-wider gap-1.5 px-4 transition-all ml-auto"
          >
            <Plus size={14} /> QEYD ƏLAVƏ ET
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4 p-8 pt-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {notes.map((note: any) => (
            <motion.div
              key={note.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                'p-5 rounded-2xl border transition-all group relative',
                inlineEditingId === note.id
                  ? 'bg-white border-primary/30 shadow-xl scale-[1.02]'
                  : 'bg-white/60 dark:bg-slate-900/40 border-primary/5 hover:border-primary/20 hover:shadow-md',
              )}
            >
              {inlineEditingId === note.id ? (
                <div className="space-y-3">
                  <textarea
                    autoFocus
                    className="w-full text-base bg-transparent border-none focus:ring-0 resize-none min-h-[60px] font-semibold"
                    placeholder="Qeydinizi yazın..."
                    value={inlineText}
                    onChange={(e) => setInlineText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
                      if (e.key === 'Escape') handleCancelEdit(note.id, note.text);
                    }}
                  />
                  <div className="flex justify-end gap-3 border-t border-primary/5 pt-3">
                    <button onClick={() => handleCancelEdit(note.id, note.text)} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                      Ləğv et
                    </button>
                    <button onClick={handleSave} className="text-xs font-black text-primary uppercase tracking-wider">
                      Yadda saxla
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold leading-relaxed flex-1 text-slate-700 dark:text-slate-200">
                    {note.text || <span className="italic text-muted-foreground">Boş qeyd</span>}
                  </p>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setInlineEditingId(note.id); setInlineText(note.text); }}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => deleteNote.mutate(note.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
