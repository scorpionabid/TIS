import { useEffect, useRef, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from './MessageBubble';
import { useMessageThread } from '@/hooks/messages/useMessages';
import { useMessageMutations } from '@/hooks/messages/useMessageMutations';
import type { Message } from '@/types/message';

interface MessageThreadProps {
  selectedMessageId: number | null;
  onReply: (message: Message) => void;
  onThreadDeleted?: () => void;
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
  onThreadDeleted,
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
            parentMessage={msg.parent_id ? messageMap.get(msg.parent_id) : undefined}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
