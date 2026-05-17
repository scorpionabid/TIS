import React from 'react';
import { 
  ClipboardList, 
  Eye, 
  Users, 
  BarChart3, 
  RefreshCw 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Survey } from '@/services/surveys';
import { SurveyDetailHeader } from './SurveyDetailHeader';
import { SurveyResponseForm } from '../SurveyResponseForm';
import { SurveyResultsAnalytics } from '../results/SurveyResultsAnalytics';
import { SurveyViewDashboard } from '../results/SurveyViewDashboard';
import { SurveyInfoTab } from './SurveyInfoTab';

interface DashboardContentProps {
  selectedSurvey: Survey | null;
  readonly: boolean;
  publishMut: any;
  pauseMut: any;
  resumeMut: any;
  handleEditSurvey: () => void;
  handleExportXlsx: () => void;
  handleSaveAsTemplate: () => void;
  handleRestoreSurvey: () => void;
  handleArchiveSurvey: () => void;
  handleDeleteSurvey: () => void;
  isDuplicating: boolean;
  isRestoring: boolean;
  isArchiving: boolean;
  isDeleting: boolean;
  activeSubTab: 'preview' | 'monitoring' | 'reports' | 'info';
  setActiveSubTab: (tab: 'preview' | 'monitoring' | 'reports' | 'info') => void;
  loadingFull: boolean;
  surveyStatusBadge: Record<string, { label: string; cls: string }>;
  currentUserId?: number;
  roleRaw: string;
  regionOperatorPermissions?: Record<string, boolean>;
  mgmtListCount: number;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({
  selectedSurvey,
  readonly,
  publishMut,
  pauseMut,
  resumeMut,
  handleEditSurvey,
  handleExportXlsx,
  handleSaveAsTemplate,
  handleRestoreSurvey,
  handleArchiveSurvey,
  handleDeleteSurvey,
  isDuplicating,
  isRestoring,
  isArchiving,
  isDeleting,
  activeSubTab,
  setActiveSubTab,
  loadingFull,
  surveyStatusBadge,
  currentUserId,
  roleRaw,
  regionOperatorPermissions,
  mgmtListCount,
}) => {
  if (!selectedSurvey) {
    return (
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col items-center justify-center text-center p-12">
        <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
          <ClipboardList className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-700">Sorğu seçilməyib</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-xs">
          {mgmtListCount === 0 
            ? 'Hələ sorğu yaratmamısınız. "YENİ SORĞU" düyməsindən başlayın.' 
            : 'Sol siyahıdan bir sorğu seçin.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col min-h-0">
      <SurveyDetailHeader
        selectedSurvey={selectedSurvey}
        readonly={readonly}
        publishMut={publishMut}
        pauseMut={pauseMut}
        resumeMut={resumeMut}
        handleEditSurvey={handleEditSurvey}
        handleExportXlsx={handleExportXlsx}
        handleSaveAsTemplate={handleSaveAsTemplate}
        handleRestoreSurvey={handleRestoreSurvey}
        handleArchiveSurvey={handleArchiveSurvey}
        handleDeleteSurvey={handleDeleteSurvey}
        isDuplicating={isDuplicating}
        isRestoring={isRestoring}
        isArchiving={isArchiving}
        isDeleting={isDeleting}
        surveyStatusBadge={surveyStatusBadge}
        currentUserId={currentUserId}
        currentUserRole={roleRaw}
        regionOperatorPermissions={regionOperatorPermissions}
      />

      {/* Tabs Navigation */}
      <div className="px-6 border-b border-slate-100 shrink-0">
        <div className="flex gap-6 h-11">
          {[
            { value: 'preview',    label: 'Baxış',      Icon: Eye },
            { value: 'monitoring', label: 'Monitorinq', Icon: Users },
            { value: 'reports',    label: 'Hesabat',    Icon: BarChart3 },
            { value: 'info',       label: 'Məlumatlar', Icon: ClipboardList },
          ].map(({ value, label, Icon }) => (
            <button 
              key={value} 
              onClick={() => setActiveSubTab(value as any)} 
              className={cn(
                "flex items-center rounded-none border-b-2 bg-transparent text-slate-500 font-medium text-sm px-0 pb-0 transition-all", 
                activeSubTab === value 
                  ? "border-[hsl(220_85%_25%)] text-[hsl(220_85%_25%)]" 
                  : "border-transparent hover:text-slate-700"
              )}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto relative bg-white">
        {loadingFull && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
            <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
          </div>
        )}
        
        {activeSubTab === 'preview' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto bg-slate-50/50 rounded-2xl border border-slate-100 p-8 shadow-inner">
              <SurveyResponseForm surveyId={selectedSurvey.id} readonly={true} />
            </div>
          </div>
        )}
        
        {activeSubTab === 'monitoring' && (
          <div className="h-full">
            <SurveyResultsAnalytics 
              key={`mon-${selectedSurvey.id}`} 
              forceSurveyId={selectedSurvey.id} 
              initialData={selectedSurvey} 
              isCompact 
              headerActions={null} 
              initialTab="monitoring" 
            />
          </div>
        )}
        
        {activeSubTab === 'reports' && (
          <div className="h-full">
            <SurveyViewDashboard 
              key={`view-${selectedSurvey.id}`} 
              forceSurveyId={selectedSurvey.id} 
              initialData={selectedSurvey as any} 
              isCompact 
              headerActions={null} 
            />
          </div>
        )}
        
        {activeSubTab === 'info' && (
          <SurveyInfoTab selectedSurvey={selectedSurvey} />
        )}
      </div>
    </div>
  );
};
