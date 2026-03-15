import { MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const unreadCount = unreadData?.count ?? 0;

  // Ən son gələn mesajı göstərmək üçün
  const { data: inboxData } = useInbox('', true);
  const latestMessage = inboxData?.pages?.[0]?.data?.[0];

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="relative flex items-center gap-2.5 h-10 px-3 xl:px-4 text-sm font-normal text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border/60 xl:min-w-[240px] xl:max-w-[280px] xl:justify-start transition-all"
    >
      <MessageSquare className="h-4 w-4 flex-shrink-0" />
      
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

      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className="absolute -top-1.5 -right-1.5 xl:static xl:ml-auto flex-shrink-0"
          >
            <Badge
              variant="destructive"
              className="h-4 min-w-4 px-1 text-[10px] font-medium flex items-center justify-center shadow-sm shadow-destructive/30"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}
