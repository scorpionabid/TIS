import { SurveyDataExporter } from "@/components/export/SurveyDataExporter";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle } from "lucide-react";
import { useModuleAccess } from "@/hooks/useModuleAccess";

export default function SurveyExport() {
  const { currentUser } = useAuth();
  const surveyAccess = useModuleAccess('surveys');

  // Security check - only administrative roles can access export functionality
  if (!currentUser || !surveyAccess.canView) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız idarəçi rolları daxil ola bilər
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Survey Export</h1>
        <p className="text-muted-foreground">
          Survey məlumatlarını müxtəlif formatlarda export edin və təhlil üçün hazırlayın
        </p>
      </div>
      
      <SurveyDataExporter />
    </div>
  );
}
