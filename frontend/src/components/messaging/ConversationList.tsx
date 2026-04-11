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
      transition={{ duration: 0.2, ease: "easeOut" }}
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 px-5 py-4 text-left transition-all duration-300',
        'hover:bg-blue-50/30 dark:hover:bg-white/5',
        'relative overflow-hidden group',
        isSelected 
          ? 'bg-blue-50/50 dark:bg-white/10 shadow-[inset_4px_0_0_0_#0059E1]' 
          : 'hover:shadow-[inset_4px_0_0_0_rgba(0,89,225,0.3)]'
      )}
    >
      {/* Modern Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg transition-transform duration-300 group-hover:scale-110",
          "bg-gradient-to-br from-[#0059E1] via-[#004dc4] to-[#003d99] text-white ring-2 ring-white/10",
          isSelected && "ring-blue-300/50"
        )}>
          {getInitials(displayName)}
        </div>
        {/* Online indicator */}
        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 shadow-md" />
        {/* Direction badge - now more subtle */}
        <span className={cn(
          "absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center shadow-md ring-1 ring-white/20",
          isInbox
            ? "bg-blue-500 text-white"
            : "bg-emerald-500 text-white"
        )}>
          {isInbox
            ? <ArrowDownLeft className="h-3 w-3" />
            : <ArrowUpRight className="h-3 w-3" />
          }
        </span>
      </div>

      {/* Modern Content Layout */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-[15px] truncate transition-colors',
              isUnread ? 'text-gray-900 dark:text-white font-extrabold' : 'text-gray-700 dark:text-gray-300 font-bold'
            )}
          >
            {displayName}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0 font-bold uppercase tracking-tighter">
            {formatShortTime(message.created_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "text-sm truncate leading-snug",
            isUnread ? 'text-gray-800 dark:text-gray-200 font-semibold' : 'text-gray-500 dark:text-gray-400 font-medium'
          )}>
            {!isInbox && <span className="opacity-60">Siz: </span>}
            {message.body}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isUnread && (
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(0,89,225,0.5)] animate-pulse" />
            )}
            {!isInbox && totalCount > 0 && (
              <div className={cn(
                "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter",
                allRead ? "bg-emerald-100/50 text-emerald-600 dark:bg-emerald-500/20" : "bg-gray-100 text-gray-500 dark:bg-white/5"
              )}>
                {allRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                {readCount}/{totalCount}
              </div>
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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-24 gap-6 text-center px-8"
      >
        <div className="relative">
          <div className="h-20 w-20 rounded-[2rem] bg-gradient-to-br from-blue-500/20 to-blue-600/5 dark:from-white/10 dark:to-transparent flex items-center justify-center shadow-xl ring-1 ring-white/20">
            <MessageSquare className="h-10 w-10 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex items-center justify-center ring-2 ring-gray-50 dark:ring-gray-900">
            <span className="text-xl">✨</span>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Mesaj yoxdur</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[240px] leading-relaxed font-medium">Bütün yazışmalarınız burada görünəcək. İlk mesajınızı göndərməyə nə deyirsiniz?</p>
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
      <div className="px-5 pt-6 pb-4 flex-shrink-0">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-all duration-300" />
          <Input
            placeholder="Mesaj axtar..."
            className="pl-11 h-12 text-sm bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Buttons - Modern Segmented Control */}
      <div className="px-5 py-2 flex-shrink-0">
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 p-1.5 bg-gray-100/80 dark:bg-white/5 rounded-2xl min-w-max ring-1 ring-black/5 dark:ring-white/5">
          {/* Hamısı */}
          <button
            onClick={() => setFilterTab('all')}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
              filterTab === 'all'
                ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-md ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>Hamısı</span>
            {allCount > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[9px] font-black",
                filterTab === 'all' ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20" : "bg-black/5 text-gray-500 dark:bg-white/10"
              )}>
                {allCount}
              </span>
            )}
          </button>

          {/* Gələn */}
          <button
            onClick={() => setFilterTab('inbox')}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
              filterTab === 'inbox'
                ? "bg-[#0059E1] text-white shadow-lg shadow-blue-500/30 scale-[1.02]"
                : "text-gray-500 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-500/10"
            )}
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            <span>Gələn</span>
            {inboxCount > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[9px] font-black",
                filterTab === 'inbox' ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600 dark:bg-blue-500/20"
              )}>
                {unreadCount > 0 ? `${unreadCount}/${inboxCount}` : inboxCount}
              </span>
            )}
          </button>

          {/* Gedən */}
          <button
            onClick={() => setFilterTab('sent')}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
              filterTab === 'sent'
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]"
                : "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10"
            )}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Gedən</span>
            {sentCount > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[9px] font-black",
                filterTab === 'sent' ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20"
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
