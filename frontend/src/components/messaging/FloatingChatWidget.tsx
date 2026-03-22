import { useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessagingPanel } from './MessagingPanel';
import { MessagePreviewCard } from './MessagePreviewCard';
import { useUnreadCount, useInbox } from '@/hooks/messages/useMessages';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { Message } from '@/types/message';

/**
 * Floating Chat Widget - LiveChat style chat bubble
 * Appears at bottom-right of screen with unread badge and animations
 */
export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [latestMessage, setLatestMessage] = useState<Message | null>(null);
  const { isEchoConnected } = useWebSocket();
  const { data: unreadData } = useUnreadCount(isEchoConnected);
  const { data: inboxData } = useInbox('', isEchoConnected);

  const computedUnreadCount = useMemo(() => {
    const items = inboxData?.pages?.flatMap((p) => p.data) ?? [];
    return items.filter((m) => m.is_read === false).length;
  }, [inboxData]);

  // Prefer computed unread count (derived from actual messages) to avoid a "1" badge when there are no unread messages.
  const unreadCount = computedUnreadCount > 0 ? computedUnreadCount : (unreadData?.count ?? 0);
  const hasUnread = computedUnreadCount > 0;

  // Show preview card when new unread messages arrive
  useEffect(() => {
    if (hasUnread && inboxData?.pages && inboxData.pages.length > 0 && !isOpen) {
      const firstPage = inboxData.pages[0];
      if (firstPage?.data && firstPage.data.length > 0) {
        const firstUnread = firstPage.data.find((m: Message) => !m.is_read);
        if (firstUnread) {
          setLatestMessage(firstUnread);
          setShowPreview(true);
        }
      }
    }
  }, [hasUnread, inboxData, isOpen]);

  const handlePreviewClick = () => {
    setShowPreview(false);
    setIsOpen(true);
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed right-6 bottom-24 sm:bottom-6 z-[9999]",
          "flex items-center justify-center",
          "w-16 h-16 rounded-full",
          "bg-[#0059E1] hover:bg-blue-700",
          "text-white",
          "shadow-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)]",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-2 hover:scale-105",
          "group",
          "border-4 border-white/20"
        )}
        aria-label="Mesajları aç"
      >
        {/* Chat Icon with hover animation */}
        <MessageCircle 
          className="w-7 h-7 transition-transform duration-300 group-hover:scale-110" 
          strokeWidth={2}
        />

        {/* Unread Badge with enhanced pulse animation */}
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5">
            {/* Outer glow ring */}
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40 duration-700"></span>
            {/* Middle pulse ring */}
            <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-60"></span>
            {/* Main badge */}
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 border-[3px] border-white shadow-lg shadow-red-500/50">
              {unreadCount > 9 ? (
                <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white">
                  9+
                </span>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </span>
          </span>
        )}
      </button>

      {/* Message Preview Card */}
      <MessagePreviewCard
        message={latestMessage}
        isVisible={showPreview}
        onClose={handlePreviewClose}
        onClick={handlePreviewClick}
      />

      {/* Messaging Panel */}
      <MessagingPanel open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default FloatingChatWidget;
