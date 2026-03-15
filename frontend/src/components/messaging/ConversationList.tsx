import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { MessageSquare, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

function formatShortTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: false, locale: az });
  } catch {
    return new Date(dateStr).toLocaleDateString('az-AZ');
  }
}

function getInitials(name: string): string {
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

  // Sent tab: oxunma vəziyyəti — neçəsi oxuyub
  const readCount = !isInbox && message.recipients
    ? message.recipients.filter((r) => r.is_read).length
    : 0;
  const totalCount = !isInbox ? (message.recipients?.length ?? 0) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/60',
        isSelected && 'bg-muted'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
        {getInitials(displayName)}
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
            <Badge variant="default" className="h-4 min-w-4 px-1 text-[10px] flex-shrink-0">
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
    </button>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageList({
  messages,
  isInbox,
  selectedId,
  onSelect,
}: {
  messages: Message[];
  isInbox: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
        <MessageSquare className="h-7 w-7 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          {isInbox ? 'Gələn qutunuz boşdur' : 'Göndərilən mesaj yoxdur'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border/50">
      {messages.map((msg) => (
        <ConversationItem
          key={msg.id}
          message={msg}
          isSelected={selectedId === msg.id}
          isInbox={isInbox}
          onClick={() => onSelect(msg.id)}
        />
      ))}
    </div>
  );
}

function InboxTab({
  selectedId,
  onSelect,
  isActive,
  searchTerm,
}: {
  selectedId: number | null;
  onSelect: (id: number) => void;
  isActive: boolean;
  searchTerm: string;
}) {
  const { data, isLoading } = useInbox(1, isActive);

  const filtered = useMemo(() =>
    (data?.data ?? []).filter((msg) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        msg.body.toLowerCase().includes(q) ||
        msg.sender.name.toLowerCase().includes(q)
      );
    }),
    [data?.data, searchTerm]
  );

  if (isLoading) return <ListSkeleton />;

  return (
    <MessageList
      messages={filtered}
      isInbox={true}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}

function SentTab({
  selectedId,
  onSelect,
  isActive,
  searchTerm,
}: {
  selectedId: number | null;
  onSelect: (id: number) => void;
  isActive: boolean;
  searchTerm: string;
}) {
  const { data, isLoading } = useSent(1, isActive);

  const filtered = useMemo(() =>
    (data?.data ?? []).filter((msg) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const recipientNames = msg.recipients?.map(r => r.name).join(', ').toLowerCase() ?? '';
      return (
        msg.body.toLowerCase().includes(q) ||
        recipientNames.includes(q)
      );
    }),
    [data?.data, searchTerm]
  );

  if (isLoading) return <ListSkeleton />;

  return (
    <MessageList
      messages={filtered}
      isInbox={false}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}

export function ConversationList({
  tab,
  onTabChange,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 200);

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => onTabChange(v as MessageTab)}
      className="flex flex-col h-full"
    >
      <div className="px-2 pt-2 flex-shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Axtar..."
            className="pl-8 h-8 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <TabsList className="w-full">
          <TabsTrigger value="inbox" className="flex-1 text-xs">
            Gələn qutu
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex-1 text-xs">
            Göndərilənlər
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="inbox" className="flex-1 overflow-y-auto mt-0">
        <InboxTab
          selectedId={selectedId}
          onSelect={onSelect}
          isActive={tab === 'inbox'}
          searchTerm={debouncedSearch}
        />
      </TabsContent>

      <TabsContent value="sent" className="flex-1 overflow-y-auto mt-0">
        <SentTab
          selectedId={selectedId}
          onSelect={onSelect}
          isActive={tab === 'sent'}
          searchTerm={debouncedSearch}
        />
      </TabsContent>
    </Tabs>
  );
}
