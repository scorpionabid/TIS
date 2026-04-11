import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { Check, CheckCheck, Reply, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
    <div className={cn('group flex items-end gap-2 mb-4', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar - Slightly smaller for bubbles with tails */}
      <div
        className={cn(
          'flex-shrink-0 h-8 w-8 rounded-2xl flex items-center justify-center text-[10px] font-black shadow-md ring-2 ring-white/10 transition-transform duration-300 group-hover:scale-110 mb-1',
          isOwn
            ? 'bg-gradient-to-br from-[#0059E1] to-[#003d99] text-white'
            : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-300 ring-gray-100 dark:ring-white/5'
        )}
      >
        {message.sender.name.charAt(0).toUpperCase()}
      </div>

      {/* Bubble + actions */}
      <div className={cn('flex flex-col max-w-[85%] sm:max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender name (only for received messages) */}
        {!isOwn && (
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 px-2 opacity-70">
            {message.sender.name}
          </span>
        )}

        {/* Bubble with Tail */}
        <motion.div
					initial={{ opacity: 0, scale: 0.95, y: 5 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					transition={{ type: "spring", damping: 25, stiffness: 400 }}
          className={cn(
            'relative px-4 py-2.5 rounded-[1.4rem] text-[15px] leading-[1.4] shadow-md transition-all duration-300',
            isOwn
              ? 'bg-gradient-to-br from-[#0059E1] to-[#004dc4] text-white rounded-tr-none'
              : 'bg-white dark:bg-[#1f2c33] text-gray-900 dark:text-gray-100 rounded-tl-none border border-black/5 dark:border-white/5',
            isUnread && !isOwn && 'ring-2 ring-blue-500/50'
          )}
        >
          {/* WhatsApp Tail Tip */}
          <div 
            className={cn(
              "absolute top-0 w-3 h-3",
              isOwn 
                ? "-right-1.5 bg-[#0059E1] [clip-path:polygon(0_0,0_100%,100%_0)]" 
                : "-left-1.5 bg-white dark:bg-[#1f2c33] [clip-path:polygon(100%_0,100%_100%,0_0)]"
            )}
           />

          {/* Reply preview - WhatsApp style */}
          {parentMessage && (
            <div
              className={cn(
                'border-l-4 pl-3 py-1.5 mb-2.5 text-xs rounded-lg bg-black/5 dark:bg-white/5 overflow-hidden',
                isOwn ? 'border-white/40' : 'border-[#0059E1]'
              )}
            >
              <span className="font-black uppercase tracking-tight block mb-0.5 opacity-80">{parentMessage.sender.name}</span>
              <span className="line-clamp-2 leading-relaxed opacity-70 font-medium">
                {parentMessage.body}
              </span>
            </div>
          )}

          <p className="whitespace-pre-wrap break-words font-medium">{message.body}</p>

          {/* Time + read status */}
          <div
            className={cn(
              'flex items-center gap-1.5 mt-1 opacity-70',
              isOwn ? 'justify-end' : 'justify-start'
            )}
          >
            <span
              className={cn(
                'text-[9px] font-bold uppercase tracking-tighter',
                isOwn ? 'text-white/80' : 'text-gray-400'
              )}
            >
              {formatMessageTime(message.created_at)}
            </span>
            {isOwn && <ReadStatus isRead={message.is_read} />}
          </div>
        </motion.div>

        {/* Actions (shown on hover) */}
        <div className={cn('flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100', isOwn ? 'flex-row-reverse' : 'flex-row')}>
          {onReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(message)}
              className="h-7 px-3 text-[9px] font-black uppercase tracking-widest bg-gray-100/80 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-full transition-all"
            >
              <Reply className="h-3 w-3 mr-1" />
              Cavab
            </Button>
          )}
          {isOwn && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(message.id)}
              className="h-7 px-3 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all"
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
