import React from 'react';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Hooks & Components
import { useSubjectVacancies, CLASS_LEVELS, TabType } from './hooks/useSubjectVacancies';
import { SubjectVacanciesHeader } from './components/SubjectVacanciesHeader';
import { SubjectVacanciesTable } from './components/SubjectVacanciesTable';
import { SubjectVacanciesStatsTable } from './components/SubjectVacanciesStatsTable';

const CAT_INFO: Record<string, { label: string }> = {
  umumi: { label: 'Ümumi' },
  ferdi: { label: 'Fərdi' },
  evde: { label: 'Evdə' },
  xususi: { label: 'Xüsusi' },
  statistika: { label: 'Statistika' }
};

interface FennlerVakantlarProps {
  institutionId?: number;
  academicYearId?: number;
  masterPlan?: any[];
  assignedHours?: any[];
  isLocked?: boolean;
}

export default function FennlerVakantlar(props: FennlerVakantlarProps) {
  const {
    activeTab,
    setActiveTab,
    currentEducationType,
    rows,
    getFilteredRows,
    specialtyRows,
    displayStats,
    isSaving,
    lastSaved,
    allSubjects,
    isLoading,
    handleAddSubject,
    handleCellChange,
    handleDeleteRow,
    getRowSum
  } = useSubjectVacancies(props);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Məlumatlar yüklənir...</p>
      </div>
    );
  }

  const activeLevels = currentEducationType === 'umumi' ? CLASS_LEVELS : CLASS_LEVELS.filter(lvl => lvl !== 'MH');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <SubjectVacanciesHeader 
        displayStats={displayStats}
        isSaving={isSaving}
        lastSaved={lastSaved}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
        <TabsList className="bg-slate-100/80 p-1 rounded-2xl w-full sm:w-auto h-auto flex flex-wrap gap-1">
          {Object.entries(CAT_INFO).map(([key, info]) => (
            <TabsTrigger 
              key={key} 
              value={key}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm",
                key === 'umumi' ? "data-[state=active]:text-blue-600" :
                key === 'ferdi' ? "data-[state=active]:text-purple-600" :
                key === 'evde' ? "data-[state=active]:text-orange-600" :
                key === 'statistika' ? "data-[state=active]:text-slate-800 bg-slate-200/50" :
                "data-[state=active]:text-green-600"
              )}
            >
              {info.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {activeTab !== 'statistika' ? (
          <TabsContent value={activeTab} className="mt-6">
            <SubjectVacanciesTable 
              rows={getFilteredRows}
              allSubjects={allSubjects}
              activeLevels={activeLevels}
              currentEducationType={currentEducationType}
              isLocked={props.isLocked || false}
              onCellChange={handleCellChange}
              onDeleteRow={handleDeleteRow}
              onAddSubject={handleAddSubject}
              specialtyRows={specialtyRows}
              getRowSum={getRowSum}
              totalStats={{ totalSelected: displayStats.totalSelected, vacancy: displayStats.vacancy }}
            />
          </TabsContent>
        ) : (
          <TabsContent value="statistika" className="mt-6">
            <SubjectVacanciesStatsTable 
              rows={rows}
              grandStats={displayStats}
              getRowSum={getRowSum}
            />
          </TabsContent>
        )}
      </Tabs>
    </motion.div>
  );
}
