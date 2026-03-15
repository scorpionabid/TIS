import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUnreadCount } from '@/hooks/messages/useMessages';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface MessagingIndicatorProps {
  onClick: () => void;
}

export function MessagingIndicator({ onClick }: MessagingIndicatorProps) {
  const { isEchoConnected } = useWebSocket();
  // WebSocket aktiv olduqda polling lazım deyil — cache invalidation real-time gəlir
  const { data } = useUnreadCount(isEchoConnected);
  const unreadCount = data?.count ?? 0;

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="relative flex items-center gap-2 h-9 px-3 xl:px-4 text-sm font-normal text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border/60 xl:min-w-[180px] xl:justify-start"
    >
      <MessageSquare className="h-4 w-4 flex-shrink-0" />
      <span className="hidden xl:inline truncate">Mesajlar</span>
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] font-medium flex items-center justify-center xl:static xl:ml-auto xl:translate-x-0 xl:translate-y-0"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
