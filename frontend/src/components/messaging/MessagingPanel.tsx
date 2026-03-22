import { useState } from 'react';
import { Plus, ArrowLeft, MessageSquare, X, Send, ArrowDownLeft } from 'lucide-react';
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
import { useMessageWebSocket } from '@/hooks/messages/useMessageWebSocket';
import type { Message, MessageTab } from '@/types/message';

interface MessagingPanelProps {
  open: boolean;
  onClose: () => void;
}

type PanelView = 'list' | 'thread' | 'compose';

export function MessagingPanel({ open, onClose }: MessagingPanelProps) {
  const { currentUser } = useAuth();
  const { isSchoolAdmin } = useRoleCheck();
  useMessageWebSocket(open);
  const [tab, setTab] = useState<MessageTab>('inbox');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState<number[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [defaultRecipientIds, setDefaultRecipientIds] = useState<number[]>([]);
  const [defaultParentId, setDefaultParentId] = useState<number | undefined>(undefined);

  // Mobile: track which panel is visible
  const [mobileView, setMobileView] = useState<PanelView>('list');

  const handleSelectConversation = (id: number) => {
    setSelectedId(id);
    setReplyTo(null);
    setDefaultRecipientIds([]);
    setDefaultParentId(undefined);
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

  const handleThreadLoaded = (message: Message) => {
    // If we are in a thread, set default recipients for quick reply
    // If I sent the message, default recipient is the recipient(s)
    // If I received the message, default recipient is the sender
    if (message.sender.id === currentUserId) {
      if (message.recipients && message.recipients.length > 0) {
        setDefaultRecipientIds(message.recipients.map((r) => r.id));
      }
    } else {
      setDefaultRecipientIds([message.sender.id]);
    }
    setDefaultParentId(message.id);
  };

  const handleNewMessage = () => {
    setIsComposing(true);
    setSelectedId(null);
    setReplyTo(null);
    setDefaultRecipientIds([]);
    setDefaultParentId(undefined);
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
    setDefaultRecipientIds([]);
    setDefaultParentId(undefined);
  };

  const currentUserId = currentUser?.id ?? 0;


  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="w-[95vw] sm:w-full sm:max-w-4xl lg:max-w-5xl p-0 flex flex-col bg-background shadow-2xl border-l border-border/40"
      >
        {/* Header - Modern Design */}
        <SheetHeader className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/50 space-y-0 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Back button for mobile thread/compose view */}
            {mobileView !== 'list' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:hidden rounded-full hover:bg-gray-100"
                onClick={handleBackToList}
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
                <span className="sr-only">Geri</span>
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#0059E1] to-[#003d99] flex items-center justify-center shadow-md">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-gray-900">
                  {isComposing && mobileView === 'compose' ? 'Yeni mesaj' : 'Mesajlar'}
                </SheetTitle>
                <p className="text-xs text-gray-500">Mesajlaşma mərkəzi</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isComposing && (
              <Button
                variant="default"
                size="sm"
                onClick={handleNewMessage}
                className="h-9 text-xs gap-2 bg-[#0059E1] hover:bg-blue-700 rounded-lg shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Yeni mesaj
              </Button>
            )}
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
                <span className="sr-only">Bağla</span>
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* New message compose view - Modern Design */}
          {isComposing ? (
            <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white">
              {/* Compose Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                    <Send className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Yeni mesaj</h3>
                    <p className="text-xs text-gray-500">Mesajınızı yazın və göndərin</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsComposing(false);
                    setMobileView('list');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Ləğv et
                </Button>
              </div>

              {/* Compose Body */}
              <div className="flex-1 flex flex-col p-4 gap-4">
                {/* Recipients Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <ArrowDownLeft className="h-3 w-3 text-blue-600" />
                      </span>
                      Alıcılar
                    </p>
                  </div>
                  <div className="p-4">
                    {isSchoolAdmin ? (
                      <RecipientSelector
                        selected={selectedRecipients}
                        onChange={setSelectedRecipients}
                        singleSelect
                      />
                    ) : (
                      <HierarchicalRecipientSelector
                        selectedUsers={selectedRecipients}
                        selectedInstitutions={selectedInstitutions}
                        onUserChange={setSelectedRecipients}
                        onInstitutionChange={setSelectedInstitutions}
                      />
                    )}
                  </div>
                </div>

                {/* Message Card */}
                {(selectedRecipients.length > 0 || selectedInstitutions.length > 0) && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                      <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                          <MessageSquare className="h-3 w-3 text-emerald-600" />
                        </span>
                        Mesaj
                      </p>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <MessageCompose
                        onSent={handleComposeSent}
                        preselectedRecipientIds={selectedRecipients}
                        preselectedInstitutionIds={selectedInstitutions}
                        preselectedRoles={selectedRoles}
                      />
                    </div>
                  </div>
                )}

                {/* Empty state when no recipients */}
                {selectedRecipients.length === 0 && selectedInstitutions.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4 shadow-inner">
                      <Send className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Alıcı seçin</p>
                    <p className="text-xs text-gray-400 max-w-[200px]">Mesaj göndərmək üçün əvvəlcə alıcı seçməlisiniz</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Conversation list — hidden on mobile when thread is open */}
              <div
                className={cn(
                  'w-80 flex-shrink-0 border-r flex flex-col overflow-hidden',
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
                    onThreadDeleted={() => {
                      setSelectedId(null);
                      setMobileView('list');
                    }}
                    onThreadLoaded={handleThreadLoaded}
                    currentUserId={currentUserId}
                  />
                </div>

                {/* Compose area — only show when a conversation is selected */}
                {selectedId !== null && (
                  <div className="flex-shrink-0 border-t border-border/40 bg-muted/20 p-4">
                    <MessageCompose
                      replyTo={replyTo}
                      onReplyCancel={handleReplyCancel}
                      onSent={handleThreadSent}
                      preselectedRecipientIds={
                        replyTo ? [replyTo.sender.id] : defaultRecipientIds
                      }
                      preselectedParentId={defaultParentId}
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

