import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Clock, Users, GraduationCap } from 'lucide-react';
import { GradeSubject } from '../../types/curriculum';

interface CurriculumStatisticsProps {
  subjects: GradeSubject[];
}

const CurriculumStatistics: React.FC<CurriculumStatisticsProps> = ({ subjects }) => {
  const teachingHours = subjects.filter(s => s.is_teaching_activity).reduce((sum, s) => sum + (s.weekly_hours || 0), 0);
  const extracurricularHours = subjects.filter(s => s.is_extracurricular).reduce((sum, s) => sum + (s.weekly_hours || 0), 0);
  const clubHours = subjects.filter(s => s.is_club).reduce((sum, s) => sum + (s.weekly_hours || 0), 0);
  
  const totalWeeklyHours = teachingHours + extracurricularHours + clubHours;
  const totalCalculatedHours = subjects.reduce((sum, s) => sum + (s.calculated_hours || 0), 0);
  const totalSubjects = subjects.length;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="pb-2 bg-primary/5">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Sinifin Ümumi Dərs Yükü
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-3xl font-black text-primary">{totalWeeklyHours} saat</div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center text-sm border-b pb-1">
              <span className="text-muted-foreground flex items-center gap-1">📘 Dərs:</span>
              <span className="font-bold">{teachingHours} saat</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b pb-1">
              <span className="text-muted-foreground flex items-center gap-1">📝 Dərsdənkənar məşğələ:</span>
              <span className="font-bold">{extracurricularHours} saat</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1">🎯 Dərnək:</span>
              <span className="font-bold">{clubHours} saat</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Hesablanmış Saatlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCalculatedHours} saat</div>
          <p className="text-xs text-muted-foreground mt-1">
            Qruplar nəzərə alınmaqla cəmi saat
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Fənn Sayı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSubjects}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Tədris planındakı cəmi fənnlər
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CurriculumStatistics;
