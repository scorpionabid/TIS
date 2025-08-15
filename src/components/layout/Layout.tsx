import { Outlet, useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { ModernSidebar } from "@/components/layout/ModernSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { HeaderContainer } from "@/components/layout/components/Header/HeaderContainer";
import { Breadcrumbs } from "@/components/layout/components/Header/Breadcrumbs";
import { PageContainer } from "@/components/layout/components/Container/PageContainer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutProvider } from "@/contexts/LayoutContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { TooltipProvider } from "@/components/ui/tooltip";

const Layout = () => {
  const { isAuthenticated, currentUser, login, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (email: string, password: string) => {
    const success = await login(email, password);
    
    if (success) {
      navigate("/");
      toast({
        title: "Uğurla giriş etdiniz",
        description: `Xoş gəlmisiniz, ${currentUser?.name}`,
      });
    } else {
      toast({
        title: "Giriş xətası",
        description: "E-poçt və ya şifrə yanlışdır",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    toast({
      title: "Sistemdən çıxış",
      description: "Uğurla çıxış etdiniz",
    });
  };

  const getDashboardTitle = () => {
    if (!currentUser) return "Dashboard";
    
    switch (currentUser.role) {
      case "SuperAdmin":
        return "Sistem İdarəetməsi";
      case "RegionAdmin":
        return `${currentUser.region} Regional İdarəetmə`;
      default:
        return "İdarəetmə Paneli";
    }
  };

  const getDashboardSubtitle = () => {
    if (!currentUser) return "";
    
    switch (currentUser.role) {
      case "SuperAdmin":
        return "Azərbaycan Təhsil İdarəetmə Sistemi - Ana Panel";
      case "RegionAdmin":
        return `${currentUser.region} regional təhsil idarəsi məlumat sistemi`;
      default:
        return "Azərbaycan Təhsil İdarəetmə Sistemi";
    }
  };

  // Show login form if not authenticated
  if (!isAuthenticated || !currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Show main dashboard layout
  return (
    <TooltipProvider>
      <LayoutProvider>
        <NavigationProvider>
          <div className="flex h-screen bg-background w-full">
            <ModernSidebar onLogout={handleLogout} />
            
            <div className="flex-1 flex flex-col overflow-hidden">
              <HeaderContainer>
                <div className="flex flex-col space-y-1 flex-1 min-w-0">
                  <DashboardHeader
                    title={getDashboardTitle()}
                    subtitle={getDashboardSubtitle()}
                    notificationCount={5}
                    onLogout={handleLogout}
                  />
                  <Breadcrumbs />
                </div>
              </HeaderContainer>
              
              <main className="flex-1 overflow-y-auto bg-surface">
                <PageContainer>
                  <Outlet />
                </PageContainer>
              </main>
            </div>
          </div>
        </NavigationProvider>
      </LayoutProvider>
    </TooltipProvider>
  );
};

export default Layout;