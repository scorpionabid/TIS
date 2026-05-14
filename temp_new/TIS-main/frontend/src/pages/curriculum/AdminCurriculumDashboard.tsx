import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { curriculumService } from '@/services/curriculumService';
import { institutionService } from '@/services/institutions';
import { academicYearService } from '@/services/academicYears';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar, 
  Clock, 
  Settings as LucideSettingsIcon,
  X as ClearIcon,
  TrendingUp,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DashboardStats } from './components/DashboardStats';
import { DashboardFilters } from './components/DashboardFilters';
import { DashboardTable } from './components/DashboardTable';
import { exportToExcelUniversal } from '@/utils/curriculumExport';

/**
 * Admin Curriculum Dashboard
 * Provides overview of curriculum planning status across schools,
 * and allows regional admins to set deadlines and lock the system.
 */
export default function AdminCurriculumDashboard() {
  // 1. Auth & Navigation Hooks (MUST be at the very top)
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 2. Component Basic State & URL State
  const search = searchParams.get('search') || '';
  const sectorFilter = searchParams.get('sector') || 'all';
  const statusFilter = searchParams.get('status') || 'all';

  const setSearch = (val: string) => {
    setSearchParams(prev => {
      if (val) prev.set('search', val);
      else prev.delete('search');
      return prev;
    }, { replace: true });
  };

  const setSectorFilter = (val: string) => {
    setSearchParams(prev => {
      if (val && val !== 'all') prev.set('sector', val);
      else prev.delete('sector');
      return prev;
    }, { replace: true });
  };

  const setStatusFilter = (val: string) => {
    setSearchParams(prev => {
      if (val && val !== 'all') prev.set('status', val);
      else prev.delete('status');
      return prev;
    }, { replace: true });
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deadlineState, setDeadlineState] = useState<string | null>(null);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // 6. Export Logic
  const handleExport = async () => {
    if (filteredSchools.length === 0 || isExporting) return;
    
    setIsExporting(true);
    try {
      const metadata = {
        regionalName: currentUser?.region?.name || 'Regional Təhsil İdarəsi',
        schoolName: 'Təhsil Müəssisələrinin Monitorinqi',
        academicYear: activeYear?.name || '',
        directorName: currentUser?.name || '',
      };

      const headers = [
        ['№', 'Müəssisə', 'Sektor', 'UTİS Kodu', 'Status', 'Plan (Əsas)', 'Plan (Dərnək)', 'Plan (Cəmi)', 'Vakant (Əsas)', 'Vakant (Dərnək)', 'Vakant (Cəmi)']
      ];

      const data = filteredSchools.map((s, idx) => {
        const sectorName = sectorsMap[s.parent_id] || s.parent?.name || s.sector?.name || '—';
        const mainHours = parseFloat(s.curriculum_main_hours) || 0;
        const clubHours = parseFloat(s.curriculum_club_hours) || 0;
        const totalHours = mainHours + clubHours;
        const mainVac = parseFloat(s.curriculum_main_vacancies) || 0;
        const clubVac = parseFloat(s.curriculum_club_vacancies) || 0;
        const totalVac = mainVac + clubVac;
        
        const statusMap: Record<string, string> = {
          approved: 'Təsdiqlənib',
          submitted: 'Gözləyir',
          returned: 'Geri qaytarılıb',
          draft: 'Qaralama'
        };

        return [
          idx + 1,
          s.name,
          sectorName,
          s.utis_code || '—',
          statusMap[s.curriculum_status] || 'Qaralama',
          mainHours,
          clubHours,
          totalHours,
          mainVac,
          clubVac,
          totalVac
        ];
      });

      await exportToExcelUniversal(
        `Curriculum_Dashboard_Report_${format(new Date(), 'yyyy-MM-dd')}`,
        'Məktəblər Üzrə Hesabat',
        headers,
        data,
        metadata,
        [5, 40, 25, 12, 15, 12, 12, 12, 12, 12, 12]
      );

      toast.success('Excel faylı uğurla yaradıldı');
    } catch (e) {
      console.error('Export failed', e);
      toast.error('Excel ixracı zamanı xəta baş verdi');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper to extract schools array from any possible structure (paginated, nested, axios-wrapped, etc.)
  // Helper to extract schools array from any possible structure (paginated, nested, axios-wrapped, etc.)
  const normalizeSchoolsData = (res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    // Handle Laravel Paginated structure
    if (res.data && Array.isArray(res.data)) return res.data;
    // Handle deeply nested Axios/Laravel structure
    if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
    // Handle other common names for data arrays
    if (res.items && Array.isArray(res.items)) return res.items;
    if (res.institutions && Array.isArray(res.institutions)) return res.institutions;
    // Last resort: check if the object itself is the data we want
    if (typeof res === 'object' && !res.data && !res.items) {
       const possibleArray = Object.values(res).find(val => Array.isArray(val));
       if (possibleArray) return possibleArray as any[];
    }
    return [];
  };

  // 3. Derived Helpers (Roles & Permission checks)
  // 3. Derived Helpers (Roles & Permission checks)
  const userRole = useMemo(() => {
    const roles = (currentUser as any)?.roles || [];
    const directRole = (currentUser as any)?.role;
    const firstRole = Array.isArray(roles) && roles.length > 0 
      ? (typeof roles[0] === 'string' ? roles[0] : roles[0]?.name)
      : null;
    
    return (directRole || firstRole || '').toLowerCase();
  }, [currentUser]);

  const isSuperAdmin = userRole === 'superadmin';
  const isRegionAdmin = ['regionadmin', 'superadmin', 'regionoperator'].includes(userRole);
  const canManageSettings = userRole === 'regionadmin';
  const isSektorAdmin = userRole === 'sektoradmin';
  const userInstitutionId = (currentUser as any)?.institution_id || (currentUser as any)?.institutionId || (currentUser as any)?.institution?.id;
  const regionIdForSectors = currentUser?.region?.id || (isRegionAdmin ? userInstitutionId : undefined);

  // 4. Data Fetching - Global Settings (Deadline/Lock)
  const { data: activeYear } = useQuery({
    queryKey: ['activeAcademicYear'],
    queryFn: () => academicYearService.getActive(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: dashboardSettings } = useQuery({
    queryKey: ['curriculum-settings'],
    queryFn: () => curriculumService.getSettings(),
  });

  // 5. Data Fetching - Sectors/Regions
  const { data: sectorsDataRaw } = useQuery({
    queryKey: ['region-sectors-hierarchical', regionIdForSectors],
    queryFn: async () => {
      if (!regionIdForSectors) return [];
      const response = await institutionService.getAll({ level: 3, parent_id: regionIdForSectors, per_page: 1000 } as any);
      const { items } = (institutionService as any).normalizeInstitutionResponse(response);
      if (items && items.length > 0) return items;
      const byType = await institutionService.getSectors(regionIdForSectors);
      return Array.isArray(byType) ? byType : (byType as any)?.items || (byType as any)?.data || [];
    },
    enabled: isRegionAdmin && !!regionIdForSectors,
  });

  const sectors = useMemo(() => {
    if (!sectorsDataRaw) return [];
    if (Array.isArray(sectorsDataRaw)) return sectorsDataRaw;
    return (sectorsDataRaw as any)?.items || (sectorsDataRaw as any)?.data || [];
  }, [sectorsDataRaw]);

  // Build a quick lookup map: sectorId -> sectorName for DashboardTable
  const sectorsMap = useMemo(() => {
    const map: Record<string, string> = {};
    sectors.forEach((s: any) => {
      if (s.id) map[String(s.id)] = s.name || s.short_name || `Sektor ${s.id}`;
    });
    return map;
  }, [sectors]);

  // 6. Data Fetching - Schools List
  const { data: rawSchoolsPayload, isLoading: loadingSchools, isError: isErrorSchools } = useQuery({
    queryKey: ['curriculum-schools', userInstitutionId, userRole, activeYear?.id],
    queryFn: async () => {
      if (!activeYear?.id) return [];
      // SuperAdmin has no institution_id — fetches all schools without parent filter
      if (!isSuperAdmin && !userInstitutionId) return [];

      const response = await institutionService.getAll({
        level: 4,
        parent_id: isSektorAdmin ? userInstitutionId : undefined,
        per_page: 1000,
        with_curriculum_stats: true,
        academic_year_id: activeYear.id
      } as any);

      return response;
    },
    enabled: (isSuperAdmin || !!userInstitutionId) && !!activeYear?.id
  });

  const schools = useMemo(() => {
    const norm = normalizeSchoolsData(rawSchoolsPayload);
    return norm;
  }, [rawSchoolsPayload]);

  // 7. Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (data: { 
      deadline: string | null, 
      is_locked: boolean,
      can_sektor_edit: boolean,
      can_operator_edit: boolean
    }) => curriculumService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-settings'] });
      toast({ title: 'Uğur', description: 'Tənzimləmələr yadda saxlanıldı' });
      setIsSettingsOpen(false);
    },
    onError: () => toast({ title: 'Xəta', description: 'Yadda saxlamaq mümkün olmadı', variant: 'destructive' })
  });

  // 8. Memoized derived state for filtering
  const filteredSchools = useMemo(() => {
    return schools.filter((school: any) => {
      // Role-based fail-safe: if SektorAdmin, only show schools belonging to their sector
      if (isSektorAdmin && userInstitutionId) {
        if (school.parent_id != userInstitutionId) {
          return false;
        }
      }

      const matchesSearch = school.name.toLowerCase().includes(search.toLowerCase());
      // Loose comparison for sector filter
      const matchesSector = sectorFilter === 'all' || (school.sector_id || school.parent_id) == sectorFilter;
      const matchesStatus = statusFilter === 'all' || (school.curriculum_status || 'draft') === statusFilter;
      return matchesSearch && matchesSector && matchesStatus;
    });
  }, [schools, search, sectorFilter, statusFilter, isSektorAdmin, userInstitutionId]);

  // 9. Effects
  useEffect(() => { document.title = 'Dərs yükü və Vakansiya | ATİS'; }, []);
  useEffect(() => {
    if (isSettingsOpen && dashboardSettings?.deadline) {
      try { setDeadlineState(format(new Date(dashboardSettings.deadline), "yyyy-MM-dd'T'HH:mm")); } catch (e) { setDeadlineState(null); }
    } else if (isSettingsOpen) { setDeadlineState(null); }
  }, [isSettingsOpen, dashboardSettings?.deadline]);

  // 10. Event Handlers
  const handleUpdateSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateSettingsMutation.mutate({
      deadline: deadlineState ? new Date(deadlineState).toISOString() : null,
      is_locked: formData.get('is_locked') === 'on',
      can_sektor_edit: formData.get('can_sektor_edit') === 'on',
      can_operator_edit: formData.get('can_operator_edit') === 'on'
    });
  };

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-4 rounded-[28px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase leading-none italic">Dərs yükü və Vakansiya</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5 leading-none">Monitorinq və Analitika</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dashboardSettings?.deadline && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-xl shadow-sm">
              <Clock className="text-indigo-500" size={14} />
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                SON: {format(new Date(dashboardSettings.deadline), 'dd.MM.yyyy HH:mm')}
              </span>
            </div>
          )}
          {canManageSettings && (
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-10 px-5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm transition-all active:scale-[0.98]">
                  <LucideSettingsIcon size={14} /> Tənzimləmə
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[32px] border-0 shadow-2xl max-w-md p-8">
                <form onSubmit={handleUpdateSettings}>
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-black text-slate-900 uppercase italic">Parametrlər</DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium">Regional monitorinq üçün sistem qaydaları.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 mb-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Son Müraciət Tarixi</Label>
                      <div className="relative">
                        <Input type="datetime-local" value={deadlineState || ''} onChange={(e) => setDeadlineState(e.target.value)} className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500 font-black text-sm" />
                        {deadlineState && <Button type="button" variant="ghost" size="sm" onClick={() => setDeadlineState(null)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-lg text-slate-400"><ClearIcon size={16} /></Button>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="space-y-1">
                        <Label className="text-sm font-black text-slate-800 uppercase italic">Sistemi Kilidlə</Label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Girişləri tam dayandırır</p>
                      </div>
                      <input type="checkbox" id="is_locked" name="is_locked" defaultChecked={dashboardSettings?.is_locked} className="w-10 h-6 bg-slate-200 rounded-full appearance-none checked:bg-indigo-600 transition-all cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all checked:after:translate-x-4" />
                    </div>

                    <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="space-y-1">
                        <Label className="text-sm font-black text-slate-800 uppercase italic">Sektor Admin Redaktə</Label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Sektor adminlərinə redaktə icazəsi</p>
                      </div>
                      <input type="checkbox" id="can_sektor_edit" name="can_sektor_edit" defaultChecked={dashboardSettings?.can_sektor_edit ?? true} className="w-10 h-6 bg-slate-200 rounded-full appearance-none checked:bg-indigo-600 transition-all cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all checked:after:translate-x-4" />
                    </div>

                    <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="space-y-1">
                        <Label className="text-sm font-black text-slate-800 uppercase italic">Operator Redaktə</Label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Region operatorlarına redaktə icazəsi</p>
                      </div>
                      <input type="checkbox" id="can_operator_edit" name="can_operator_edit" defaultChecked={dashboardSettings?.can_operator_edit ?? true} className="w-10 h-6 bg-slate-200 rounded-full appearance-none checked:bg-indigo-600 transition-all cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all checked:after:translate-x-4" />
                    </div>
                  </div>
                  <Button type="submit" disabled={updateSettingsMutation.isPending} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200">
                    {updateSettingsMutation.isPending ? 'Saxlanılır...' : 'Yadda Saxla'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <DashboardStats 
        schools={filteredSchools} 
        onStatClick={(statId) => setSelectedStat(selectedStat === statId ? null : statId)}
        activeStat={selectedStat}
        isLoading={loadingSchools}
      />
      
      {selectedStat && (
        <div className="bg-white/60 backdrop-blur-md rounded-[32px] border border-slate-100 p-6 shadow-sm animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">
              {selectedStat === 'total' && 'Cəmi Saatlar üzrə Təhlil'}
              {selectedStat === 'vacancies' && 'Vakansiyalar üzrə Təhlil'}
              {selectedStat === 'submitted' && 'Təsdiq Gözləyənlər'}
              {selectedStat === 'approved' && 'Təsdiqlənmiş Məktəblər'}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedStat(null)} className="h-8 rounded-lg text-slate-400 uppercase text-[9px] font-black tracking-widest">
              Bağla
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-xs font-semibold text-slate-400 uppercase tracking-widest italic">
                  <th className="px-4 py-2">Məktəb</th>
                  <th className="px-4 py-2 text-right">Məlumat</th>
                  <th className="px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools
                  .filter(s => {
                    const status = s.curriculum_status || 'draft';
                    if (selectedStat === 'total') return (parseFloat(s.curriculum_total_hours) || 0) > 0;
                    if (selectedStat === 'vacancies') return (parseFloat(s.curriculum_vacancies) || 0) > 0;
                    if (selectedStat === 'submitted') return status === 'submitted';
                    if (selectedStat === 'approved') return status === 'approved';
                    return true;
                  })
                  .slice(0, 10)
                  .map((school: any) => (
                  <tr key={school.id} className="bg-white/50 hover:bg-white transition-all group shadow-sm">
                    <td className="px-5 py-3 rounded-l-xl border-y border-l border-slate-100">
                      <div className="text-sm font-semibold text-slate-700 tracking-tight">{school.name}</div>
                    </td>
                    <td className="px-5 py-3 border-y border-slate-100 text-right font-bold text-sm text-indigo-600 tabular-nums">
                      {selectedStat === 'total' && `${parseFloat(school.curriculum_total_hours || 0).toFixed(1)} SAAT`}
                      {selectedStat === 'vacancies' && `${parseFloat(school.curriculum_vacancies || 0).toFixed(1)} VAKANT`}
                      {(selectedStat === 'submitted' || selectedStat === 'approved') && '—'}
                    </td>
                    <td className="px-5 py-3 border-y border-r border-slate-100 rounded-r-xl text-right">
                      <span className={cn(
                        "text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg border",
                        school.curriculum_status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        school.curriculum_status === 'submitted' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                      )}>
                        {school.curriculum_status === 'approved' ? 'TƏSDİQ' : 
                         school.curriculum_status === 'submitted' ? 'GÖZLƏYİR' : 'QARALAMA'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <DashboardFilters 
        search={search} 
        setSearch={setSearch}
        sectorFilter={sectorFilter}
        setSectorFilter={setSectorFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sectors={sectors}
        isRegionAdmin={isRegionAdmin}
        resultCount={filteredSchools.length}
        onExport={handleExport}
        isExporting={isExporting}
      />

      <DashboardTable 
        schools={filteredSchools}
        isLoading={loadingSchools}
        isError={isErrorSchools}
        isRegionAdmin={isRegionAdmin}
        isSektorAdmin={isSektorAdmin}
        sectorsMap={sectorsMap}
      />
    </div>
  );
}
