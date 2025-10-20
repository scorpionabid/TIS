import { SurveyQuestion } from '@/services/surveys';
import { cn } from '@/lib/utils';
import { TextQuestionInput } from './TextQuestionInput';
import { NumberQuestionInput } from './NumberQuestionInput';
import { SingleChoiceQuestionInput } from './SingleChoiceQuestionInput';
import { MultipleChoiceQuestionInput } from './MultipleChoiceQuestionInput';
import { RatingQuestionInput } from './RatingQuestionInput';
import { DateQuestionInput } from './DateQuestionInput';
import { FileUploadQuestionInput } from './FileUploadQuestionInput';
import { TableMatrixQuestion } from './TableMatrixQuestion';

interface SurveyQuestionRendererProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  error?: string;
}

export function SurveyQuestionRenderer({
  question,
  value,
  onChange,
  disabled = false,
  error,
}: SurveyQuestionRendererProps) {
  const commonProps = { question, value, onChange, disabled };

  const renderQuestion = () => {
    switch (question.type) {
      case 'text':
        return <TextQuestionInput {...commonProps} />;
      case 'number':
        return <NumberQuestionInput {...commonProps} />;
      case 'single_choice':
        return <SingleChoiceQuestionInput {...commonProps} />;
      case 'multiple_choice':
        return <MultipleChoiceQuestionInput {...commonProps} />;
      case 'rating':
        return <RatingQuestionInput {...commonProps} />;
      case 'date':
        return <DateQuestionInput {...commonProps} />;
      case 'file_upload':
        return <FileUploadQuestionInput {...commonProps} />;
      case 'table_matrix':
        return <TableMatrixQuestion {...commonProps} />;
      default:
        return <TextQuestionInput {...commonProps} />;
    }
  };

  return (
    <div className="space-y-2">
      {renderQuestion()}
      {error && (
        <p className={cn('text-sm text-red-600')}>
          {error}
        </p>
      )}
    </div>
  );
}
