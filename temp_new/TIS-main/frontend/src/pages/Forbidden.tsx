import { ShieldOff, ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Forbidden = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-6 rounded-full bg-destructive/10">
            <ShieldOff className="h-16 w-16 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-destructive">403</h1>
          <h2 className="text-2xl font-semibold">Giriş qadağandır</h2>
          <p className="text-muted-foreground">
            Bu səhifəyə daxil olmaq üçün lazımi icazəniz yoxdur.
          </p>
          {currentUser && (
            <p className="text-sm text-muted-foreground">
              Cari rol:{" "}
              <span className="font-medium text-foreground">
                {currentUser.role}
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Geri qayıt
          </Button>
          <Button onClick={() => navigate("/")} className="gap-2">
            <Home className="h-4 w-4" />
            Ana səhifə
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
