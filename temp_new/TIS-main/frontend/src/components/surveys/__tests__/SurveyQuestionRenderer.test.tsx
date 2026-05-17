import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SurveyQuestionRenderer } from '../questions/SurveyQuestionRenderer';

describe('SurveyQuestionRenderer', () => {
  it('Mətn sualı input render edir', () => {
    const question = { id: 1, type: 'text', title: 'Test Question' } as any;
    render(<SurveyQuestionRenderer question={question} value="" onChange={() => {}} />);
    expect(screen.getByTestId('question-text-1')).toBeInTheDocument();
  });

  it('Seçim sualı (single) radio button render edir', () => {
    const question = { id: 2, type: 'single_choice', title: 'Test UI', options: ['A', 'B'] } as any;
    render(<SurveyQuestionRenderer question={question} value="" onChange={() => {}} />);
    expect(screen.getByTestId('question-radio-2-0')).toBeInTheDocument();
    expect(screen.getByTestId('question-radio-2-1')).toBeInTheDocument();
  });

  it('Çoxlu seçim sualı checkbox render edir', () => {
    const question = { id: 3, type: 'multiple_choice', title: 'Test UI', options: ['X', 'Y'] } as any;
    render(<SurveyQuestionRenderer question={question} value={[]} onChange={() => {}} />);
    expect(screen.getByTestId('question-checkbox-3-0')).toBeInTheDocument();
    expect(screen.getByTestId('question-checkbox-3-1')).toBeInTheDocument();
  });

  it('Cavab dəyişdikdə onChange çağırılır', async () => {
    const onChangeMock = vi.fn();
    const question = { id: 4, type: 'text', title: 'Test Input', metadata: { display_mode: 'single-line' } } as any;
    
    render(<SurveyQuestionRenderer question={question} value="" onChange={onChangeMock} />);
    const input = screen.getByTestId('question-text-4');
    
    await userEvent.type(input, 'A');
    expect(onChangeMock).toHaveBeenCalled();
  });
});
