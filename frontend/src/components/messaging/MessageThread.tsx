import { useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from './MessageBubble';
import { useMessageThread } from '@/hooks/messages/useMessages';
import { useMessageMutations } from '@/hooks/messages/useMessageMutations';
import type { Message } from '@/types/message';

interface MessageThreadProps {
  selectedMessageId: number | null;
  onReply: (message: Message) => void;
  currentUserId: number;
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
  // thread?.data: service həmişə { data: Message } qaytarır, normalizasiya lazım deyil
  // markAsRead.mutate: TanStack Query v5-də stable ref — loop yaratmır
  const rootMessage = thread?.data ?? null;
  const { mutate: markAsReadMutate } = markAsRead;

  useEffect(() => {
    if (selectedMessageId && rootMessage?.is_read === false) {
      markAsReadMutate(selectedMessageId);
    }
  }, [selectedMessageId, rootMessage?.is_read, markAsReadMutate]);

  const handleDelete = (id: number) => {
    if (window.confirm('Bu mesajı silmək istədiyinizə əminsiniz?')) {
      deleteMessage.mutate(id, {
        onSuccess: () => {
          // If the root message of the thread is deleted, close the thread
          if (id === selectedMessageId) {
            // we should ideally go back to list, but this component doesn't control that.
            // however, we can't really do much here without a callback to clear selectedId in parent.
            // Actually, selectedMessageId is passed as prop. 
          }
        }
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

  // rootMessage yuxarıda `thread?.data ?? null` kimi hesablanıb (markAsRead effect-indən əvvəl)
  if (!rootMessage) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Mesaj tapılmadı.
      </div>
    );
  }

  // Build flat list: root + all replies
  const allMessages: Message[] = [rootMessage, ...(rootMessage.replies ?? [])];

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
      <div className="px-4 py-2.5 border-b bg-background flex-shrink-0">
        <p className="text-sm font-medium truncate">{headerName}</p>
        {rootMessage.sender.institution && (
          <p className="text-xs text-muted-foreground truncate">
            {rootMessage.sender.institution.name}
          </p>
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
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
