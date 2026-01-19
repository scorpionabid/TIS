import { useState, useCallback } from 'react';
import { Task, UserAssignmentSummary } from '@/services/tasks';
import { useToast } from '@/hooks/use-toast';

type DialogContext = { task: Task; assignment: UserAssignmentSummary } | null;

export const COMPLETION_TYPES = [
  { value: 'report_submitted', label: 'Hesabat göndərildi' },
  { value: 'data_updated', label: 'Məlumatlar yeniləndi' },
  { value: 'onsite_visit', label: 'Yerində yoxlanıldı' },
  { value: 'other', label: 'Digər' },
] as const;

export const DEFAULT_COMPLETION_TYPE = COMPLETION_TYPES[0].value;

export function useAssignmentDialogs() {
  const { toast } = useToast();

  // Decision (cancellation) dialog
  const [decisionContext, setDecisionContext] = useState<DialogContext>(null);
  const [decisionReason, setDecisionReason] = useState('');

  // Completion dialog
  const [completionContext, setCompletionContext] = useState<DialogContext>(null);
  const [completionType, setCompletionType] = useState<string>(DEFAULT_COMPLETION_TYPE);
  const [completionNotes, setCompletionNotes] = useState('');

  // Delegation dialog
  const [delegationContext, setDelegationContext] = useState<DialogContext>(null);

  // Decision dialog handlers
  const openDecisionDialog = useCallback((task: Task, assignment: UserAssignmentSummary) => {
    setDecisionContext({ task, assignment });
    setDecisionReason('');
  }, []);

  const closeDecisionDialog = useCallback(() => {
    setDecisionContext(null);
    setDecisionReason('');
  }, []);

  // Completion dialog handlers
  const openCompletionDialog = useCallback((task: Task, assignment: UserAssignmentSummary) => {
    setCompletionContext({ task, assignment });
    setCompletionType(DEFAULT_COMPLETION_TYPE);
    setCompletionNotes('');
  }, []);

  const closeCompletionDialog = useCallback(() => {
    setCompletionContext(null);
    setCompletionType(DEFAULT_COMPLETION_TYPE);
    setCompletionNotes('');
  }, []);

  // Delegation dialog handlers
  const openDelegationDialog = useCallback((task: Task, assignment: UserAssignmentSummary) => {
    if (assignment.status !== 'pending' && assignment.status !== 'accepted') {
      toast({
        title: 'Yönləndirmə mümkün deyil',
        description: 'Yalnız pending və ya accepted statusunda olan tapşırıqları yönləndirə bilərsiniz.',
        variant: 'destructive',
      });
      return;
    }
    setDelegationContext({ task, assignment });
  }, [toast]);

  const closeDelegationDialog = useCallback(() => {
    setDelegationContext(null);
  }, []);

  // Validation
  const isDecisionValid = decisionReason.trim().length >= 5;
  const isCompletionValid = Boolean(completionType);

  return {
    // Decision dialog
    decisionContext,
    decisionReason,
    setDecisionReason,
    openDecisionDialog,
    closeDecisionDialog,
    isDecisionValid,
    // Completion dialog
    completionContext,
    completionType,
    setCompletionType,
    completionNotes,
    setCompletionNotes,
    openCompletionDialog,
    closeCompletionDialog,
    isCompletionValid,
    // Delegation dialog
    delegationContext,
    openDelegationDialog,
    closeDelegationDialog,
  };
}
