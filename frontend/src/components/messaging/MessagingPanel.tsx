import { useState, useEffect, useRef } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { MessageCompose } from './MessageCompose';
import { HierarchicalRecipientSelector } from './HierarchicalRecipientSelector';
import { RecipientSelector } from './RecipientSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Message, MessageTab } from '@/types/message';

interface MessagingPanelProps {
  open: boolean;
  onClose: () => void;
}

type PanelView = 'list' | 'thread' | 'compose';

export function MessagingPanel({ open, onClose }: MessagingPanelProps) {
  const { currentUser } = useAuth();
  const { isSchoolAdmin } = useRoleCheck();
  const { listenToUserChannel, stopListening, isEchoConnected } = useWebSocket();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<MessageTab>('inbox');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState<number[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Mobile: track which panel is visible
  const [mobileView, setMobileView] = useState<PanelView>('list');

  const handleSelectConversation = (id: number) => {
    setSelectedId(id);
    setReplyTo(null);
    setIsComposing(false);
    setMobileView('thread');
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    setIsComposing(false);
  };

  const handleReplyCancel = () => {
    setReplyTo(null);
  };

  const handleComposeSent = () => {
    setIsComposing(false);
    setSelectedRecipients([]);
    setSelectedInstitutions([]);
    setSelectedRoles([]);
    setTab('sent');
  };

  const handleThreadSent = () => {
    setReplyTo(null);
  };

  const handleNewMessage = () => {
    setIsComposing(true);
    setSelectedId(null);
    setReplyTo(null);
    setSelectedRecipients([]);
    setSelectedInstitutions([]);
    setSelectedRoles([]);
    setMobileView('compose');
  };

  const handleBackToList = () => {
    setMobileView('list');
    setIsComposing(false);
    setSelectedRecipients([]);
    setSelectedInstitutions([]);
    setSelectedRoles([]);
  };

  const currentUserId = currentUser?.id ?? 0;

  // open dəyişdikdə yenidən subscribe etməmək üçün ref istifadə edirik
  const openRef = useRef(open);
  openRef.current = open;

  // WebSocket: yeni mesaj gəldikdə cache-i yenilə, panel bağlıdırsa toast göstər
  // `open` deps-dən çıxarıldı — channel subscription panel açıb-bağlamaqdan asılı olmamalıdır
  useEffect(() => {
    if (!currentUser || !isEchoConnected) return;

    const channelName = `App.Models.User.${currentUser.id}`;

    listenToUserChannel(currentUser.id, (data: unknown) => {
      const eventData = data as {
        type?: string;
        sender_name?: string;
        body_preview?: string;
      };

      // Yalnız bu event tipini emal et — catch-all `|| !eventData?.type` digər event-ləri tetikləyə bilər
      if (eventData?.type === 'NewMessageReceived') {
        queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] });

        if (!openRef.current) {
          toast.info(
            `${eventData.sender_name ?? 'Yeni mesaj'}: ${eventData.body_preview ?? ''}`,
            { duration: 4000 }
          );
        }
      }
    });

    return () => {
      stopListening(channelName);
    };
  }, [currentUser, isEchoConnected, queryClient, listenToUserChannel, stopListening]);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="flex-row items-center justify-between px-4 py-3 border-b space-y-0 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Back button for mobile thread/compose view */}
            {mobileView !== 'list' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:hidden"
                onClick={handleBackToList}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Geri</span>
              </Button>
            )}
            <SheetTitle className="text-base">
              {isComposing && mobileView === 'compose' ? 'Yeni mesaj' : 'Mesajlar'}
            </SheetTitle>
          </div>

          <div className="flex items-center gap-2">
            {!isComposing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewMessage}
                className="h-8 text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Yeni mesaj
              </Button>
            )}
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <span className="sr-only">Bağla</span>
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* New message compose view */}
          {isComposing ? (
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
              <div>
                <p className="text-sm font-medium mb-2">Alıcılar</p>
                {isSchoolAdmin ? (
                  /* SchoolAdmin: yalnız fərdi (tək) mesaj göndərə bilər */
                  <RecipientSelector
                    selected={selectedRecipients}
                    onChange={setSelectedRecipients}
                    singleSelect
                  />
                ) : (
                  /* RegionAdmin / RegionOperator / SektorAdmin: toplu + fərdi */
                  <HierarchicalRecipientSelector
                    selectedUsers={selectedRecipients}
                    selectedInstitutions={selectedInstitutions}
                    onUserChange={setSelectedRecipients}
                    onInstitutionChange={setSelectedInstitutions}
                  />
                )}
              </div>

              {(selectedRecipients.length > 0 || selectedInstitutions.length > 0) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Mesaj</p>
                    <MessageCompose
                      onSent={handleComposeSent}
                      preselectedRecipientIds={selectedRecipients}
                      preselectedInstitutionIds={selectedInstitutions}
                      preselectedRoles={selectedRoles}
                    />
                  </div>
                </>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsComposing(false);
                  setMobileView('list');
                }}
                className="self-start text-muted-foreground"
              >
                Ləğv et
              </Button>
            </div>
          ) : (
            <>
              {/* Conversation list — hidden on mobile when thread is open */}
              <div
                className={cn(
                  'w-64 flex-shrink-0 border-r flex flex-col overflow-hidden',
                  // On mobile: show/hide based on view
                  mobileView === 'list' ? 'flex' : 'hidden sm:flex'
                )}
              >
                <ConversationList
                  tab={tab}
                  onTabChange={setTab}
                  selectedId={selectedId}
                  onSelect={handleSelectConversation}
                />
              </div>

              {/* Thread + compose area — hidden on mobile when list is shown */}
              <div
                className={cn(
                  'flex-1 flex flex-col overflow-hidden',
                  mobileView === 'list' ? 'hidden sm:flex' : 'flex'
                )}
              >
                <div className="flex-1 overflow-hidden flex flex-col">
                  <MessageThread
                    selectedMessageId={selectedId}
                    onReply={handleReply}
                    currentUserId={currentUserId}
                  />
                </div>

                {/* Compose area — only show when a conversation is selected */}
                {selectedId !== null && (
                  <div className="flex-shrink-0 border-t p-3">
                    <MessageCompose
                      replyTo={replyTo}
                      onReplyCancel={handleReplyCancel}
                      onSent={handleThreadSent}
                      preselectedRecipientIds={
                        replyTo ? [replyTo.sender.id] : []
                      }
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

