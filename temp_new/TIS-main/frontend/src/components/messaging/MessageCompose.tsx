import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useMessageMutations } from '@/hooks/messages/useMessageMutations';
import type { Message, SendMessagePayload } from '@/types/message';

interface MessageComposeProps {
  replyTo?: Message | null;
  onReplyCancel?: () => void;
  onSent: () => void;
  preselectedRecipientIds?: number[];
  preselectedInstitutionIds?: number[];
  preselectedRoles?: string[];
  preselectedParentId?: number;
}

export function MessageCompose({
  replyTo,
  onReplyCancel,
  onSent,
  preselectedRecipientIds = [],
  preselectedInstitutionIds = [],
  preselectedRoles = [],
  preselectedParentId,
}: MessageComposeProps) {
  const [body, setBody] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage } = useMessageMutations();

  // Focus textarea when reply mode activates
  useEffect(() => {
    if (replyTo) {
      textareaRef.current?.focus();
    }
  }, [replyTo]);

  // Auto-resize textarea
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed || sendMessage.isPending) return;

    const recipientIds = replyTo
      ? [replyTo.sender.id]
      : preselectedRecipientIds;

    const payload: SendMessagePayload = {
      body: trimmed,
      parent_id: replyTo?.id || preselectedParentId,
    };

    if (recipientIds.length > 0) payload.recipient_ids = recipientIds;
    if (preselectedInstitutionIds.length > 0) payload.target_institutions = preselectedInstitutionIds;
    if (preselectedRoles.length > 0) payload.target_roles = preselectedRoles;

    if (!payload.recipient_ids && !payload.target_institutions) return;

    sendMessage.mutate(payload, {
      onSuccess: () => {
        setBody('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
        onSent();
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send (unless Shift is held for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = body.trim().length > 0 && !sendMessage.isPending;

  return (
    <div className="flex flex-col gap-3 px-2 sm:px-4 py-2 sm:py-4 bg-[#f0f2f5] dark:bg-[#111b21] border-t border-gray-200 dark:border-white/5">
      {/* Reply preview - WhatsApp style floating bubble */}
      {replyTo && (
        <div className="flex items-start gap-4 px-4 py-3 bg-white dark:bg-[#1f2c33] rounded-2xl border-l-[6px] border-[#0059E1] shadow-lg animate-in slide-in-from-bottom-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#0059E1] mb-1">
              Cavab: {replyTo.sender.name}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 font-medium">
              {replyTo.body}
            </p>
          </div>
          {onReplyCancel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
              onClick={onReplyCancel}
            >
              <X className="h-5 w-5 text-gray-400" />
              <span className="sr-only">Ləğv et</span>
            </Button>
          )}
        </div>
      )}

      {/* Input Row - Modern Ergo Layout */}
      <div className="flex items-end gap-2.5 relative group">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Mesaj yazın..."
            rows={1}
            className={cn(
              'w-full resize-none min-h-[48px] max-h-[160px] text-[15px] font-medium py-3 px-5',
              'rounded-[1.5rem] border-none bg-white dark:bg-[#2a3942] text-gray-900 dark:text-gray-100 shadow-sm transition-all duration-300',
              'placeholder:text-gray-400 focus-visible:ring-0 focus-visible:shadow-md'
            )}
            disabled={sendMessage.isPending}
          />
        </div>
        
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className={cn(
            'h-12 w-12 flex-shrink-0 rounded-full transition-all duration-300 shadow-lg',
            canSend 
              ? 'bg-[#0059E1] hover:bg-[#004dc4] scale-100 active:scale-90 text-white shadow-blue-500/30' 
              : 'bg-gray-300 dark:bg-white/10 opacity-50 grayscale scale-95'
          )}
        >
          <Send className={cn("h-5 w-5 transition-transform duration-500", canSend && "translate-x-0.5")} />
          <span className="sr-only">Göndər</span>
        </Button>
      </div>

      {sendMessage.isPending && (
        <div className="flex items-center justify-center gap-2 mt-1">
           <div className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0059E1] animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#0059E1] animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#0059E1] animate-bounce" />
           </div>
           <p className="text-[10px] font-black uppercase tracking-widest text-[#0059E1] opacity-70">Mesaj göndərilir...</p>
        </div>
      )}
    </div>
  );
}
