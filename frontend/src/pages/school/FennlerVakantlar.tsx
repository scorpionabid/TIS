import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, BookOpen, Save, Calculator, AlertCircle, CheckCircle2 } from 'lucide-react';
import { subjectService, Subject } from '@/services/subjects';
import { curriculumService } from '@/services/curriculumService';
import { academicYearService } from '@/services/academicYears';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type EducationType = 'umumi' | 'ferdi' | 'evde' | 'xususi';
type TabType = EducationType | 'statistika';

interface SubjectRow {
  id: string; // local UI ID
  subjectId: number;
  subjectName: string;
  educationType: EducationType;
  hours: Record<string, number | ''>;
  assignedHours: number; // For vacancy calculation
  groupCount: number;
  isExtra: boolean;
}

const CLASS_LEVELS = ['MH', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const CAT_INFO: Record<EducationType | 'statistika', { label: string; icon: string; color: string; badge: string }> = {
  umumi: { label: 'Ümumi', icon: '🏫', color: 'blue', badge: 'badge-umumi' },
  ferdi: { label: 'Fərdi', icon: '👤', color: 'purple', badge: 'badge-ferdi' },
  evde: { label: 'Evdə', icon: '🏠', color: 'orange', badge: 'badge-evde' },
  xususi: { label: 'Xüsusi', icon: '🌟', color: 'green', badge: 'badge-xususi' },
  statistika: { label: 'Statistika', icon: '📊', color: 'slate', badge: 'bg-slate-100' }
};

// Specialty Subject IDs (based on salvaged code)
const SPEC_IDS = {
  EXTRACURRICULAR: 56,
  CLUB: 57
};

interface FennlerVakantlarProps {
  institutionId?: number;
  academicYearId?: number;
  masterPlan?: any[];
  assignedHours?: any[];
  isLocked?: boolean;
}

export default function FennlerVakantlar({
  institutionId: propId,
  academicYearId: propYearId,
  masterPlan: propMasterPlan,
  assignedHours: propAssignedHours,
  isLocked = false
}: FennlerVakantlarProps = {}) {
  const { currentUser } = useAuth();
  const { institutionId: urlId } = useParams();
  
  const institutionId = propId || (urlId ? parseInt(urlId) : currentUser?.institution?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('umumi');
  const currentEducationType: EducationType = activeTab === 'statistika' ? 'umumi' : activeTab;
  const [rows, setRows] = useState<SubjectRow[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // --- Data Fetching ---
  const { data: allSubjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectService.getAll(),
  });

  const { data: activeYear } = useQuery({
    queryKey: ['activeAcademicYear'],
    queryFn: () => academicYearService.getActive(),
    enabled: !propYearId,
  });

  const academicYearId = propYearId || activeYear?.id;

  const { data: masterPlanData, isLoading: isLoadingPlan } = useQuery({
    queryKey: ['masterPlan', institutionId, academicYearId],
    queryFn: () => curriculumService.getMasterPlan(institutionId!, academicYearId!),
    enabled: !!institutionId && !!academicYearId && !propMasterPlan,
  });

  const effectiveMasterPlan = propMasterPlan || masterPlanData?.items || [];

  const { data: detailedWorkload = [], isLoading: isLoadingWorkload } = useQuery({
    queryKey: ['detailedWorkload', institutionId, academicYearId],
    queryFn: () => curriculumService.getDetailedWorkload(institutionId!, academicYearId!),
    enabled: !!institutionId && !!academicYearId,
  });

  // --- Initialization ---
  // --- Initialization & Merging Assigned Hours ---
  useEffect(() => {
    if ((effectiveMasterPlan.length > 0 || propMasterPlan) && isInitialLoad && allSubjects.length > 0) {
      const rowMap: Record<string, SubjectRow> = {};

      effectiveMasterPlan.forEach((it: any) => {
        const isExtra = !!it.is_extra;
        const key = `${it.subject_id}_${it.education_type}_${isExtra}`;
        if (!rowMap[key]) {
          rowMap[key] = {
            id: Math.random().toString(36).substr(2, 9),
            subjectId: it.subject_id,
            subjectName: it.subject_name || allSubjects.find(s => s.id === it.subject_id)?.name || 'Unknown',
            educationType: it.education_type as EducationType,
            hours: {},
            assignedHours: 0,
            groupCount: Number(it.group_count) || 1,
            isExtra: isExtra
          };
        }
        const gCnt = Number(it.group_count) || 1;
        const currentHours = Number(rowMap[key].hours[it.class_level]) || 0;
        rowMap[key].hours[it.class_level] = currentHours + (it.hours * gCnt); // SUM instead of overwrite
      });

      const assigned = masterPlanData.assignedHours || [];
      assigned.forEach((as: any) => {
        // Assigned hours usually don't have is_extra flag in teaching_loads table directly,
        // or they might be mixed. We assign them to the 'main' row or match by subject.
        // For simplicity and matching Dashboard, we try to match by subject and edu_type.
        Object.values(rowMap).forEach(row => {
          if (row.subjectId === as.subject_id && row.educationType === as.education_type) {
            // If there are multiple rows (main and extra), we might need to split or double.
            // But usually teaching_loads are just total per subject.
            // To match dashboard sum, we'll assign the total to the main row.
            if (!row.isExtra) {
              row.assignedHours = Number(as.total_assigned) || 0;
            }
          }
        });
      });

      setRows(Object.values(rowMap));
      setIsInitialLoad(false);
    }
  }, [masterPlanData, allSubjects, isInitialLoad]);

  // Derived rows for display with latest data
  const rowsWithAssigned = useMemo(() => {
    const dataSources = propAssignedHours || masterPlanData?.assignedHours || [];
    
    // Normalize education type for robust matching
    const normalizeEdu = (type?: string | null) => {
      const t = type?.toLowerCase() || '';
      return (t === 'umumi' || t === 'ümumi' || t === '') ? 'umumi' : t;
    };

    return rows.map(r => {
      const rEdu = normalizeEdu(r.educationType);
      
      // Find all matches for this subject and normalized education type
      const relevantAssignments = dataSources.filter((as: any) => 
        as.subject_id === r.subjectId && normalizeEdu(as.education_type) === rEdu
      );
      
      const totalAssigned = relevantAssignments.reduce((sum, as) => sum + (Number(as.total_assigned) || 0), 0);
      return { ...r, assignedHours: totalAssigned };
    });
  }, [rows, masterPlanData, propAssignedHours]);

  // --- Calculations ---
  const getRowSum = (row: SubjectRow): number => {
    return Object.values(row.hours).reduce<number>((acc, val) => {
      const num = Number(val) || 0;
      return acc + num;
    }, 0);
  };

  const getFilteredRows = useMemo(() => {
    // Regular subjects (excluding special ones that will be fixed at bottom)
    if (currentEducationType === 'umumi') {
      return rowsWithAssigned.filter(r => 
        r.educationType === currentEducationType && 
        r.subjectId !== SPEC_IDS.CLUB && 
        r.subjectId !== SPEC_IDS.EXTRACURRICULAR
      );
    }
    return rowsWithAssigned.filter(r => r.educationType === currentEducationType);
  }, [rowsWithAssigned, currentEducationType]);

  const specialtyRows = useMemo(() => {
    if (currentEducationType !== 'umumi') return [];
    return rowsWithAssigned.filter(r => 
      r.educationType === 'umumi' && 
      (r.subjectId === SPEC_IDS.CLUB || r.subjectId === SPEC_IDS.EXTRACURRICULAR)
    ).sort((a,b) => b.subjectId - a.subjectId); // Club (57) then Extra (56)
  }, [rowsWithAssigned, currentEducationType]);

  const activeLevels = useMemo(() => {
    return currentEducationType === 'umumi' ? CLASS_LEVELS : CLASS_LEVELS.filter(lvl => lvl !== 'MH');
  }, [currentEducationType]);

  const stats = useMemo(() => {
    const allTabRows = [...getFilteredRows, ...specialtyRows];
    const totalSelected = allTabRows.reduce((acc, r) => acc + getRowSum(r), 0);
    const totalAssigned = allTabRows.reduce((acc, r) => acc + r.assignedHours, 0);
    const vacancy = totalSelected - totalAssigned;
    const clubR = allTabRows.filter(r => r.subjectId === SPEC_IDS.CLUB);
    const cVac = clubR.reduce((acc, r) => acc + (getRowSum(r) - r.assignedHours), 0);
    return { totalSelected, totalAssigned, vacancy, clubVacancy: cVac };
  }, [getFilteredRows, specialtyRows]);

  const grandStats = useMemo(() => {
    const totalSelected = rowsWithAssigned.reduce((acc, r) => acc + getRowSum(r), 0);
    
    // Use the primary source for the total assigned hours to ensure perfect synchronization with Dashboard
    const totalAssigned = propAssignedHours 
      ? propAssignedHours.reduce((acc, as) => acc + (Number(as.total_assigned) || 0), 0)
      : rowsWithAssigned.reduce((acc, r) => acc + r.assignedHours, 0);

    const vacancy = totalSelected - totalAssigned;
    const clubR = rowsWithAssigned.filter(r => r.subjectId === SPEC_IDS.CLUB);
    const cVac = clubR.reduce((acc, r) => acc + (getRowSum(r) - r.assignedHours), 0);
    return { totalSelected, totalAssigned, vacancy, clubVacancy: cVac };
  }, [rowsWithAssigned, propAssignedHours]);

  const displayStats = activeTab === 'statistika' ? grandStats : stats;
  const clubVacancy = displayStats.clubVacancy;

  // --- Handlers ---
  const handleAddSubject = (subjectId: number) => {
    const subject = allSubjects.find(s => s.id === subjectId);
    if (!subject) return;

    if (rows.some(r => r.subjectId === subjectId && r.educationType === currentEducationType)) {
      toast({ title: 'Xəta', description: 'Bu fənn artıq əlavə edilib', variant: 'destructive' });
      return;
    }

    const newRow: SubjectRow = {
      id: Math.random().toString(36).substr(2, 9),
      subjectId: subject.id,
      subjectName: subject.name,
      educationType: currentEducationType,
      hours: {},
      assignedHours: 0,
      groupCount: 1,
      isExtra: false
    };

    setRows([...rows, newRow]);
  };

  const handleCellChange = (rowId: string, level: number | string, value: string) => {
    const num: number | '' = value === '' ? '' : Math.max(0, parseFloat(value));
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, hours: { ...r.hours, [level]: num } } : r));
  };

  const handleDeleteRow = async (row: SubjectRow) => {
    try {
      if (masterPlanData) {
        await curriculumService.deleteMasterPlanSubject(institutionId!, academicYearId!, row.subjectId, row.educationType);
      }
      setRows(prev => prev.filter(r => r.id !== row.id));
      toast({ title: 'Uğurlu', description: 'Fənn silindi' });
    } catch (error) {
      toast({ title: 'Xəta', description: 'Fənn silinərkən xəta baş verdi', variant: 'destructive' });
    }
  };

  const handleSave = useCallback(async (rowsToSaveList?: SubjectRow[]) => {
    if (!institutionId || !academicYearId) return;

    setIsSaving(true);
    const sourceRows = rowsToSaveList || rows;
    const itemsToSave: any[] = [];
    sourceRows.forEach(r => {
      Object.entries(r.hours).forEach(([level, hours]) => {
        // Essential: Send even 0 or empty string as 0 to ensure deletion/reset in backend
        const hVal = (hours === '' || hours === null || hours === undefined) ? 0 : Number(hours);
        
        itemsToSave.push({
          subject_id: r.subjectId,
          education_type: r.educationType,
          class_level: level === 'MH' ? 0 : Number(level),
          hours: hVal // Corrected key to 'hours'
        });
      });
    });

    try {
      if (itemsToSave.length > 0) {
        await curriculumService.saveMasterPlan(institutionId, academicYearId, itemsToSave);
        setLastSaved(new Date());
        // CRITICAL: Refresh data from backend to ensure persistence and get accurate vacancy totals
        queryClient.invalidateQueries({ queryKey: ['masterPlan', institutionId, academicYearId] });
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [institutionId, academicYearId, rows]);

  // Debounced Auto-Save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isInitialLoad) return;
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    // SECURITY: Skip auto-save if locked
    if (isLocked) return;

    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [rows, handleSave, isInitialLoad]);

  const isLoading = isLoadingPlan || isLoadingSubjects;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Məlumatlar yüklənir...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 p-4 rounded-3xl border border-slate-200/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-2xl">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Fənlər və Vakansiyalar</h2>
            <p className="text-xs text-slate-500">Məktəb üzrə fənn yükü və vakant saatların idarə edilməsi</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSaving ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 italic font-medium transition-all">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-[10px] uppercase tracking-tighter">Yadda saxlanılır...</span>
            </div>
          ) : lastSaved ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 transition-all opacity-60">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-tighter">Yadda saxlanıldı ({lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
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

        {activeTab !== 'statistika' && (
          <TabsContent value={activeTab} className="mt-6">
            <div className="bg-white rounded-3xl shadow-premium overflow-hidden border border-slate-200/60">
            <div className="overflow-x-auto relative scrollbar-premium">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold">
                    <th className="px-5 py-3 text-slate-600 sticky left-0 bg-slate-50/90 z-10 w-52 shadow-sm font-black">FƏNN ADI</th>
                    {activeLevels.map(lvl => (
                      <th key={lvl} className={cn(
                        "px-2 py-3 text-center w-14",
                        lvl === 'MH' ? "text-indigo-600 font-black bg-indigo-50/20" : "text-slate-500"
                      )}>{lvl}</th>
                    ))}
                    <th className="px-3 py-3 text-blue-600 text-center w-20 bg-blue-50/30 font-black">CƏMİ</th>
                    <th className="px-3 py-3 text-orange-600 text-center w-20 bg-orange-50/30 font-black">VAKANT</th>
                    <th className="px-2 py-3 text-slate-500 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence mode='popLayout'>
                    {getFilteredRows.map((row) => {
                      const sum = getRowSum(row);
                      const vacant = sum - row.assignedHours;
                      return (
                        <motion.tr 
                          key={row.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-5 py-3 font-medium text-slate-700 sticky left-0 bg-white/95 group-hover:bg-slate-50 transition-colors z-10 shadow-sm">
                            <span className="truncate">{row.subjectName}</span>
                          </td>
                          {activeLevels.map(lvl => (
                            <td key={lvl} className={cn("p-1 text-center relative", row.groupCount > 1 ? "bg-amber-50/20" : "")}>
                               <input 
                                 type="number"
                                 step="0.5"
                                 className={cn(
                                   "w-11 h-7 text-center text-[11px] bg-slate-100 border border-transparent rounded-md focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all tabular-nums",
                                   row.hours[lvl] && Number(row.hours[lvl]) > 0 ? "text-blue-700 font-semibold" : "text-slate-400"
                                 )}
                                 value={row.hours[lvl] ?? ''}
                                 onChange={(e) => handleCellChange(row.id, lvl, e.target.value)}
                                 placeholder="0"
                                 disabled={isLocked}
                               />
                               {row.groupCount > 1 && row.hours[lvl] && Number(row.hours[lvl]) > 0 && (
                                 <div className="absolute top-0 right-0 bg-amber-500 text-white text-[7px] font-black px-1 rounded-bl-md shadow-sm z-10">
                                   x{row.groupCount}
                                 </div>
                               )}
                            </td>
                          ))}
                          <td className="px-3 py-3 text-center font-bold text-blue-600 bg-blue-50/5 tabular-nums">
                            {sum > 0 ? `${sum.toFixed(1)}s` : '0'}
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-orange-600 bg-orange-50/5 tabular-nums">
                            {vacant > 0 ? `${vacant.toFixed(1)}s` : '0'}
                          </td>
                          <td className="p-4 text-center">
                            {!isLocked && (
                              <button 
                                onClick={() => handleDeleteRow(row)}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>

                  {/* Subject Add Control */}
                  {(activeTab as string) !== 'statistika' && (
                    <tr className="bg-slate-50/30 border-y border-slate-100">
                      <td colSpan={activeLevels.length + 4} className="px-5 py-3 text-center">
                        <select 
                          className="text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50"
                          onChange={(e) => handleAddSubject(Number(e.target.value))}
                          value=""
                          disabled={isLocked}
                        >
                          <option value="" disabled>{isLocked ? '🚫 REDAKTƏ QAPALIDIR' : '+ YENİ FƏNN ƏLAVƏ ET'}</option>
                          {allSubjects
                            .filter(s => !rows.some(r => r.subjectId === s.id && r.educationType === currentEducationType))
                            .sort((a,b) => a.name.localeCompare(b.name))
                            .map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))
                          }
                        </select>
                      </td>
                    </tr>
                  )}

                  {/* Fixed Specialty Rows */}
                  {currentEducationType === 'umumi' && specialtyRows.map((row) => {
                    const sum = getRowSum(row);
                    const vacant = sum - row.assignedHours;
                    return (
                      <tr key={row.id} className="bg-blue-50/10 border-b border-blue-50 group">
                        <td className="px-5 py-3 font-bold text-slate-600 italic sticky left-0 bg-blue-50/30 z-10 shadow-sm">
                          <div className="flex items-center gap-2">
                             <span className={cn(
                               "flex h-2 w-2 rounded-full",
                               row.subjectId === SPEC_IDS.CLUB ? "bg-orange-400" : "bg-blue-400"
                             )} />
                             <span>{row.subjectName}</span>
                          </div>
                        </td>
                        {activeLevels.map(lvl => (
                         <td key={lvl} className={cn("p-1 text-center relative", row.groupCount > 1 ? "bg-amber-50/20" : "")}>
                          <input 
                            type="number"
                            step="0.5"
                            className="w-11 h-7 text-center text-[11px] bg-white border border-slate-200 rounded-md focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all tabular-nums font-semibold text-blue-800"
                            value={row.hours[lvl] ?? ''}
                            onChange={(e) => handleCellChange(row.id, lvl, e.target.value)}
                            placeholder="0"
                            disabled={isLocked}
                          />
                          {row.groupCount > 1 && row.hours[lvl] && Number(row.hours[lvl]) > 0 && (
                            <div className="absolute top-0 right-0 bg-amber-500 text-white text-[7px] font-black px-1 rounded-bl-md shadow-sm z-10">
                              x{row.groupCount}
                            </div>
                          )}
                        </td>
                        ))}
                        <td className="px-3 py-3 text-center font-black text-blue-600 bg-blue-50/50 tabular-nums">{sum.toFixed(1)}s</td>
                        <td className="px-3 py-3 text-center font-black text-orange-600 bg-orange-50/50 tabular-nums">{vacant > 0 ? `${vacant.toFixed(1)}s` : '0'}</td>
                        <td></td>
                      </tr>
                    );
                  })}
                  
                  {getFilteredRows.length === 0 && specialtyRows.length === 0 && (
                    <tr>
                      <td colSpan={activeLevels.length + 4} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                          <BookOpen className="w-12 h-12 text-slate-300" />
                          <p className="text-sm text-slate-400 font-medium">Bu kateqoriya üzrə fənn əlavə edilməyib</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                {getFilteredRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50/50 font-bold text-slate-700 border-t-2 border-slate-200">
                      <td className="p-4 sticky left-0 bg-slate-50/50 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)] text-right">YEKUN:</td>
                      {activeLevels.map(lvl => {
                        const allTabRows = [...getFilteredRows, ...specialtyRows];
                        const colSum = allTabRows.reduce((acc, r) => acc + (Number(r.hours[lvl]) || 0), 0);
                        return (
                          <td key={lvl} className="p-4 text-center tabular-nums text-slate-500">
                            {colSum > 0 ? `${colSum.toFixed(1)}` : ''}
                          </td>
                        );
                      })}
                      <td className="p-4 text-center text-blue-700 bg-blue-50/50 tabular-nums">{stats.totalSelected}s</td>
                      <td className="p-4 text-center text-orange-700 bg-orange-50/50 tabular-nums">{stats.vacancy}s</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </TabsContent>
        )}

        {/* Statistika View */}
        {activeTab === 'statistika' && (
          <TabsContent value="statistika" className="mt-6">
            <div className="bg-white rounded-3xl shadow-premium p-6 border border-slate-200/60 flex flex-col gap-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-slate-100 rounded-2xl">
                  <Calculator className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Ümumi Statistika</h3>
                  <p className="text-xs text-slate-500">Bütün təhsil növləri üzrə yekun fənn yükü və vakansiya</p>
                </div>
              </div>
              
              <div className="overflow-x-auto rounded-2xl border border-slate-200/60 shadow-sm">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                  <tr className="bg-slate-50 relative text-slate-500 text-xs font-semibold border-b border-slate-200">
                    <th className="px-5 py-3 text-left w-1/4">Təhsil Növü</th>
                    <th className="px-4 py-3 text-center">Plan Saatlar</th>
                    <th className="px-4 py-3 text-center">Təyin Edilib</th>
                    <th className="px-4 py-3 text-center">Vakant</th>
                    <th className="px-4 py-3 text-center">Yerinə Yetirilmə (%)</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { id: 'umumi_plus_extra', label: 'Ümumi / Məşğələ', icon: '🏫', ids: [null, 0, SPEC_IDS.EXTRACURRICULAR], exclude: [SPEC_IDS.CLUB] },
                      { id: 'ferdi', label: 'Fərdi', icon: '👤', eduType: 'ferdi' },
                      { id: 'evde', label: 'Evdə', icon: '🏠', eduType: 'evde' },
                      { id: 'xususi', label: 'Xüsusi', icon: '🌟', eduType: 'xususi' },
                      { id: 'dernek', label: 'Dərnək', icon: '🎭', ids: [SPEC_IDS.CLUB] },
                    ].map((config) => {
                      const catRows = rows.filter(r => {
                        if (config.ids) {
                          const matchesId = config.ids.includes(r.subjectId);
                          return matchesId && (config.eduType ? r.educationType === config.eduType : true);
                        }
                        if (config.id === 'umumi_plus_extra') {
                          return r.educationType === 'umumi' && r.subjectId !== SPEC_IDS.CLUB;
                        }
                        return r.educationType === config.eduType;
                      });
                      const tSel = catRows.reduce((a, r) => a + getRowSum(r), 0);
                      const tAss = catRows.reduce((a, r) => a + r.assignedHours, 0);
                      const vac = tSel - tAss;
                      return (
                        <tr key={config.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3 font-medium flex items-center gap-3">
                            <span className="text-xl">{config.icon}</span>
                            <span className="text-slate-700">{config.label}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600 tabular-nums">{tSel.toFixed(1)}</td>
                          <td className="px-4 py-3 text-center font-medium text-emerald-600 tabular-nums">{tAss.toFixed(1)}</td>
                          <td className="px-4 py-3 text-center font-medium text-amber-600 tabular-nums">
                            {vac.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500 tabular-nums">
                            {tSel > 0 ? ((tAss / tSel) * 100).toFixed(0) + '%' : '0%'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 text-slate-800 font-semibold border-t-2 border-slate-200">
                      <td className="px-5 py-4">Cəmi Ümumi</td>
                      <td className="px-4 py-4 text-center tabular-nums">{displayStats.totalSelected.toFixed(1)}</td>
                      <td className="px-4 py-4 text-center text-emerald-600 tabular-nums">{displayStats.totalAssigned.toFixed(1)}</td>
                      <td className="px-4 py-4 text-center text-amber-600 tabular-nums">{displayStats.vacancy.toFixed(1)}</td>
                      <td className="px-4 py-4 text-center tabular-nums">
                        {displayStats.totalSelected > 0 ? ((displayStats.totalAssigned / displayStats.totalSelected) * 100).toFixed(0) + '%' : '0%'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-slate-200/60 shadow-sm overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 border-none text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100/80 text-xs font-semibold mb-1">CƏMİ SAAT</p>
                <h3 className="text-3xl font-bold tabular-nums">{displayStats.totalSelected}<span className="text-sm ml-1 font-normal opacity-80">saat</span></h3>
              </div>
              <div className="p-2.5 bg-white/10 rounded-2xl">
                <Calculator className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200/60 shadow-sm overflow-hidden border-none text-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-xs font-semibold mb-1">TƏYİN EDİLDİ</p>
                <h3 className="text-3xl font-bold tabular-nums">{displayStats.totalAssigned}<span className="text-sm ml-1 font-normal text-slate-400">saat</span></h3>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-2xl">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200/60 shadow-sm overflow-hidden border-none bg-orange-50 text-orange-900">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-orange-400 text-xs font-semibold mb-1 uppercase tracking-wider">VAKANSİYA</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black tabular-nums text-orange-600">
                    {displayStats.vacancy.toFixed(1)}
                  </h3>
                  <span className="text-xs font-bold text-orange-400 opacity-60">saat</span>
                </div>
                {clubVacancy > 0 && (
                   <p className="text-[10px] font-black text-orange-400 mt-2 uppercase tracking-widest">+ {clubVacancy.toFixed(1)} dərnək</p>
                )}
              </div>
              <div className="p-2.5 bg-orange-500/10 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
