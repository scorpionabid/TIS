import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles } from 'lucide-react';
import type { ClarificationAnswers, ClarificationQuestion } from '@/types/aiAnalysis';

// ─── Props ────────────────────────────────────────────────────

interface ClarificationDialogProps {
  open: boolean;
  questions: ClarificationQuestion[];
  onSubmit: (answers: ClarificationAnswers) => void;
  onSkip: () => void;
  isLoading: boolean;
}

// ─── Internal state helpers ───────────────────────────────────

type AnswerMap = Record<string, string | string[]>;

function initAnswers(questions: ClarificationQuestion[]): AnswerMap {
  const map: AnswerMap = {};
  for (const q of questions) {
    if (q.type === 'multi') {
      map[q.id] = [];
    } else {
      map[q.id] = '';
    }
  }
  return map;
}

function hasAtLeastOneAnswer(answers: AnswerMap): boolean {
  return Object.values(answers).some((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return v.trim().length > 0;
  });
}

// ─── Question renderers ───────────────────────────────────────

interface SingleQuestionProps {
  question: ClarificationQuestion;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

const SingleQuestion: React.FC<SingleQuestionProps> = ({
  question,
  value,
  onChange,
  disabled,
}) => (
  <RadioGroup
    value={value}
    onValueChange={onChange}
    disabled={disabled}
    className="gap-2"
  >
    {question.options.map((opt) => (
      <div key={opt} className="flex items-center gap-2">
        <RadioGroupItem value={opt} id={`${question.id}-${opt}`} />
        <Label
          htmlFor={`${question.id}-${opt}`}
          className="font-normal cursor-pointer"
        >
          {opt}
        </Label>
      </div>
    ))}
  </RadioGroup>
);

interface MultiQuestionProps {
  question: ClarificationQuestion;
  values: string[];
  onChange: (values: string[]) => void;
  disabled: boolean;
}

const MultiQuestion: React.FC<MultiQuestionProps> = ({
  question,
  values,
  onChange,
  disabled,
}) => {
  const toggle = (opt: string, checked: boolean): void => {
    if (checked) {
      onChange([...values, opt]);
    } else {
      onChange(values.filter((v) => v !== opt));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {question.options.map((opt) => (
        <div key={opt} className="flex items-center gap-2">
          <Checkbox
            id={`${question.id}-${opt}`}
            checked={values.includes(opt)}
            onCheckedChange={(checked) => toggle(opt, checked === true)}
            disabled={disabled}
          />
          <Label
            htmlFor={`${question.id}-${opt}`}
            className="font-normal cursor-pointer"
          >
            {opt}
          </Label>
        </div>
      ))}
    </div>
  );
};

interface TextQuestionProps {
  question: ClarificationQuestion;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

const TextQuestion: React.FC<TextQuestionProps> = ({
  question,
  value,
  onChange,
  disabled,
}) => (
  <Input
    id={`input-${question.id}`}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder="Cavabınızı yazın..."
    disabled={disabled}
    className="text-sm"
  />
);

// ─── Question Block ────────────────────────────────────────────

interface QuestionBlockProps {
  question: ClarificationQuestion;
  answers: AnswerMap;
  onChangeAnswer: (id: string, value: string | string[]) => void;
  disabled: boolean;
  index: number;
}

const QuestionBlock: React.FC<QuestionBlockProps> = ({
  question,
  answers,
  onChangeAnswer,
  disabled,
  index,
}) => {
  const rawValue = answers[question.id];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">
        <span className="text-muted-foreground mr-1">{index + 1}.</span>
        {question.question}
      </p>

      {question.type === 'single' && (
        <SingleQuestion
          question={question}
          value={typeof rawValue === 'string' ? rawValue : ''}
          onChange={(v) => onChangeAnswer(question.id, v)}
          disabled={disabled}
        />
      )}

      {question.type === 'multi' && (
        <MultiQuestion
          question={question}
          values={Array.isArray(rawValue) ? rawValue : []}
          onChange={(v) => onChangeAnswer(question.id, v)}
          disabled={disabled}
        />
      )}

      {question.type === 'text' && (
        <TextQuestion
          question={question}
          value={typeof rawValue === 'string' ? rawValue : ''}
          onChange={(v) => onChangeAnswer(question.id, v)}
          disabled={disabled}
        />
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────

const ClarificationDialog: React.FC<ClarificationDialogProps> = ({
  open,
  questions,
  onSubmit,
  onSkip,
  isLoading,
}) => {
  const [answers, setAnswers] = useState<AnswerMap>(() => initAnswers(questions));

  // Re-initialize when questions change (new dialog open)
  const prevQuestionsRef = useState<ClarificationQuestion[]>(questions);
  if (prevQuestionsRef[0] !== questions) {
    prevQuestionsRef[1](questions);
    setAnswers(initAnswers(questions));
  }

  const handleChangeAnswer = (id: string, value: string | string[]): void => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (): void => {
    if (!hasAtLeastOneAnswer(answers)) return;
    onSubmit(answers as ClarificationAnswers);
  };

  const canSubmit = hasAtLeastOneAnswer(answers) && !isLoading;

  return (
    <Dialog open={open} onOpenChange={() => !isLoading && onSkip()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle>Sorğunuzu dəqiqləşdirin</DialogTitle>
          </div>
          <DialogDescription>
            Daha dəqiq nəticə üçün aşağıdakı sualları cavablandırın. İstəsəniz sualları keçib
            birbaşa sorğu göndərə bilərsiniz.
          </DialogDescription>
        </DialogHeader>

        {/* Questions */}
        <div className="flex flex-col gap-5 py-2">
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Dəqiqləşdirici sual tapılmadı.
            </p>
          ) : (
            questions.map((q, i) => (
              <div key={q.id} className="flex flex-col gap-2">
                <QuestionBlock
                  question={q}
                  answers={answers}
                  onChangeAnswer={handleChangeAnswer}
                  disabled={isLoading}
                  index={i}
                />
                {i < questions.length - 1 && (
                  <hr className="border-border mt-2" />
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Keç
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full sm:w-auto gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Emal edilir...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Davam et
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClarificationDialog;
