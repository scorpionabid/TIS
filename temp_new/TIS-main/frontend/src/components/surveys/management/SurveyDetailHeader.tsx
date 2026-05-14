import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Play, 
  Pause, 
  Edit, 
  Download, 
  Copy, 
  RotateCcw, 
  Archive, 
  Trash2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Survey } from '@/services/surveys';

interface SurveyDetailHeaderProps {
  selectedSurvey: Survey;
  readonly: boolean;
  isOwner: boolean;
  publishMut: any;
  pauseMut: any;
  resumeMut: any;
  handleEditSurvey: () => void;
  handleResumeSurvey: () => void;
  handleExportXlsx: () => void;
  handleSaveAsTemplate: () => void;
  handleRestoreSurvey: () => void;
  handleArchiveSurvey: () => void;
  handleDeleteSurvey: () => void;
  isDuplicating: boolean;
  isRestoring: boolean;
  isArchiving: boolean;
  isDeleting: boolean;
  surveyStatusBadge: Record<string, { label: string; cls: string }>;
}

export const SurveyDetailHeader: React.FC<SurveyDetailHeaderProps> = ({
  selectedSurvey,
  readonly,
  isOwner,
  publishMut,
  pauseMut,
  resumeMut,
  handleEditSurvey,
  handleResumeSurvey,
  handleExportXlsx,
  handleSaveAsTemplate,
  handleRestoreSurvey,
  handleArchiveSurvey,
  handleDeleteSurvey,
  isDuplicating,
  isRestoring,
  isArchiving,
  isDeleting,
  surveyStatusBadge,
}) => {
  const st = surveyStatusBadge[selectedSurvey.status] ?? { label: selectedSurvey.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };

  return (
    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 bg-[hsl(220_85%_95%)] rounded-md flex items-center justify-center shrink-0">
          <BarChart3 className="h-5 w-5 text-[hsl(220_85%_25%)]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 truncate">{selectedSurvey.title}</h2>
          <div className="flex items-center gap-3 mt-0.5">
            <Badge variant="outline" className={cn('text-xs border px-1.5 py-0', st.cls)}>
              {st.label}
            </Badge>
            <span className="text-xs text-slate-400">
              {(() => {
                const targetCount = Array.isArray(selectedSurvey.target_institutions) ? selectedSurvey.target_institutions.length : 0;
                const percentage = targetCount > 0 ? Math.round(((selectedSurvey.response_count ?? 0) / targetCount) * 100) : 0;
                return `${selectedSurvey.response_count ?? 0} cavab · ${percentage}% doldurulma · ${selectedSurvey.questions_count ?? 0} sual`;
              })()}
            </span>
          </div>
        </div>
      </div>
      {(!readonly || isOwner) && (
        <div className="flex items-center gap-2 shrink-0">
          {/* Status düymələri — yalnız tam icazəli istifadəçilər üçün */}
          {!readonly && (selectedSurvey.status === 'draft') && (
            <Button size="sm"
              className="h-8 gap-1.5 bg-[hsl(220_85%_25%)] hover:bg-[hsl(220_85%_30%)] text-white text-sm"
              onClick={() => publishMut.mutate(selectedSurvey.id)}
              disabled={publishMut.isPending}
            >
              <Play className="h-3.5 w-3.5" /> Yayımla
            </Button>
          )}
          {!readonly && (selectedSurvey.status === 'active' || selectedSurvey.status === 'published') && (
            <Button variant="outline" size="sm"
              className="h-8 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 text-sm"
              onClick={() => pauseMut.mutate(selectedSurvey.id)}
              disabled={pauseMut.isPending}
            >
              <Pause className="h-3.5 w-3.5" /> Dayandır
            </Button>
          )}
          {!readonly && selectedSurvey.status === 'paused' && (
            <Button size="sm"
              className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
              onClick={handleResumeSurvey}
              disabled={resumeMut.isPending}
            >
              <Play className="h-3.5 w-3.5" /> {resumeMut.isPending ? '...' : 'Davam et'}
            </Button>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm"
              className="h-8 gap-1.5 text-sm border-slate-300 hover:bg-blue-50 hover:text-blue-700"
              onClick={handleEditSurvey}
            >
              <Edit className="h-3.5 w-3.5" /> Redaktə
            </Button>

            <Button variant="outline" size="sm"
              className="h-8 gap-1.5 text-sm border-slate-300 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={handleExportXlsx}
            >
              <Download className="h-3.5 w-3.5" /> Eksport
            </Button>

            <Button variant="outline" size="sm"
              className="h-8 gap-1.5 text-sm border-slate-300 hover:bg-indigo-50 hover:text-indigo-700"
              onClick={handleSaveAsTemplate}
              disabled={isDuplicating}
            >
              <Copy className="h-3.5 w-3.5" /> {isDuplicating ? '...' : 'Şablon'}
            </Button>

            {selectedSurvey.status === 'archived' ? (
              <Button variant="outline" size="sm"
                className="h-8 gap-1.5 text-sm border-slate-300 hover:bg-green-50 hover:text-green-700"
                onClick={handleRestoreSurvey}
                disabled={isRestoring}
              >
                <RotateCcw className="h-3.5 w-3.5" /> {isRestoring ? '...' : 'Bərpa et'}
              </Button>
            ) : (
              <Button variant="outline" size="sm"
                className="h-8 gap-1.5 text-sm border-slate-300 hover:bg-amber-50 hover:text-amber-700"
                onClick={handleArchiveSurvey}
                disabled={isArchiving}
              >
                <Archive className="h-3.5 w-3.5" /> {isArchiving ? '...' : 'Arxiv'}
              </Button>
            )}

            <Button variant="outline" size="sm"
              className="h-8 gap-1.5 text-sm border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleDeleteSurvey}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" /> {isDeleting ? '...' : selectedSurvey.status === 'archived' ? 'Tam sil' : 'Sil'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
