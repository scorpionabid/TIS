import { Outlet, useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { ModernSidebar } from "@/components/layout/ModernSidebar";
import { SidebarPreferences } from "@/components/layout/SidebarPreferences";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { HeaderContainer } from "@/components/layout/components/Header/HeaderContainer";
import { Breadcrumbs } from "@/components/layout/components/Header/Breadcrumbs";
import { PageContainer } from "@/components/layout/components/Container/PageContainer";
import { MobileBottomNav } from "@/components/layout/components/Navigation/MobileBottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { USER_ROLES } from "@/constants/roles";

const MainLayout = () => {
  const { currentUser, logout } = useAuth();
  const { 
    preferencesModalOpen, 
    tempPreferences, 
    setPreferencesModalOpen,
    setTempPreferences,
    savePreferences,
    resetPreferences 
  } = useLayout();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
    toast({
      title: "Sistemdən çıxış",
      description: "Uğurla çıxış etdiniz",
    });
  };

  const getRegionName = () => {
    if (!currentUser?.region) return undefined;

    if (typeof currentUser.region === "string") {
      return currentUser.region;
    }

    return currentUser.region.name;
  };

  const getDashboardTitle = () => {
    if (!currentUser) return "Dashboard";

    const normalizedRole = typeof currentUser.role === "string" 
      ? currentUser.role.toLowerCase() 
      : currentUser.role;
    
    switch (normalizedRole) {
      case USER_ROLES.SUPERADMIN:
        return "Sistem İdarəetməsi";
      case USER_ROLES.REGIONADMIN: {
        const regionName = getRegionName();
        return regionName ? `${regionName} Regional İdarəetmə` : "Regional İdarəetmə";
      }
      default:
        return "İdarəetmə Paneli";
    }
  };

  const getDashboardSubtitle = () => {
    if (!currentUser) return "";

    const normalizedRole = typeof currentUser.role === "string" 
      ? currentUser.role.toLowerCase() 
      : currentUser.role;
    
    switch (normalizedRole) {
      case USER_ROLES.SUPERADMIN:
        return "Azərbaycan Təhsil İdarəetmə Sistemi - Ana Panel";
      case USER_ROLES.REGIONADMIN: {
        const regionName = getRegionName();
        return regionName 
          ? `${regionName} regional təhsil idarəsi məlumat sistemi` 
          : "Regional təhsil idarəsi məlumat sistemi";
      }
      default:
        return "Azərbaycan Təhsil İdarəetmə Sistemi";
    }
  };



  // Show main dashboard layout
  return (
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
          
          <main className="flex-1 overflow-y-auto bg-surface pb-16 md:pb-0">
            <PageContainer padding="none" className="px-2 sm:px-3 lg:px-4 pt-3 lg:pt-4">
              <Outlet />
            </PageContainer>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
        
        {/* Sidebar Preferences Modal */}
        <SidebarPreferences
          open={preferencesModalOpen}
          onOpenChange={setPreferencesModalOpen}
          preferences={tempPreferences}
          onPreferencesChange={setTempPreferences}
          onSave={savePreferences}
          onReset={resetPreferences}
        />
      </div>
    </NavigationProvider>
  );
};

const Layout = () => {
  const { isAuthenticated, currentUser, login, logout, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (email: string, password: string) => {
    const success = await login({ email, password });
    
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

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated || !currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Show main dashboard layout wrapped with providers
  return (
    <TooltipProvider>
      <LayoutProvider>
        <MainLayout />
      </LayoutProvider>
    </TooltipProvider>
  );
};

export default Layout;
