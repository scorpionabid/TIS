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
    <div className="flex flex-col gap-2">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-start gap-2 px-3 py-2 bg-muted/60 rounded-md border-l-2 border-primary">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">
              Cavab: {replyTo.sender.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyTo.body}
            </p>
          </div>
          {onReplyCancel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 flex-shrink-0"
              onClick={onReplyCancel}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Ləğv et</span>
            </Button>
          )}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 relative group">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Mesaj yazın... (Göndərmək üçün Enter)"
          rows={1}
          className={cn(
            'flex-1 resize-none min-h-[44px] max-h-[160px] text-sm py-3 px-4',
            'rounded-2xl border-input/40 bg-muted/40 transition-all duration-200',
            'focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/50 focus-visible:shadow-[0_0_15px_rgba(var(--primary),0.05)]'
          )}
          disabled={sendMessage.isPending}
        />
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className={cn(
            'h-11 w-11 flex-shrink-0 rounded-full transition-all duration-200',
            canSend ? 'bg-primary hover:bg-primary/90 hover:scale-105 shadow-sm' : 'opacity-50'
          )}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Göndər</span>
        </Button>
      </div>

      {sendMessage.isPending && (
        <p className="text-xs text-muted-foreground text-right mr-12 animate-pulse">Göndərilir...</p>
      )}
    </div>
  );
}
