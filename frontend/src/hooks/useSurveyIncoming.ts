import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { surveyService } from '@/services/surveys';

export interface SurveyIncomingItem {
  id:              string;
  surveyId:        number;
  responseId?:     number;
  title:           string;
  description?:    string;
  status:          'new' | 'draft' | 'submitted' | 'approved' | 'rejected' | 'completed' | 'in_progress';
  deadline?:       string;
  lastUpdated?:    string;
  isAnonymous?:    boolean;
  questionsCount?: number;
}

interface UseSurveyIncomingResult {
  items:         SurveyIncomingItem[];
  counts: {
    pending:   number;
    draft:     number;
    submitted: number;
  };
  isLoading:     boolean;
  refetch:       () => void;
}

export function useSurveyIncoming(): UseSurveyIncomingResult {
  const { data: assigned = [], isLoading: loadingAssigned, refetch: refetchAssigned } = useQuery({
    queryKey: ['survey-incoming-assigned'],
    queryFn: async () => {
      const res = await surveyService.getAssignedSurveys();
      return (res as any)?.data?.data ?? (res as any)?.data ?? res ?? [];
    },
  });

  const { data: responses = [], isLoading: loadingResponses, refetch: refetchResponses } = useQuery({
    queryKey: ['survey-incoming-responses'],
    queryFn: async () => {
      const res = await surveyService.getMyResponses();
      if (Array.isArray(res)) return res;
      const payload = (res as any)?.data;
      return payload?.data ?? payload ?? [];
    },
  });

  const items = useMemo<SurveyIncomingItem[]>(() => {
    const list: SurveyIncomingItem[] = [];
    const responseMap = new Map<number, any>();

    (Array.isArray(responses) ? responses : []).forEach((r: any) => {
      responseMap.set(r.survey_id ?? r.survey?.id, r);
    });

    (Array.isArray(assigned) ? assigned : []).forEach((s: any) => {
      const resp = responseMap.get(s.id);
      if (resp) {
        list.push({
          id:             `resp-${resp.id}`,
          surveyId:       s.id,
          responseId:     resp.id,
          title:          s.title,
          description:    s.description,
          status:         resp.status,
          deadline:       s.end_date ?? s.expires_at,
          lastUpdated:    resp.updated_at ?? resp.last_saved_at,
          isAnonymous:    s.is_anonymous,
          questionsCount: s.questions_count,
        });
        responseMap.delete(s.id);
      } else {
        list.push({
          id:             `surv-${s.id}`,
          surveyId:       s.id,
          title:          s.title,
          description:    s.description,
          status:         'new',
          deadline:       s.end_date ?? s.expires_at,
          isAnonymous:    s.is_anonymous,
          questionsCount: s.questions_count,
        });
      }
    });

    responseMap.forEach((resp, surveyId) => {
      list.push({
        id:             `resp-${resp.id}`,
        surveyId,
        responseId:     resp.id,
        title:          resp.survey?.title ?? `Sorğu #${surveyId}`,
        description:    resp.survey?.description,
        status:         resp.status,
        deadline:       resp.survey?.end_date,
        lastUpdated:    resp.updated_at,
        isAnonymous:    resp.survey?.is_anonymous ?? false,
        questionsCount: resp.survey?.questions_count,
      });
    });

    return list;
  }, [assigned, responses]);

  const counts = useMemo(() => ({
    pending:   items.filter((i) => ['new', 'draft', 'in_progress'].includes(i.status)).length,
    draft:     items.filter((i) => i.status === 'draft').length,
    submitted: items.filter((i) => ['submitted', 'approved', 'rejected', 'completed'].includes(i.status)).length,
  }), [items]);

  return {
    items,
    counts,
    isLoading: loadingAssigned || loadingResponses,
    refetch: () => { refetchAssigned(); refetchResponses(); },
  };
}
