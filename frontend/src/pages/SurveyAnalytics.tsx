import { SurveyAnalyticsDashboard } from "@/components/analytics/SurveyAnalyticsDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle } from "lucide-react";
import { useModuleAccess } from "@/hooks/useModuleAccess";

export default function SurveyAnalytics() {
  const { currentUser } = useAuth();
  const surveyAccess = useModuleAccess('surveys');

  // Security check - only administrative roles can access analytics
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
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4">
      <SurveyAnalyticsDashboard />
    </div>
  );
}
