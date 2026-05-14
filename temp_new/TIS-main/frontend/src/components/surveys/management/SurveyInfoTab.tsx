import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ClipboardList, 
  Calendar, 
  Clock, 
  Users, 
  Building, 
  MapPin 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Survey } from '@/services/surveys';

interface SurveyInfoTabProps {
  selectedSurvey: Survey;
}

export const SurveyInfoTab: React.FC<SurveyInfoTabProps> = ({ selectedSurvey }) => {
  return (
    <div className="p-6">
      <div className="max-w-4xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Metadata Card */}
          <Card className="border-slate-100 shadow-none">
            <CardHeader className="pb-3 bg-slate-50/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                Əsas Məlumatlar
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" /> Yaradılma tarixi
                </span>
                <span className="font-medium">
                  {selectedSurvey.created_at ? new Date(selectedSurvey.created_at).toLocaleDateString('az-AZ') : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Müddət
                </span>
                <span className="font-medium text-blue-600">
                  {selectedSurvey.start_date ? new Date(selectedSurvey.start_date).toLocaleDateString('az-AZ') : 'Dərhal'} - 
                  {selectedSurvey.end_date ? new Date(selectedSurvey.end_date).toLocaleDateString('az-AZ') : 'Bitmir'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> Yaradan
                </span>
                <span className="font-medium">
                  {(selectedSurvey as any).creator?.full_name || (selectedSurvey as any).creator?.name || 'Sistem'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <Building className="h-3.5 w-3.5" /> Müəssisə
                </span>
                <span className="font-medium truncate max-w-[180px]">
                  {(selectedSurvey as any).institution?.name || (selectedSurvey as any).institution?.short_name || 'Təhsil Nazirliyi'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Targeting Card */}
          <Card className="border-slate-100 shadow-none">
            <CardHeader className="pb-3 bg-slate-50/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500" />
                Hədəf Kütləsi
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex justify-between items-start text-sm">
                <span className="text-slate-500">Müəssisə sayı</span>
                <span className="font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                  {selectedSurvey.target_institutions?.length || 0} müəssisə
                </span>
              </div>
              <div className="flex justify-between items-start text-sm">
                <span className="text-slate-500">Regionlar</span>
                <span className="font-medium text-right italic text-slate-600">
                  Bakı, Sumqayıt, Gəncə...
                </span>
              </div>
              <div className="flex justify-between items-start text-sm">
                <span className="text-slate-500">Status</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                  selectedSurvey.status === 'published' || selectedSurvey.status === 'active' ? "bg-emerald-100 text-emerald-700" :
                  selectedSurvey.status === 'draft' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                )}>
                  {selectedSurvey.status}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
