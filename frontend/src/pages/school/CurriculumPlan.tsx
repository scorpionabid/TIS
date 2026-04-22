import React, { useState, useCallback } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { Loader2, Info, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCurriculumPlanData } from '@/hooks/useCurriculumPlanData';
import { useCurriculumExport } from '@/hooks/useCurriculumExport';
import { CurriculumPageHeader } from '@/components/curriculum/CurriculumPageHeader';
import { CurriculumYigimTab } from '@/components/curriculum/CurriculumYigimTab';
import { CurriculumWorkloadTab } from '@/components/curriculum/CurriculumWorkloadTab';
import { TeacherWorkloadDrawer } from '@/components/curriculum/TeacherWorkloadDrawer';
import { CurriculumSummaryTiles } from '@/components/curriculum/CurriculumSummaryTiles';
import { CurriculumYigimTable } from '@/components/curriculum/CurriculumYigimTable';
import { CurriculumInstructionTab } from '@/components/curriculum/CurriculumInstructionTab';
import { GradeManager } from '@/components/grades/GradeManager';
import { curriculumGradeEntityConfig } from '@/components/grades/configurations/gradeConfig';
import { TeacherWorkloadDetailTable } from '@/components/teachers/TeacherWorkloadDetailTable';
import FennlerVakantlar from './FennlerVakantlar';
import { SchoolTeacher } from '@/services/schoolAdmin';

// ─── Animation Variants ────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1, duration: 0.4 } },
};

type TabKey = 'stats' | 'yigim' | 'subjects' | 'workload' | 'class_subject' | 'grades' | 'instructions';

