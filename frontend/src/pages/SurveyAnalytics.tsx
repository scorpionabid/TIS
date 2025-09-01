import { SurveyAnalyticsDashboard } from "@/components/analytics/SurveyAnalyticsDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle } from "lucide-react";

export default function SurveyAnalytics() {
  const { currentUser } = useAuth();

  // Security check - only administrative roles can access analytics
  if (!currentUser || !['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'].includes(currentUser.role)) {
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
      <SurveyAnalyticsDashboard />
    </div>
  );
}