import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ModernMessageIcon } from '@/components/icons/ModernMessageIcon';
import { useUnreadCount, useInbox } from '@/hooks/messages/useMessages';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { cn } from '@/lib/utils';

interface MessagingIndicatorProps {
  onClick: () => void;
}

export function MessagingIndicator({ onClick }: MessagingIndicatorProps) {
  const { isEchoConnected } = useWebSocket();
  // WebSocket aktiv olduqda polling lazım deyil — cache invalidation real-time gəlir
  const { data: unreadData } = useUnreadCount(isEchoConnected);

  const { data: inboxData } = useInbox('', true);
  const inboxItems = inboxData?.pages?.flatMap((p) => p.data) ?? [];
  const computedUnreadCount = inboxItems.filter((m) => m.is_read === false).length;

  // Prefer computed unread count to avoid showing a constant "1" when there are no unread messages.
  const unreadCount = computedUnreadCount > 0 ? computedUnreadCount : (unreadData?.count ?? 0);

  // Ən son gələn mesajı göstərmək üçün
  const latestMessage = inboxItems?.[0];

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="relative flex items-center gap-2.5 h-10 px-3 xl:px-4 text-sm font-normal text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border/60 xl:min-w-[240px] xl:max-w-[280px] xl:justify-start transition-all"
    >
      <ModernMessageIcon 
        size={20} 
        unreadCount={unreadCount} 
        animated={true}
        className="flex-shrink-0"
      />
      
      <div className="hidden xl:flex flex-col items-start overflow-hidden flex-1 truncate">
        <span className="text-[12px] font-medium leading-none mb-1.5 text-foreground">Mesajlar</span>
        {latestMessage ? (
           <span className={cn(
             "text-[10px] truncate w-full px-1.5 py-[3px] rounded leading-tight transition-colors text-left",
             latestMessage.is_read === false 
               ? "bg-destructive text-destructive-foreground font-medium shadow-sm" 
               : "bg-muted text-muted-foreground"
           )}>
             <span className="font-semibold">{latestMessage.sender.name}:</span> {latestMessage.body}
           </span>
        ) : (
           <span className="text-[10px] text-muted-foreground truncate w-full text-left">
             Mesaj qutusu boşdur
           </span>
        )}
      </div>
    </Button>
  );
}
