import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { projectService } from '@/services/projects';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

/** Markdown → HTML (XSS-safe) */
function renderComment(text: string): string {
  if (!text) return '';
  const safe = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = safe.split('\n');
  const out: string[] = [];
  let listTag: 'ul' | 'ol' | null = null;
  const closeList = () => { if (listTag) { out.push(`</${listTag}>`); listTag = null; } };
  for (const line of lines) {
    const bulletM   = line.match(/^- (.*)$/);
    const numberedM = line.match(/^\d+\. (.*)$/);
    if (bulletM) {
      if (listTag === 'ol') closeList();
      if (!listTag) { out.push('<ul style="list-style-type:disc;padding-left:1.1rem;margin:2px 0">'); listTag = 'ul'; }
      out.push(`<li>${bulletM[1]}</li>`);
    } else if (numberedM) {
      if (listTag === 'ul') closeList();
      if (!listTag) { out.push('<ol style="list-style-type:decimal;padding-left:1.1rem;margin:2px 0">'); listTag = 'ol'; }
      out.push(`<li>${numberedM[1]}</li>`);
    } else {
      closeList();
      out.push(line.length ? `${line}<br>` : '<br>');
    }
  }
  closeList();
  return out.join('')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n<>]+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/<br>$/, '');
}

interface ActivityCommentsProps {
  activityId: number;
}

export const ActivityComments: React.FC<ActivityCommentsProps> = ({ activityId }) => {
  const { currentUser } = useAuth();
  const [comments, setComments]   = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading]  = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  // Selection hər dəfə mouseup/keyup-da saxlanılır — mousedown-da itmir
  const selRef = React.useRef({ s: 0, e: 0 });

  const saveSelection = () => {
    const el = textareaRef.current;
    if (el) selRef.current = { s: el.selectionStart ?? 0, e: el.selectionEnd ?? 0 };
  };

  const applyFmt = (before: string, after = before) => {
    const el = textareaRef.current;
    if (!el) return;
    const { s, e } = selRef.current;   // saxlanılmış selection
    const val = el.value;
    const sel = val.slice(s, e) || 'mətn';
    const next = val.slice(0, s) + before + sel + after + val.slice(e);
    setNewComment(next);
    const ns = s + before.length;
    const ne = ns + sel.length;
    setTimeout(() => { el.focus(); el.setSelectionRange(ns, ne); }, 0);
  };

  const insertLine = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const s   = selRef.current.s;
    const val = el.value;
    const pre = val.slice(0, s);
    const suf = val.slice(s);
    const ins = (pre === '' || pre.endsWith('\n')) ? prefix : '\n' + prefix;
    setNewComment(pre + ins + suf);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + ins.length, s + ins.length); }, 0);
  };

  const fetchComments = async () => {
    try {
      const data = await projectService.getComments(activityId);
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [activityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const comment = await projectService.addComment(activityId, {
        comment: newComment,
        type: 'comment',
      });
      setComments([comment, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[500px]">
      <div className="flex items-center gap-2 mb-4 px-1">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Müzakirə və Rəylər</h3>
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
          {comments.length}
        </span>
      </div>

      <ScrollArea className="flex-1 pr-4 mb-4">
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-3"
              >
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={comment.user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {comment.user?.name?.charAt(0) || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground/80">
                      {comment.user?.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {(() => {
                        const cleanDateStr = comment.created_at?.includes('.') ? comment.created_at.split('.')[0] : comment.created_at;
                        const date = cleanDateStr ? new Date(cleanDateStr) : null;
                        return date && !isNaN(date.getTime()) 
                          ? formatDistanceToNow(date, { addSuffix: true, locale: az })
                          : '-';
                      })()}
                    </span>
                  </div>
                  <div
                    className="bg-muted/50 rounded-lg p-2 text-sm text-foreground/90 leading-relaxed shadow-sm"
                    dangerouslySetInnerHTML={{ __html: renderComment(comment.comment) }}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {comments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground italic text-sm">
              Hələ rəy yoxdur. İlk rəyi siz yazın.
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="pt-2 border-t space-y-1.5">
        {/* Format düymələri */}
        <div className="flex items-center gap-1">
          {([
            { label: 'B',        title: 'Qalın (**)',      fn: () => applyFmt('**') },
            { label: 'I',        title: 'İtalik (*)',       fn: () => applyFmt('*') },
            { label: 'U',        title: 'Altı xətli (__)', fn: () => applyFmt('__') },
            { label: 'S',        title: 'Üstü xətli (~~)', fn: () => applyFmt('~~') },
            { label: '• Siyahı', title: 'Nişanlama (-)',   fn: () => insertLine('- ') },
            { label: '1. Siyahı',title: 'Nömrəli (1.)',    fn: () => insertLine('1. ') },
          ] as const).map(({ label, title, fn }) => (
            <button key={label} type="button" onMouseDown={(e) => { e.preventDefault(); fn(); }}
              className="h-6 px-1.5 text-[11px] rounded border border-border/40 bg-background hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all"
              title={title}>
              {label === 'B' ? <strong>B</strong> : label === 'I' ? <em>I</em> : label === 'U' ? <span className="underline">U</span> : label === 'S' ? <s>S</s> : label}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground/50">Shift+↵ = yeni sətir</span>
        </div>
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder="Rəyinizi yazın... (**qalın**, *italik*, - siyahı)"
            value={newComment}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            onSelect={saveSelection}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[72px] resize-none pr-10 text-sm bg-muted/30 focus-visible:ring-primary/20"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
              // Ctrl + B = Qalın (**mətn**)
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                applyFmt('**');
              }
              // Ctrl + I = İtalik (*mətn*)
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                applyFmt('*');
              }
              // Ctrl + U = Altı xətli (__mətn__)
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
                e.preventDefault();
                applyFmt('__');
              }
              // Ctrl + S = Üstü xətli (~~mətn~~)
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                applyFmt('~~');
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || isLoading}
            className="absolute bottom-2 right-2 w-7 h-7 rounded-full shadow"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
};
