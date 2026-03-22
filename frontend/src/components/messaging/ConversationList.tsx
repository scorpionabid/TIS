import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { Search, ArrowDownLeft, ArrowUpRight, MessageSquare, Check, CheckCheck, Inbox, Send, ListFilter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { useInbox, useSent, useUnreadCount } from '@/hooks/messages/useMessages';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { Message, MessageTab } from '@/types/message';

interface ConversationListProps {
  tab: MessageTab;
  onTabChange: (tab: MessageTab) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

interface TaggedMessage {
  message: Message;
  isInbox: boolean;
}

function formatShortTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: false, locale: az });
  } catch {
    return new Date(dateStr).toLocaleDateString('az-AZ');
  }
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function ConversationItem({
  message,
  isSelected,
  isInbox,
  onClick,
}: {
  message: Message;
  isSelected: boolean;
  isInbox: boolean;
  onClick: () => void;
}) {
  const displayName = isInbox
    ? message.sender.name
    : message.recipients && message.recipients.length > 0
    ? message.recipients.map((r) => r.name).join(', ')
    : 'Alıcı';

  const isUnread = isInbox && message.is_read === false;

  const readCount = !isInbox && message.recipients
    ? message.recipients.filter((r) => r.is_read).length
    : 0;
  const totalCount = !isInbox ? (message.recipients?.length ?? 0) : 0;
  const allRead = readCount === totalCount && totalCount > 0;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200',
        'hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent',
        'border-l-2',
        isSelected 
          ? 'bg-gradient-to-r from-blue-50 to-transparent border-l-blue-500 shadow-sm' 
          : 'border-l-transparent hover:border-l-blue-300',
        isUnread && 'bg-gradient-to-r from-blue-50/80 to-transparent'
      )}
    >
      {/* Modern Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center text-sm font-bold shadow-md",
          "bg-gradient-to-br from-[#0059E1] to-[#003d99] text-white",
          isSelected && "ring-2 ring-blue-300 ring-offset-1"
        )}>
          {getInitials(displayName)}
        </div>
        {/* Online indicator */}
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
        {/* Direction badge */}
        <span className={cn(
          "absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center shadow-sm",
          isInbox
            ? "bg-blue-500 text-white"
            : "bg-emerald-500 text-white"
        )}>
          {isInbox
            ? <ArrowDownLeft className="h-2.5 w-2.5" />
            : <ArrowUpRight className="h-2.5 w-2.5" />
          }
        </span>
      </div>

      {/* Modern Content Layout */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-sm truncate font-medium',
              isUnread ? 'text-gray-900 font-semibold' : 'text-gray-700'
            )}
          >
            {displayName}
          </span>
          <span className="text-[10px] text-gray-400 flex-shrink-0 font-medium">
            {formatShortTime(message.created_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className={cn(
            "text-xs truncate max-w-[140px]",
            isUnread ? 'text-gray-700 font-medium' : 'text-gray-500'
          )}>
            {!isInbox && <span className="text-gray-400">Siz: </span>}
            {message.body.slice(0, 45)}
            {message.body.length > 45 ? '…' : ''}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isUnread && (
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            )}
            {!isInbox && totalCount > 0 && (
              <span className={cn(
                "text-[10px] flex items-center gap-0.5 font-medium",
                allRead ? "text-emerald-500" : "text-gray-400"
              )}>
                {allRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                {readCount}/{totalCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
          <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CombinedList({
  selectedId,
  onSelect,
  searchTerm,
  filterTab,
}: {
  selectedId: number | null;
  onSelect: (id: number) => void;
  searchTerm: string;
  filterTab: 'all' | 'inbox' | 'sent';
}) {
  const {
    data: inboxData,
    isLoading: inboxLoading,
    hasNextPage: inboxHasNext,
    fetchNextPage: inboxFetchNext,
    isFetchingNextPage: inboxFetching,
  } = useInbox(searchTerm, true);

  const {
    data: sentData,
    isLoading: sentLoading,
    hasNextPage: sentHasNext,
    fetchNextPage: sentFetchNext,
    isFetchingNextPage: sentFetching,
  } = useSent(searchTerm, true);

  const combined: TaggedMessage[] = useMemo(() => {
    let inbox: TaggedMessage[] = [];
    let sent: TaggedMessage[] = [];

    if (filterTab === 'all' || filterTab === 'inbox') {
      inbox = (inboxData?.pages.flatMap((p) => p.data) ?? []).map(
        (m): TaggedMessage => ({ message: m, isInbox: true })
      );
    }

    if (filterTab === 'all' || filterTab === 'sent') {
      sent = (sentData?.pages.flatMap((p) => p.data) ?? []).map(
        (m): TaggedMessage => ({ message: m, isInbox: false })
      );
    }

    return [...inbox, ...sent].sort(
      (a, b) =>
        new Date(b.message.created_at).getTime() -
        new Date(a.message.created_at).getTime()
    );
  }, [inboxData, sentData, filterTab]);

  const isLoading = inboxLoading || sentLoading;
  if (isLoading) return <ListSkeleton />;

  if (combined.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6"
      >
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shadow-lg">
            <MessageSquare className="h-8 w-8 text-blue-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white shadow-md flex items-center justify-center">
            <span className="text-lg">💬</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-700">Mesaj yoxdur</p>
          <p className="text-xs text-gray-400 max-w-[200px]">Yeni mesajlar burada görünəcək. İlk mesajınızı göndərək!</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col divide-y divide-border/30">
        <AnimatePresence>
          {combined.map(({ message, isInbox }) => (
            <ConversationItem
              key={`${isInbox ? 'in' : 'out'}-${message.id}`}
              message={message}
              isSelected={selectedId === message.id}
              isInbox={isInbox}
              onClick={() => onSelect(message.id)}
            />
          ))}
        </AnimatePresence>
      </div>
      {(inboxHasNext || sentHasNext) && (
        <div className="p-3 flex justify-center gap-2 border-t border-border/10">
          {inboxHasNext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => inboxFetchNext?.()}
              disabled={inboxFetching}
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
            >
              {inboxFetching ? 'Yüklənir...' : 'Gələnlər: daha çox'}
            </Button>
          )}
          {sentHasNext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sentFetchNext?.()}
              disabled={sentFetching}
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
            >
              {sentFetching ? 'Yüklənir...' : 'Gedənlər: daha çox'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ConversationList({
  // tab and onTabChange kept for API compatibility but no longer used for rendering
  selectedId,
  onSelect,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'inbox' | 'sent'>('all');
  const debouncedSearch = useDebounce(searchTerm, 200);
  const { isEchoConnected } = useWebSocket();
  const { data: unreadData } = useUnreadCount(isEchoConnected);
  const unreadCount = unreadData?.count ?? 0;

  // Get counts for filter buttons
  const { data: inboxData } = useInbox('', true);
  const { data: sentData } = useSent('', true);
  
  const inboxCount = inboxData?.pages?.[0]?.data?.length ?? 0;
  const sentCount = sentData?.pages?.[0]?.data?.length ?? 0;
  const allCount = inboxCount + sentCount;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-gray-50/50">
      {/* Modern Search bar */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder="Mesaj axtar..."
            className="pl-10 h-10 text-sm bg-white border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Buttons - Modern Segmented Control */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="overflow-x-auto">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl min-w-max">
          {/* Hamısı */}
          <button
            onClick={() => setFilterTab('all')}
            className={cn(
              "flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap",
              filterTab === 'all'
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
            )}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>Hamısı</span>
            {allCount > 0 && (
              <span className={cn(
                "hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                filterTab === 'all' ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-500"
              )}>
                {allCount}
              </span>
            )}
          </button>

          {/* Gələn */}
          <button
            onClick={() => setFilterTab('inbox')}
            className={cn(
              "flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap",
              filterTab === 'inbox'
                ? "bg-blue-500 text-white shadow-sm"
                : "text-gray-500 hover:text-blue-600 hover:bg-blue-50/50"
            )}
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            <span>Gələn</span>
            {inboxCount > 0 && (
              <span className={cn(
                "hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                filterTab === 'inbox' ? "bg-blue-400 text-white" : "bg-blue-100 text-blue-600"
              )}>
                {unreadCount > 0 ? `${unreadCount}/${inboxCount}` : inboxCount}
              </span>
            )}
          </button>

          {/* Gedən */}
          <button
            onClick={() => setFilterTab('sent')}
            className={cn(
              "flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap",
              filterTab === 'sent'
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/50"
            )}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Gedən</span>
            {sentCount > 0 && (
              <span className={cn(
                "hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                filterTab === 'sent' ? "bg-emerald-400 text-white" : "bg-emerald-100 text-emerald-600"
              )}>
                {sentCount}
              </span>
            )}
          </button>
          </div>
        </div>
      </div>

      {/* Combined scrollable list with padding */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <CombinedList
          selectedId={selectedId}
          onSelect={onSelect}
          searchTerm={debouncedSearch}
          filterTab={filterTab}
        />
      </div>
    </div>
  );
}
