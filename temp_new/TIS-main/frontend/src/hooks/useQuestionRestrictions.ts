/**
 * useQuestionRestrictions Hook
 * Manages question editing restrictions for published surveys
 */

import { useState, useEffect, useCallback } from 'react';
import type { QuestionRestriction } from '@/types/surveyModal';
import type { Survey } from '@/services/surveys';
import { surveyService } from '@/services/surveys';
import { useToast } from '@/hooks/use-toast';

interface UseQuestionRestrictionsReturn {
  restrictions: Record<string, QuestionRestriction>;
  loading: boolean;
  getRestrictions: (questionId?: string) => QuestionRestriction;
  loadRestrictions: (surveyId: number) => Promise<void>;
}

const DEFAULT_RESTRICTIONS: QuestionRestriction = {
  approved_responses_count: 0,
  can_edit_text: true,
  can_edit_type: true,
  can_edit_required: true,
  can_add_options: true,
  can_remove_options: true,
};

const PUBLISHED_DEFAULT_RESTRICTIONS: QuestionRestriction = {
  approved_responses_count: 0,
  can_edit_text: true,
  can_edit_type: false, // Type always disabled for published surveys
  can_edit_required: true,
  can_add_options: true,
  can_remove_options: true,
};

/**
 * Custom hook to manage question restrictions for published surveys
 * @param survey - The survey object (optional)
 * @param canEdit - Whether the current user can edit the survey
 */
export const useQuestionRestrictions = (
  survey?: Survey | null,
  canEdit: boolean = true
): UseQuestionRestrictionsReturn => {
  const { toast } = useToast();
  const [restrictions, setRestrictions] = useState<Record<string, QuestionRestriction>>({});
  const [loading, setLoading] = useState(false);

  /**
   * Load question restrictions from API
   */
  const loadRestrictions = useCallback(async (surveyId: number) => {
    try {
      setLoading(true);
      console.log('🔐 Loading question restrictions for survey:', surveyId);

      const restrictionsData = await surveyService.getQuestionRestrictions(surveyId);
      const questionRestrictions = restrictionsData.question_restrictions || {};

      setRestrictions(questionRestrictions);
      console.log('🔐 Question restrictions loaded:', questionRestrictions);
    } catch (error: any) {
      console.error('Failed to load question restrictions:', error);

      // Specific error handling based on status code
      if (error.response?.status === 403) {
        toast({
          title: "İcazə xətası",
          description: "Bu məlumatları görmək üçün icazəniz yoxdur",
          variant: "destructive",
        });
      } else if (error.response?.status === 404) {
        toast({
          title: "Tapılmadı",
          description: "Sorğu məhdudiyyətləri tapılmadı",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Xəta",
          description: "Sual məhdudiyyətləri yüklənə bilmədi",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Get restrictions for a specific question
   * Returns appropriate defaults based on survey status
   */
  const getRestrictions = useCallback((questionId?: string): QuestionRestriction => {
    // If no question ID provided, return defaults
    if (!questionId) {
      return survey?.status === 'published'
        ? PUBLISHED_DEFAULT_RESTRICTIONS
        : DEFAULT_RESTRICTIONS;
    }

    // If survey is not published, allow all edits
    if (survey?.status !== 'published') {
      return DEFAULT_RESTRICTIONS;
    }

    // If restrictions are loaded for this question, return them
    if (restrictions[questionId]) {
      return restrictions[questionId];
    }

    // Default for published surveys (until restrictions load)
    return PUBLISHED_DEFAULT_RESTRICTIONS;
  }, [survey?.status, restrictions]);

  /**
   * Auto-load restrictions when survey changes
   */
  useEffect(() => {
    if (survey?.status === 'published' && survey.id && canEdit) {
      console.log('🔐 Auto-loading restrictions for published survey:', survey.id);
      loadRestrictions(survey.id);
    } else {
      // Clear restrictions if not published or not editable
      setRestrictions({});
    }
  }, [survey?.id, survey?.status, canEdit, loadRestrictions]);

  return {
    restrictions,
    loading,
    getRestrictions,
    loadRestrictions,
  };
};
