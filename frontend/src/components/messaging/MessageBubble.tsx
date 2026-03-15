import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { Check, CheckCheck, Reply, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/message';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReply?: (message: Message) => void;
  onDelete?: (id: number) => void;
  parentMessage?: Message;
}

function formatMessageTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: az });
  } catch {
    return new Date(dateStr).toLocaleDateString('az-AZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

function ReadStatus({ isRead }: { isRead: boolean | null }) {
  if (isRead === null) return null;
  if (isRead) {
    return <CheckCheck className="h-3.5 w-3.5 text-blue-400" />;
  }
  return <Check className="h-3.5 w-3.5 text-primary-foreground/60" />;
}

export function MessageBubble({ message, isOwn, onReply, onDelete, parentMessage }: MessageBubbleProps) {
  const isUnread = !isOwn && message.is_read === false;

  return (
    <div className={cn('group flex items-end gap-2 mb-3', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold',
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {message.sender.name.charAt(0).toUpperCase()}
      </div>

      {/* Bubble + actions */}
      <div className={cn('flex flex-col max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender name (only for received messages) */}
        {!isOwn && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {message.sender.name}
          </span>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'relative px-3 py-2 rounded-2xl text-sm leading-relaxed',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm',
            isUnread && !isOwn && 'border-l-4 border-primary shadow-sm'
          )}
        >
          {/* Reply preview */}
          {parentMessage && (
            <div
              className={cn(
                'border-l-2 pl-2 mb-2 text-xs opacity-70 rounded-sm',
                isOwn ? 'border-primary-foreground/40' : 'border-primary'
              )}
            >
              <span className="font-semibold block truncate">{parentMessage.sender.name}</span>
              <span className="line-clamp-2 break-words">
                {parentMessage.body.slice(0, 80)}{parentMessage.body.length > 80 ? '…' : ''}
              </span>
            </div>
          )}

          <p className="whitespace-pre-wrap break-words">{message.body}</p>

          {/* Time + read status */}
          <div
            className={cn(
              'flex items-center gap-1 mt-1',
              isOwn ? 'justify-end' : 'justify-start'
            )}
          >
            <span
              className={cn(
                'text-[10px]',
                isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}
            >
              {formatMessageTime(message.created_at)}
            </span>
            {isOwn && <ReadStatus isRead={message.is_read} />}
          </div>
        </div>

        {/* Actions (shown on hover) */}
        <div className={cn('flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity', isOwn ? 'flex-row-reverse' : 'flex-row')}>
          {onReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(message)}
              className="h-6 px-2 text-xs"
            >
              <Reply className="h-3 w-3 mr-1" />
              Cavab ver
            </Button>
          )}
          {isOwn && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(message.id)}
              className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Sil
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
