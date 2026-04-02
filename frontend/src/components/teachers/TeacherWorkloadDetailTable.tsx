import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { Loader2, AlertTriangle, BookOpen, Download, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { academicYearService } from '@/services/academicYears';
import { schoolAdminService } from '@/services/schoolAdmin';
import { exportToExcelUniversal, ExportMetadata } from '@/utils/curriculumExport';

export interface TeachingLoadDetailRow {
  id: number;
  first_name: string;
  last_name: string;
  patronymic: string;
  position_type: string;
  employee_id: string;
  specialty: string;
  assessment_type: string;
  assessment_score: number | null;
  grade_level: number;
  section: string;
  subject_name: string;
  umumi_hours: number;
  individual_school_hours: number;
  home_education_hours: number;
  special_education_hours: number;
  extracurricular_hours: number;
  club_hours: number;
  total_hours: number;
}

interface Props {
  institutionId: number | undefined;
  academicYearId?: number;
}

const positionLabels: Record<string, string> = {
  direktor: 'Direktor',
  direktor_muavini_tedris: 'Direktor Müavini (Tədris)',
  direktor_muavini_inzibati: 'Direktor Müavini (İnzibati)',
  terbiye_isi_uzre_direktor_muavini: 'Direktor Müavini (Tərbiyə)',
  metodik_birlesme_rəhbəri: 'Metodik Birləşmə Rəhbəri',
  'muəllim_sinif_rəhbəri': 'Müəllim-Sinif Rəhbəri',
  'muəllim': 'Müəllim',
  psixoloq: 'Psixoloq',
  kitabxanaçı: 'Kitabxanaçı',
  laborant: 'Laborant',
  'tibb_işçisi': 'Tibb İşçisi',
  'təsərrüfat_işçisi': 'Təsərrüfat İşçisi',
};

export const TeacherWorkloadDetailTable: React.FC<Props> = ({ institutionId, academicYearId }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['teaching-loads-detail', institutionId, academicYearId],
    queryFn: async () => {
      if (!institutionId) return [];
      const params = academicYearId ? `?academic_year_id=${academicYearId}` : '';
      const response = await apiClient.get<{ success: boolean; data: TeachingLoadDetailRow[] }>(
        `/teaching-loads/institution/${institutionId}${params}`
      );
      return (response as any)?.data ?? [];
    },
    enabled: !!institutionId,
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev,
  });

  const { currentUser } = useAuth();
  const { data: activeYear } = useQuery({
    queryKey: ['activeAcademicYear'],
    queryFn: () => academicYearService.getActive(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', 'director-check-detail', institutionId],
    queryFn: () => schoolAdminService.getTeachers({ institution_id: institutionId, per_page: 500 } as any),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  });

  const [searchTerm, setSearchTerm] = React.useState('');

  const handleExport = async () => {
    const director = teachers.find(t => t.position_type === 'direktor');
    const metadata: ExportMetadata = {
      regionalName: currentUser?.region?.name || 'Regional Təhsil İdarəsi',
      schoolName: currentUser?.institution?.name || 'Ümumtəhsil Məktəbi',
      academicYear: activeYear?.name || '',
      directorName: director ? `${director.last_name} ${director.first_name} ${(director as any).patronymic || ''}` : ''
    };

    const headers = [[
      '№', 'Müəllim S.A.A.', 'Vəzifəsi', 'UTİS kodu', 'İxtisas', 'Qiymətl. növü', 'Qiymətl. balı', 
      'Sinif', 'İndeks', 'Fənn', 'Ümumi', 'Fərdi', 'Evdə', 'Xüsusi', 'Dərsdənkənar', 'Dərnək', 'Cəmi'
    ]];

    const exportData = (data as TeachingLoadDetailRow[]).map((row, idx) => [
      idx + 1,
      `${row.last_name} ${row.first_name} ${row.patronymic || ''}`,
      positionLabels[row.position_type] || row.position_type || '—',
      row.employee_id || '—',
      row.specialty || '—',
      row.assessment_type || '—',
      row.assessment_score ?? '—',
      row.grade_level ?? '—',
      row.section || '—',
      row.subject_name || '—',
      row.umumi_hours ?? 0,
      row.individual_school_hours ?? 0,
      row.home_education_hours ?? 0,
      row.special_education_hours ?? 0,
      row.extracurricular_hours ?? 0,
      row.club_hours ?? 0,
      row.total_hours ?? 0
    ]);

    await exportToExcelUniversal('Ders_Bolgusu_Detalli', 'Dərs Bölgüsü (Detallı)', headers, exportData, metadata, [5, 25, 20, 15, 20, 15, 10, 8, 8, 20, 8, 8, 8, 8, 10, 8, 10]);
  };

  const rawRows: TeachingLoadDetailRow[] = Array.isArray(data) ? data : [];
  
  const rows = React.useMemo(() => {
    if (!searchTerm) return rawRows;
    const s = searchTerm.toLowerCase();
    return rawRows.filter(r => 
      `${r.first_name} ${r.last_name} ${r.patronymic || ''}`.toLowerCase().includes(s) ||
      r.subject_name?.toLowerCase().includes(s) ||
      r.employee_id?.toLowerCase().includes(s) ||
      r.specialty?.toLowerCase().includes(s)
    );
  }, [rawRows, searchTerm]);

  if (!institutionId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-slate-500">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">Müəssisə seçilməyib</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12 gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Yüklənir...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-slate-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-300" />
            <p className="text-sm text-red-600">Məlumat yüklənərkən xəta baş verdi</p>
          </div>
        </CardContent>
      </Card>
    );
  }



  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-slate-500">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">Dərs yükü məlumatı tapılmadı</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2 px-1">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <BookOpen size={16} className="text-indigo-500" />
          DETALLI DƏRS BÖLGÜSÜ SİYAHISI
        </h4>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Müəllim, fənn və ya ixtisas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-emerald-600 border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 transition-all shadow-sm"
          >
            <Download size={16} /> EKSPORT (XLSX)
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2.5 text-left font-semibold text-slate-700 whitespace-nowrap min-w-[200px]">
              Müəllim Soyadı, Adı, Ata adı
            </th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Vəzifəsi</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Müəllim UTİS kodu</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Müəllimin əsas ixtisası</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Qiymətləndirmə növü</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Qiymət balı</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Sinif səviyyəsi</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Sinif indeksi</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Tədris etdiyi Fənn</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Dərs yükü (ümumi təhsil)</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Fərdi təhsil (məktəbdə)</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Evdə təhsil</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Xüsusi təhsil</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Dərsdənkənar məşğələ</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Dərnək</th>
            <th className="px-3 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">Ümumi dərs yükü</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.id ?? idx}
              className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/40 transition-colors`}
            >
              <td className="sticky left-0 z-10 bg-inherit px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                {[row.last_name, row.first_name, row.patronymic].filter(Boolean).join(' ') || '—'}
              </td>
              <td className="px-3 py-2 text-center text-slate-600 whitespace-nowrap">
                {positionLabels[row.position_type] || row.position_type || '—'}
              </td>
              <td className="px-3 py-2 text-center font-mono text-slate-600 whitespace-nowrap">
                {row.employee_id || '—'}
              </td>
              <td className="px-3 py-2 text-center text-slate-600 whitespace-nowrap">
                {row.specialty || '—'}
              </td>
              <td className="px-3 py-2 text-center text-slate-600 whitespace-nowrap">
                {row.assessment_type || '—'}
              </td>
              <td className="px-3 py-2 text-center font-bold text-slate-700">
                {row.assessment_score ?? '—'}
              </td>
              <td className="px-3 py-2 text-center font-semibold text-slate-700">
                {row.grade_level ?? '—'}
              </td>
              <td className="px-3 py-2 text-center font-semibold text-slate-700">
                {row.section || '—'}
              </td>
              <td className="px-3 py-2 text-center text-slate-700 whitespace-nowrap">
                {row.subject_name || '—'}
              </td>
              <td className="px-3 py-2 text-center font-bold text-blue-700">
                {row.umumi_hours ?? 0}
              </td>
              <td className="px-3 py-2 text-center text-slate-600">
                {row.individual_school_hours ?? 0}
              </td>
              <td className="px-3 py-2 text-center text-slate-600">
                {row.home_education_hours ?? 0}
              </td>
              <td className="px-3 py-2 text-center text-slate-600">
                {row.special_education_hours ?? 0}
              </td>
              <td className="px-3 py-2 text-center font-bold text-amber-700">
                {row.extracurricular_hours ?? 0}
              </td>
              <td className="px-3 py-2 text-center font-bold text-purple-700">
                {row.club_hours ?? 0}
              </td>
              <td className="px-3 py-2 text-center">
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  {row.total_hours ?? 0}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100/90 font-bold text-slate-950 border-t-2 border-slate-300 h-14">
            <td className="sticky left-0 z-10 bg-slate-100/90 px-3 py-3 font-black uppercase text-sm tracking-widest text-slate-600">
              YEKUN CƏM:
            </td>
            <td colSpan={8} className="px-3 py-3 text-right text-slate-500 font-black text-sm">Bu görünüş üzrə cəmlər:</td>
            <td className="px-3 py-3 text-center text-blue-800 tabular-nums font-black text-sm">
              {(() => {
                const total = rows.reduce((acc, r) => acc + (Number(r.umumi_hours) || 0), 0);
                return total % 1 === 0 ? total.toString() : total.toFixed(1);
              })()}
            </td>
            <td className="px-3 py-3 text-center text-slate-700 tabular-nums font-black text-sm">
              {(() => {
                const total = rows.reduce((acc, r) => acc + (Number(r.individual_school_hours) || 0), 0);
                return total % 1 === 0 ? total.toString() : total.toFixed(1);
              })()}
            </td>
            <td className="px-3 py-3 text-center text-slate-700 tabular-nums font-black text-sm">
              {(() => {
                const total = rows.reduce((acc, r) => acc + (Number(r.home_education_hours) || 0), 0);
                return total % 1 === 0 ? total.toString() : total.toFixed(1);
              })()}
            </td>
            <td className="px-3 py-3 text-center text-slate-700 tabular-nums font-black text-sm">
              {(() => {
                const total = rows.reduce((acc, r) => acc + (Number(r.special_education_hours) || 0), 0);
                return total % 1 === 0 ? total.toString() : total.toFixed(1);
              })()}
            </td>
            <td className="px-3 py-3 text-center text-amber-800 tabular-nums font-black text-sm">
              {(() => {
                const total = rows.reduce((acc, r) => acc + (Number(r.extracurricular_hours) || 0), 0);
                return total % 1 === 0 ? total.toString() : total.toFixed(1);
              })()}
            </td>
            <td className="px-3 py-3 text-center text-purple-800 tabular-nums font-black text-sm">
              {(() => {
                const total = rows.reduce((acc, r) => acc + (Number(r.club_hours) || 0), 0);
                return total % 1 === 0 ? total.toString() : total.toFixed(1);
              })()}
            </td>
            <td className="px-3 py-3 text-center">
              <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-indigo-600 text-white font-black text-sm shadow-lg shadow-indigo-100 tabular-nums min-w-[3rem]">
                {(() => {
                  const total = rows.reduce((acc, r) => acc + (Number(r.total_hours) || 0), 0);
                  return total % 1 === 0 ? total.toString() : total.toFixed(1);
                })()}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
    </div>
  );
};
