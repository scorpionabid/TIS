import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Clock, Users, GraduationCap } from 'lucide-react';
import { GradeSubject } from '../../types/curriculum';

interface CurriculumStatisticsProps {
  subjects: GradeSubject[];
  title?: string;
}

const CurriculumStatistics: React.FC<CurriculumStatisticsProps> = ({ subjects, title = 'Kurikulum İcmalı' }) => {
  // Total hours across all programs
  const totalWeeklyHours = subjects.reduce((sum, s) => sum + (s.weekly_hours || 0), 0);
  const totalCalculatedHours = subjects.reduce((sum, s) => sum + (s.calculated_hours || 0), 0);
  const totalSubjects = new Set(subjects.map(s => s.subject_id)).size;

  // Breakdown by education type
  const getHoursByType = (type: string) => 
    subjects.filter(s => (s.education_type || 'umumi') === type).reduce((sum, s) => sum + (s.weekly_hours || 0), 0);

  const umumiHours = getHoursByType('umumi');
  const ferdiHours = getHoursByType('ferdi');
  const evdeHours = getHoursByType('evde');
  const xususiHours = getHoursByType('xususi');

  const stats = [
    { label: 'Ümumi təhsil', hours: umumiHours, color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
    { label: 'Fərdi təhsil', hours: ferdiHours, color: 'bg-emerald-500', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' },
    { label: 'Evdə təhsil', hours: evdeHours, color: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
    { label: 'Xüsusi təhsil', hours: xususiHours, color: 'bg-rose-500', bgColor: 'bg-rose-50', textColor: 'text-rose-700' },
  ];

  // Activity type breakdown
  const teachingHours = subjects.filter(s => s.is_teaching_activity).reduce((sum, s) => sum + (s.weekly_hours || 0), 0);
  const extracurricularHours = subjects.filter(s => s.is_extracurricular).reduce((sum, s) => sum + (s.weekly_hours || 0), 0);
  const clubHours = subjects.filter(s => s.is_club).reduce((sum, s) => sum + (s.weekly_hours || 0), 0);

  const activityStats = [
    { label: 'Dərs', hours: teachingHours, color: 'bg-slate-800' },
    { label: 'Məşğələ', hours: extracurricularHours, color: 'bg-indigo-500' },
    { label: 'Dərnək', hours: clubHours, color: 'bg-violet-400' },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden rounded-2xl">
        <CardHeader className="pb-2 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-400">
            <GraduationCap className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          <div>
            <div className="flex flex-col items-center justify-center py-2">
              <div className="text-4xl font-black text-slate-800 tracking-tighter">{totalWeeklyHours}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cəmi Həftəlik Saat</div>
            </div>

            <div className="mt-8 space-y-5">
              {stats.map((stat) => (
                <div key={stat.label} className="group">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[11px] font-bold text-slate-500">{stat.label}</span>
                    <span className={`text-xs font-black ${stat.textColor}`}>{stat.hours} saat</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${stat.color} transition-all duration-500 ease-out rounded-full`}
                      style={{ width: `${totalWeeklyHours > 0 ? (stat.hours / totalWeeklyHours) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Fəaliyyət Növləri</h4>
            <div className="grid grid-cols-3 gap-2">
              {activityStats.map((stat) => (
                <div key={stat.label} className="bg-slate-50 rounded-xl p-3 text-center transition-all hover:bg-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{stat.label}</p>
                  <p className="text-sm font-black text-slate-700">{stat.hours}</p>
                  <div className="mt-1.5 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${stat.color} rounded-full`}
                      style={{ width: `${totalWeeklyHours > 0 ? (stat.hours / totalWeeklyHours) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        <Card className="border-slate-100 shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
              <Clock className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hesablanmış</p>
              <p className="text-lg font-black text-slate-700 leading-none">{totalCalculatedHours} <span className="text-[10px] text-slate-400 uppercase">saat</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fənn Sayı</p>
              <p className="text-lg font-black text-slate-700 leading-none">{totalSubjects} <span className="text-[10px] text-slate-400 uppercase">ədəd</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CurriculumStatistics;