export default function CurriculumPlan() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabKey) ?? 'stats';
  const setActiveTab = useCallback((tab: TabKey) => setSearchParams({ tab }), [setSearchParams]);

  const { institutionId: urlId } = useParams();
  const institutionId = urlId ? parseInt(urlId) : currentUser?.institution?.id;

  // Drawer state (local — belongs to this page, not the hook)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTeacher, setDrawerTeacher] = useState<SchoolTeacher | null>(null);

  // ─── Data ──────────────────────────────────────────────────────────────────
  const plan = useCurriculumPlanData(institutionId);

  const {
    activeYear, academicYearId, approval, deadline,
    isSchoolAdmin, isSektorAdmin, isRegionAdmin, userRole,
    isLocked, isSaving, isProcessingApproval,
    handleWorkflowAction, handleUpdateGrade,
    teachers, loadingTeachers,
    reactiveGrades, loadingGrades, activeLevels, levelTotals, grandTotal,
    mpStats, vacantStats, vacantTotal, categoryLimits,
    masterPlan, assignedHours,
  } = plan;

  // ─── Export ────────────────────────────────────────────────────────────────
  const { handleExportYigim, handleExportWorkload, handleGlobalExport } = useCurriculumExport({
    currentUser,
    activeYear,
    teachers,
    reactiveGrades,
    activeLevels,
    levelTotals,
    grandTotal,
    masterPlan,
    assignedHours,
    institutionId,
    academicYearId,
  });

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (loadingGrades && reactiveGrades.length === 0) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen font-sans">
      <AnimatePresence mode="wait">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-[1600px] mx-auto space-y-6"
        >
          {/* Return Comment Alert */}
          {approval.status === 'returned' && approval.return_comment && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Alert className="bg-amber-50 border-amber-200 text-amber-900 rounded-2xl p-4 shadow-sm mb-6">
                <Info className="h-5 w-5 text-amber-600" />
                <AlertTitle className="text-sm font-black uppercase tracking-tighter mb-1">Düzəliş tələb olunur</AlertTitle>
                <AlertDescription className="text-sm font-medium">
                  Plan sektor tərəfindən geri qaytarılıb. Səbəb:{' '}
                  <span className="font-bold underline decoration-amber-300 decoration-2">
                    {approval.return_comment as string}
                  </span>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Deadline Warning */}
          {isSchoolAdmin && deadline && (approval.status === 'draft' || approval.status === 'returned') &&
            new Date(deadline).getTime() - Date.now() > 0 &&
            new Date(deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Alert className="bg-rose-50 border-rose-200 text-rose-900 rounded-2xl p-4 shadow-sm border-2 animate-pulse mb-6">
                <Clock className="h-5 w-5 text-rose-600" />
                <AlertTitle className="text-sm font-black uppercase tracking-tighter mb-1">Diqqət: Vaxt az qalır!</AlertTitle>
                <AlertDescription className="text-sm font-medium">
                  Təsdiqə göndərmək üçün <span className="font-bold underline">24 saatdan az</span> vaxtınız qalıb. Zəhmət olmasa planı tamamlayın və göndərin.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Page Header */}
          <CurriculumPageHeader
            urlId={urlId}
            isSchoolAdmin={isSchoolAdmin}
            isSaving={isSaving}
            activeYear={activeYear}
            approval={approval}
            userRole={userRole}
            deadline={deadline}
            isProcessing={isProcessingApproval}
            onSubmit={() => handleWorkflowAction('submit')}
            onApprove={() => handleWorkflowAction('approve')}
            onReturn={(comment) => handleWorkflowAction('return', comment)}
            onReset={() => handleWorkflowAction('reset')}
            onExportActive={() => handleGlobalExport('active', activeTab)}
            onExportAll={() => handleGlobalExport('all', activeTab)}
            activeTab={activeTab}
          />

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="w-full">
            <TabsList className="flex items-center gap-1 p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-2xl w-fit border border-slate-200/50 mb-8 overflow-x-auto no-scrollbar">
              {(['stats', 'yigim', 'subjects', 'grades', 'workload', 'class_subject', 'instructions'] as const).map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium"
                >
                  {tab === 'stats' ? 'STATİSTİKA'
                    : tab === 'yigim' ? 'YIĞIM CƏDVƏLİ'
                    : tab === 'subjects' ? 'FƏNN VƏ VAKANSİYALAR'
                    : tab === 'grades' ? 'SİNİF TƏDRİS PLANI'
                    : tab === 'workload' ? 'DƏRS BÖLGÜSÜ'
                    : tab === 'class_subject' ? 'DƏRS BÖLGÜSÜ DETALLI'
                    : 'TƏLİMAT'}
                </TabsTrigger>
              ))}
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Stats Tab */}
                {activeTab === 'stats' && (
                  <div className="space-y-8">
                    <CurriculumSummaryTiles
                      stats={mpStats}
                      vacantStats={vacantStats}
                      grandTotal={grandTotal}
                    />
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <CurriculumYigimTable
                        title="CƏDVƏL 1 (YIĞIM MÜQAYİSƏSİ)"
                        headers={['MÜVAFİQ CƏDVƏLLƏR ÜZRƏ', 'ÜMUMİ SAAT', 'PLAN (FAKT)', 'FƏRQ']}
                        rows={[
                          { label: 'I - XI siniflər üzrə dərs saatları', master: mpStats.cadvel2, cadvel: grandTotal.plan + grandTotal.split },
                          { label: 'Dərsdənkənar məşğələlər', master: mpStats.cadvel3, cadvel: grandTotal.extra },
                          { label: 'Məktəbdə fərdi təhsil', master: mpStats.cadvel4, cadvel: grandTotal.indiv },
                          { label: 'Evdə təhsil', master: mpStats.cadvel5, cadvel: grandTotal.home },
                          { label: 'Xüsusi təhsil', master: mpStats.cadvel6, cadvel: grandTotal.special },
                          { label: 'Dərnək məşğələləri', master: mpStats.dernek, cadvel: grandTotal.club },
                        ]}
                        totalMaster={mpStats.total}
                        totalFact={grandTotal.total}
                      />
                      <CurriculumYigimTable
                        title="CƏDVƏL 2 (VAKANSİYA STATİSTİKASI)"
                        headers={['FƏALİYYƏT / VAKANSİYA', 'ÜMUMİ SAAT', 'TƏYİN EDİLDİ', 'VAKANSİYA']}
                        rows={[
                          { label: 'I - XI siniflər üzrə dərs saatları', master: vacantStats.c2.tot, cadvel: vacantStats.c2.ass },
                          { label: 'Dərsdənkənar məşğələlər', master: vacantStats.c3.tot, cadvel: vacantStats.c3.ass },
                          { label: 'Məktəbdə fərdi təhsil', master: vacantStats.c4.tot, cadvel: vacantStats.c4.ass },
                          { label: 'Evdə təhsil', master: vacantStats.c5.tot, cadvel: vacantStats.c5.ass },
                          { label: 'Xüsusi təhsil', master: vacantStats.c6.tot, cadvel: vacantStats.c6.ass },
                          { label: 'Dərnək məşğələləri', master: vacantStats.dernek.tot, cadvel: vacantStats.dernek.ass },
                        ]}
                        totalMaster={vacantTotal.tot}
                        totalFact={vacantTotal.ass}
                      />
                    </div>
                  </div>
                )}

                {/* Yığım Tab */}
                {activeTab === 'yigim' && (
                  <CurriculumYigimTab
                    reactiveGrades={reactiveGrades}
                    activeLevels={activeLevels}
                    levelTotals={levelTotals}
                    grandTotal={grandTotal}
                    isLocked={isLocked}
                    loadingGrades={loadingGrades}
                  />
                )}

                {/* Subjects Tab */}
                {activeTab === 'subjects' && (
                  <FennlerVakantlar
                    institutionId={institutionId}
                    academicYearId={academicYearId!}
                    masterPlan={masterPlan}
                    assignedHours={assignedHours}
                    isLocked={isLocked}
                  />
                )}

                {/* Grades Tab */}
                {activeTab === 'grades' && (
                  <GradeManager
                    baseConfig={curriculumGradeEntityConfig}
                    initialFilters={{
                      institution_id: institutionId,
                      academic_year_id: academicYearId,
                      include: 'grade_subjects,homeroom_teacher,academic_year,institution',
                    }}
                    masterPlan={masterPlan}
                    categoryLimits={categoryLimits}
                    isLocked={isLocked}
                  />
                )}

                {/* Workload Tab */}
                {activeTab === 'workload' && (
                  <CurriculumWorkloadTab
                    teachers={teachers}
                    loadingTeachers={loadingTeachers}
                    levelTotals={levelTotals}
                    onOpenDrawer={(teacher) => {
                      setDrawerTeacher(teacher);
                      setDrawerOpen(true);
                    }}
                  />
                )}

                {/* Class-Subject Detailed Tab */}
                {activeTab === 'class_subject' && (
                  <TeacherWorkloadDetailTable institutionId={institutionId} academicYearId={academicYearId} />
                )}

                {/* Instructions Tab */}
                {activeTab === 'instructions' && (
                  <CurriculumInstructionTab />
                )}
              </motion.div>
            </AnimatePresence>
          </Tabs>

          {/* Teacher Workload Drawer */}
          <TeacherWorkloadDrawer
            open={drawerOpen}
            onClose={setDrawerOpen}
            teacher={drawerTeacher}
            institutionId={institutionId}
            academicYearId={academicYearId}
            isLocked={isLocked}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
