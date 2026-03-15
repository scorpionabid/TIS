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
import { Users, CheckCheck, Check } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { useMessageThread } from '@/hooks/messages/useMessages';
import { useMessageMutations } from '@/hooks/messages/useMessageMutations';
import type { Message } from '@/types/message';

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

function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
          <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
          <Skeleton className={`h-14 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-56'}`} />
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
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Söhbət seçin
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
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="px-4 py-2.5 border-b bg-background flex-shrink-0 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{headerName}</p>
          {rootMessage.sender.institution && (
            <p className="text-xs text-muted-foreground truncate">
              {rootMessage.sender.institution.name}
            </p>
          )}
        </div>

        {isRootOwn && rootMessage.recipients && rootMessage.recipients.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <button 
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-muted text-xs font-medium text-muted-foreground transition-colors flex-shrink-0"
              >
                <Users className="h-4 w-4" />
                Alıcılar ({rootMessage.recipients.length})
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Mesaj Alıcıları ({rootMessage.recipients.length} nəfər)</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[52vh] mt-2 pr-4">
                <div className="space-y-3">
                  {rootMessage.recipients.map((recipient) => (
                    <div key={recipient.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {getInitials(recipient.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{recipient.name}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium">
                        {recipient.is_read ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
                            <CheckCheck className="h-3.5 w-3.5" />
                            Oxunub
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {allMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender.id === currentUserId}
            onReply={onReply}
            onDelete={handleDelete}
            parentMessage={msg.parent_id ? messageMap.get(msg.parent_id) : undefined}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
