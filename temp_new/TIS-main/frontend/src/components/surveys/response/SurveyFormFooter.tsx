import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Send, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SurveyFormFooterProps {
  isReadOnly: boolean;
  isSubmitted: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  onSave: () => void;
  onSubmit: () => void;
  isSaving: boolean;
}

export const SurveyFormFooter: React.FC<SurveyFormFooterProps> = ({
  isReadOnly,
  isSubmitted,
  hasUnsavedChanges,
  lastSaved,
  onSave,
  onSubmit,
  isSaving
}) => {
  if (isReadOnly || isSubmitted) return null;

  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
      <div className="flex items-center gap-2 text-sm">
        {hasUnsavedChanges ? (
          <span className="flex items-center gap-1.5 text-amber-600 font-medium animate-pulse">
            <AlertCircle className="h-4 w-4" /> Saxlanılmamış dəyişikliklər var
          </span>
        ) : lastSaved ? (
          <span className="flex items-center gap-1.5 text-slate-400">
            <Clock className="h-4 w-4" /> Son saxlanma: {lastSaved.toLocaleTimeString('az-AZ')}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <Button 
          variant="outline" 
          onClick={onSave} 
          disabled={isSaving || !hasUnsavedChanges}
          className="flex-1 sm:flex-none border-slate-200 hover:bg-white"
        >
          <Save className="h-4 w-4 mr-2" /> 
          {isSaving ? 'Saxlanılır...' : 'Qaralama kimi saxla'}
        </Button>
        <Button 
          onClick={onSubmit} 
          disabled={isSaving}
          className="flex-1 sm:flex-none bg-[hsl(220_85%_25%)] hover:bg-[hsl(220_85%_30%)]"
        >
          <Send className="h-4 w-4 mr-2" /> Təqdim et
        </Button>
      </div>
    </div>
  );
};
