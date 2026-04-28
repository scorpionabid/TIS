import { AlertTriangle } from "lucide-react";

export function SurveyAccessRestricted() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
        <p className="text-muted-foreground">
          Bu səhifəyə daxil olmaq üçün səlahiyyətiniz yoxdur.
        </p>
      </div>
    </div>
  );
}
