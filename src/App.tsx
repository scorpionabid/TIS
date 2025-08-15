import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import Layout from "./components/layout/Layout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Users from "./pages/Users";
import Roles from "./pages/Roles";
import Departments from "./pages/Departments";
import Institutions from "./pages/Institutions";
import Preschools from "./pages/Preschools";
import Regions from "./pages/Regions";
import Sectors from "./pages/Sectors";
import Hierarchy from "./pages/Hierarchy";
import Surveys from "./pages/Surveys";
import SurveyApproval from "./pages/SurveyApproval";
import SurveyResults from "./pages/SurveyResults";
import SurveyArchive from "./pages/SurveyArchive";
import SurveyResponse from "./pages/SurveyResponse";
import Tasks from "./pages/Tasks";
import Documents from "./pages/Documents";
import Links from "./pages/Links";
import Reports from "./pages/Reports";
import InstitutionTypesManagement from "./pages/InstitutionTypesManagement";
import Notifications from "./pages/Notifications";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import AuditLogs from "./pages/AuditLogs";
import Performance from "./pages/Performance";
import SchoolWorkload from "./pages/SchoolWorkload";
import SchoolSchedules from "./pages/SchoolSchedules";
import SchoolAttendance from "./pages/SchoolAttendance";
import AssessmentTypes from "./pages/AssessmentTypes";
import AssessmentResults from "./pages/AssessmentResults";
import AssessmentEntry from "./pages/AssessmentEntry";
import RegionAdminIndex from "./pages/regionadmin/RegionAdminIndex";
import RegionAdminUsers from "./pages/regionadmin/RegionAdminUsers";
import RegionAdminSectors from "./pages/regionadmin/RegionAdminSectors";
import { useState } from "react";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Login Page Component
const LoginPage = () => {
  const { login, loading, isAuthenticated } = useAuth();
  const [loginError, setLoginError] = useState<string | undefined>();
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  const handleLogin = async (email: string, password: string) => {
    try {
      setLoginError(undefined);
      const success = await login({ email, password });
      if (!success) {
        setLoginError('Giriş məlumatları yanlışdır');
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Giriş xətası');
    }
  };
  
  return (
    <LoginForm 
      onLogin={handleLogin} 
      isLoading={loading} 
      error={loginError} 
    />
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Index />} />
              <Route path="users" element={<Users />} />
              <Route path="roles" element={<Roles />} />
              <Route path="departments" element={<Departments />} />
              <Route path="institutions" element={<Institutions />} />
              <Route path="preschools" element={<Preschools />} />
              <Route path="regions" element={<Regions />} />
              <Route path="sectors" element={<Sectors />} />
              <Route path="hierarchy" element={<Hierarchy />} />
              <Route path="surveys" element={<Surveys />} />
              <Route path="survey-response/:surveyId" element={<SurveyResponse />} />
              <Route path="survey-response/:surveyId/:responseId" element={<SurveyResponse />} />
              <Route path="survey-approval" element={<SurveyApproval />} />
              <Route path="survey-results" element={<SurveyResults />} />
              <Route path="survey-archive" element={<SurveyArchive />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="documents" element={<Documents />} />
              <Route path="links" element={<Links />} />
              <Route path="reports" element={<Reports />} />
              <Route path="institution-types-management" element={<InstitutionTypesManagement />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="performance" element={<Performance />} />
              <Route path="school/workload" element={<SchoolWorkload />} />
              <Route path="school/schedules" element={<SchoolSchedules />} />
              <Route path="school/attendance" element={<SchoolAttendance />} />
              
              {/* Assessment Management Routes */}
              <Route path="assessments/types" element={<AssessmentTypes />} />
              <Route path="assessments/results" element={<AssessmentResults />} />
              <Route path="assessments/entry" element={<AssessmentEntry />} />
              
              {/* RegionAdmin Routes */}
              <Route path="regionadmin" element={<RegionAdminIndex />} />
              <Route path="regionadmin/users/operators" element={<RegionAdminUsers />} />
              <Route path="regionadmin/users/sektoradmins" element={<RegionAdminUsers />} />
              <Route path="regionadmin/users/schooladmins" element={<RegionAdminUsers />} />
              <Route path="regionadmin/users/teachers" element={<RegionAdminUsers />} />
              <Route path="regionadmin/sectors" element={<RegionAdminSectors />} />
              <Route path="regionadmin/schools" element={<div className="p-6"><h1>Regional Schools</h1><p>Hazırlanmaqdadır...</p></div>} />
              <Route path="regionadmin/hierarchy" element={<div className="p-6"><h1>Regional Hierarchy</h1><p>Hazırlanmaqdadır...</p></div>} />
              <Route path="regionadmin/tasks/*" element={<div className="p-6"><h1>Regional Tasks</h1><p>Hazırlanmaqdadır...</p></div>} />
              <Route path="regionadmin/surveys/*" element={<div className="p-6"><h1>Regional Surveys</h1><p>Hazırlanmaqdadır...</p></div>} />
              <Route path="regionadmin/documents/*" element={<div className="p-6"><h1>Regional Documents</h1><p>Hazırlanmaqdadır...</p></div>} />
              <Route path="regionadmin/reports/*" element={<div className="p-6"><h1>Regional Reports</h1><p>Hazırlanmaqdadır...</p></div>} />
              <Route path="regionadmin/settings/*" element={<div className="p-6"><h1>Regional Settings</h1><p>Hazırlanmaqdadır...</p></div>} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
