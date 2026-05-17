import { useEffect, useRef, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, CheckCheck, Check, MessageSquare } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { useMessageThread } from '@/hooks/messages/useMessages';
import { useMessageMutations } from '@/hooks/messages/useMessageMutations';
import type { Message } from '@/types/message';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { az } from 'date-fns/locale';

interface MessageThreadProps {
  selectedMessageId: number | null;
  onReply: (message: Message) => void;
  onThreadDeleted?: () => void;
  onThreadLoaded?: (message: Message) => void;
  currentUserId: number;
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatDateHeader(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Bugün';
  if (isYesterday(date)) return 'Dünən';
  return format(date, 'd MMMM yyyy', { locale: az });
}

function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex items-end gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
          <Skeleton className="h-9 w-9 rounded-2xl flex-shrink-0" />
          <Skeleton className={`h-16 rounded-[1.75rem] ${i % 2 === 0 ? 'w-48' : 'w-56'}`} />
        </div>
      ))}
    </div>
  );
}

export function MessageThread({
  selectedMessageId,
  onReply,
  onThreadDeleted,
  onThreadLoaded,
  currentUserId,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: thread, isLoading, error } = useMessageThread(selectedMessageId);
  const { markAsRead, deleteMessage } = useMessageMutations();

  // Scroll to bottom when messages load or new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  // Mark as read when thread opens (if unread)
  const rootMessage = thread?.data ?? null;
  const { mutate: markAsReadMutate } = markAsRead;

  useEffect(() => {
    if (selectedMessageId && rootMessage?.is_read === false) {
      markAsReadMutate(selectedMessageId);
    }
  }, [selectedMessageId, rootMessage?.is_read, markAsReadMutate]);

  // Notify parent of the root message for reply context
  useEffect(() => {
    if (rootMessage && onThreadLoaded) {
      onThreadLoaded(rootMessage);
    }
  }, [rootMessage, onThreadLoaded]);

  // Build flat list: root + all replies
  const allMessages: Message[] = useMemo(
    () => (rootMessage ? [rootMessage, ...(rootMessage.replies ?? [])] : []),
    [rootMessage]
  );

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    allMessages.forEach((msg) => {
      const date = format(parseISO(msg.created_at), 'yyyy-MM-dd');
      const existingGroup = groups.find((g) => g.date === date);
      if (existingGroup) {
        existingGroup.messages.push(msg);
      } else {
        groups.push({ date, messages: [msg] });
      }
    });
    return groups;
  }, [allMessages]);

  // id → message map — reply preview üçün parent mesajı tapmaq
  const messageMap = useMemo(() => {
    const map = new Map<number, Message>();
    allMessages.forEach((m) => map.set(m.id, m));
    return map;
  }, [allMessages]);

  const handleDelete = (id: number) => {
    if (window.confirm('Bu mesajı silmək istədiyinizə əminsiniz?')) {
      deleteMessage.mutate(id, {
        onSuccess: () => {
          if (id === selectedMessageId) {
            onThreadDeleted?.();
          }
        },
      });
    }
  };

  if (!selectedMessageId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center gap-4">
        <div className="h-20 w-20 rounded-[2.5rem] bg-gray-50 dark:bg-white/5 flex items-center justify-center opacity-40">
          <MessageSquare className="h-10 w-10" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Söhbət seçin</p>
          <p className="text-xs font-medium opacity-60">Mesajlaşmağa başlamaq üçün soldan bir söhbət seçin</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <ThreadSkeleton />;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive text-sm px-4 text-center">
        Mesajlar yüklənərkən xəta baş verdi.
      </div>
    );
  }

  if (!rootMessage) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Mesaj tapılmadı.
      </div>
    );
  }

  // Determine thread subject name for header
  const isRootOwn = rootMessage.sender.id === currentUserId;
  const headerName = isRootOwn
    ? rootMessage.recipients && rootMessage.recipients.length > 0
      ? rootMessage.recipients.map((r) => r.name).join(', ')
      : 'Alıcı'
    : rootMessage.sender.name;

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] dark:bg-transparent">
      {/* Thread header - Glassmorphism */}
      <div className="px-6 py-4 border-b border-gray-100/50 bg-white/60 dark:bg-white/5 backdrop-blur-md flex-shrink-0 flex items-center justify-between gap-4 z-10 shadow-sm transition-all duration-300">
        <div className="min-w-0 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-white/10 dark:to-transparent flex items-center justify-center shadow-sm">
             <div className="text-blue-600 dark:text-blue-400 font-black text-sm uppercase">{getInitials(headerName)}</div>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-black tracking-tight text-gray-900 dark:text-white truncate">{headerName}</p>
            {rootMessage.sender.institution && (
              <p className="text-[11px] font-bold text-gray-500 truncate uppercase tracking-tighter opacity-70">
                {rootMessage.sender.institution.name}
              </p>
            )}
          </div>
        </div>

        {isRootOwn && rootMessage.recipients && rootMessage.recipients.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <button 
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all group shrink-0"
              >
                <Users className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span>Alıcılar ({rootMessage.recipients.length})</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl backdrop-blur-3xl bg-white/90 dark:bg-gray-900/90">
              <DialogHeader>
                <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                   <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-500" />
                   </div>
                   Mesaj Alıcıları
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[52vh] mt-6 pr-4">
                <div className="space-y-4">
                  {rootMessage.recipients.map((recipient) => (
                    <div key={recipient.id} className="flex items-center justify-between gap-4 p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-xs font-black shadow-lg">
                          {getInitials(recipient.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900 dark:text-white truncate">{recipient.name}</p>
                          <p className="text-[10px] uppercase font-bold tracking-tighter text-gray-500 opacity-70">Admin hərəkəti</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        {recipient.is_read ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
                            <CheckCheck className="h-3.5 w-3.5" />
                            Oxunub
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-500 bg-red-500/10 px-3 py-1 rounded-full">
                            <Check className="h-3.5 w-3.5" />
                            Oxunmayıb
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Messages - WhatsApp Style Background and Date Grouping */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-[#f8f9fa] dark:bg-transparent relative">
        {/* Subtle pattern layer if needed, currently using off-white as requested */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

        <div className="relative z-10">
          {groupedMessages.map((group) => (
            <div key={group.date} className="flex flex-col">
              {/* Date Barrier - Sticky */}
              <div className="sticky top-0 z-20 flex justify-center my-6">
                <span className="px-4 py-1.5 rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-md text-[11px] font-black uppercase tracking-widest text-gray-500 shadow-sm border border-black/5">
                  {formatDateHeader(group.messages[0].created_at)}
                </span>
              </div>

              {group.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender.id === currentUserId}
                  onReply={onReply}
                  onDelete={handleDelete}
                  parentMessage={msg.parent_id ? messageMap.get(msg.parent_id) : undefined}
                />
              ))}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
