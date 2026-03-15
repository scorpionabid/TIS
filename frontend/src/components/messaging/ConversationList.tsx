import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { Search, ArrowDownLeft, ArrowUpRight, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { useInbox, useSent } from '@/hooks/messages/useMessages';
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

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/60',
        isSelected && 'bg-primary/5 dark:bg-primary/10'
      )}
    >
      {/* Avatar with direction badge */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm border",
          isInbox
            ? "bg-primary/10 text-primary border-primary/15"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15"
        )}>
          {getInitials(displayName)}
        </div>
        {/* Direction icon badge */}
        <span className={cn(
          "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-background",
          isInbox
            ? "bg-primary text-primary-foreground"
            : "bg-emerald-500 text-white"
        )}>
          {isInbox
            ? <ArrowDownLeft className="h-2.5 w-2.5" />
            : <ArrowUpRight className="h-2.5 w-2.5" />
          }
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn(
              'text-sm truncate',
              isUnread ? 'font-semibold text-foreground' : 'text-foreground/80'
            )}
          >
            {displayName}
          </span>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {formatShortTime(message.created_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-xs text-muted-foreground truncate max-w-[160px]">
            {!isInbox && <span className="font-medium">Siz: </span>}
            {message.body.slice(0, 50)}
            {message.body.length > 50 ? '…' : ''}
          </p>
          {isUnread && (
            <Badge variant="default" className="h-4 min-w-4 px-1 text-[10px] flex-shrink-0 animate-pulse">
              Yeni
            </Badge>
          )}
          {!isInbox && totalCount > 0 && (
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {readCount}/{totalCount} oxuyub
            </span>
          )}
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
}: {
  selectedId: number | null;
  onSelect: (id: number) => void;
  searchTerm: string;
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
    const inbox = (inboxData?.pages.flatMap((p) => p.data) ?? []).map(
      (m): TaggedMessage => ({ message: m, isInbox: true })
    );
    const sent = (sentData?.pages.flatMap((p) => p.data) ?? []).map(
      (m): TaggedMessage => ({ message: m, isInbox: false })
    );

    return [...inbox, ...sent].sort(
      (a, b) =>
        new Date(b.message.created_at).getTime() -
        new Date(a.message.created_at).getTime()
    );
  }, [inboxData, sentData]);

  const isLoading = inboxLoading || sentLoading;
  if (isLoading) return <ListSkeleton />;

  if (combined.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4"
      >
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-1">
          <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Mesaj yoxdur</p>
        <p className="text-xs text-muted-foreground/70">Yeni mesajlar burada görünəcək.</p>
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
  const debouncedSearch = useDebounce(searchTerm, 200);

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-2 pt-2 pb-1 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Axtar..."
            className="pl-8 h-8 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-1.5 flex items-center gap-4 flex-shrink-0 border-b border-border/30">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-3.5 w-3.5 rounded-full bg-primary flex items-center justify-center ring-1 ring-background">
            <ArrowDownLeft className="h-2 w-2 text-primary-foreground" />
          </span>
          Gələn
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 flex items-center justify-center ring-1 ring-background">
            <ArrowUpRight className="h-2 w-2 text-white" />
          </span>
          Gedən
        </span>
      </div>

      {/* Combined scrollable list */}
      <div className="flex-1 overflow-y-auto">
        <CombinedList
          selectedId={selectedId}
          onSelect={onSelect}
          searchTerm={debouncedSearch}
        />
      </div>
    </div>
  );
}
