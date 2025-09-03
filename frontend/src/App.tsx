import { lazy, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import WebSocketProvider from "@/contexts/WebSocketContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { LazyWrapper } from "@/components/common/LazyWrapper";
import Layout from "./components/layout/Layout";
import NotFound from "./pages/NotFound";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Users = lazy(() => import("./pages/Users"));
const Students = lazy(() => import("./pages/Students"));
const Roles = lazy(() => import("./pages/Roles"));
const Departments = lazy(() => import("./pages/Departments"));
const Institutions = lazy(() => import("./pages/Institutions"));
const Preschools = lazy(() => import("./pages/Preschools"));
const Regions = lazy(() => import("./pages/Regions"));
const Sectors = lazy(() => import("./pages/Sectors"));
const Hierarchy = lazy(() => import("./pages/Hierarchy"));
const Surveys = lazy(() => import("./pages/Surveys"));
const SurveyResults = lazy(() => import("./pages/SurveyResults"));
const SurveyArchive = lazy(() => import("./pages/SurveyArchive"));
const SurveyResponse = lazy(() => import("./pages/SurveyResponse"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Documents = lazy(() => import("./pages/Documents"));
const Links = lazy(() => import("./pages/Links"));
const Reports = lazy(() => import("./pages/Reports"));
const InstitutionTypesManagement = lazy(() => import("./pages/InstitutionTypesManagement"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Performance = lazy(() => import("./pages/Performance"));
const SchoolWorkload = lazy(() => import("./pages/SchoolWorkload"));
const SchoolSchedules = lazy(() => import("./pages/SchoolSchedules"));
const AssessmentTypes = lazy(() => import("./pages/AssessmentTypes"));
const AssessmentResults = lazy(() => import("./pages/AssessmentResults"));
const AssessmentEntry = lazy(() => import("./pages/AssessmentEntry"));
const SubjectManagement = lazy(() => import("./pages/SubjectManagement"));
const Approvals = lazy(() => import("./pages/Approvals"));
const SurveyAnalytics = lazy(() => import("./pages/SurveyAnalytics"));
const SurveyExport = lazy(() => import("./pages/SurveyExport"));

// RegionAdmin pages
const RegionAdminIndex = lazy(() => import("./pages/regionadmin/RegionAdminIndex"));
const RegionAdminUsers = lazy(() => import("./pages/regionadmin/RegionAdminUsers"));
const RegionAdminSectors = lazy(() => import("./pages/regionadmin/RegionAdminSectors"));
const RegionSchedules = lazy(() => import("./pages/regionadmin/RegionSchedules"));

// School pages  
const SchoolSurveys = lazy(() => import("./pages/school/SchoolSurveys"));
const SchoolTasks = lazy(() => import("./pages/school/SchoolTasks"));
const SchoolTeachers = lazy(() => import("./pages/school/SchoolTeachers"));
const SchoolClasses = lazy(() => import("./pages/school/SchoolClasses"));
const SchoolAttendanceRecord = lazy(() => import("./pages/school/SchoolAttendanceRecord"));
const SchoolGradebook = lazy(() => import("./pages/school/SchoolGradebook"));
const SchoolAssessments = lazy(() => import("./pages/SchoolAssessments"));
const AttendanceReports = lazy(() => import("./pages/AttendanceReports"));
const SchoolScheduleManagement = lazy(() => import("./pages/school/SchoolScheduleManagement"));
const BulkAttendanceEntry = lazy(() => import("./pages/school/BulkAttendanceEntry"));

// Teacher pages
const TeacherSchedule = lazy(() => import("./pages/teacher/TeacherSchedule"));

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
      <WebSocketProvider>
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
              <Route index element={<LazyWrapper><Index /></LazyWrapper>} />
              <Route path="users" element={<LazyWrapper><Users /></LazyWrapper>} />
              <Route path="students" element={<LazyWrapper><Students /></LazyWrapper>} />
              <Route path="roles" element={<LazyWrapper><Roles /></LazyWrapper>} />
              <Route path="departments" element={<LazyWrapper><Departments /></LazyWrapper>} />
              <Route path="institutions" element={<LazyWrapper><Institutions /></LazyWrapper>} />
              <Route path="preschools" element={<LazyWrapper><Preschools /></LazyWrapper>} />
              <Route path="regions" element={<LazyWrapper><Regions /></LazyWrapper>} />
              <Route path="sectors" element={<LazyWrapper><Sectors /></LazyWrapper>} />
              <Route path="hierarchy" element={<LazyWrapper><Hierarchy /></LazyWrapper>} />
              <Route path="surveys" element={<LazyWrapper><Surveys /></LazyWrapper>} />
              <Route path="survey-response/:surveyId" element={<LazyWrapper><SurveyResponse /></LazyWrapper>} />
              <Route path="survey-response/:surveyId/:responseId" element={<LazyWrapper><SurveyResponse /></LazyWrapper>} />
              <Route path="approvals" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={['superadmin', 'regionadmin', 'sektoradmin']}>
                    <Approvals />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="survey-results" element={<LazyWrapper><SurveyResults /></LazyWrapper>} />
              <Route path="survey-archive" element={<LazyWrapper><SurveyArchive /></LazyWrapper>} />
              <Route path="survey-analytics" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin']}>
                    <SurveyAnalytics />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="survey-export" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin']}>
                    <SurveyExport />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="tasks" element={<LazyWrapper><Tasks /></LazyWrapper>} />
              <Route path="documents" element={<LazyWrapper><Documents /></LazyWrapper>} />
              <Route path="links" element={<LazyWrapper><Links /></LazyWrapper>} />
              <Route path="reports" element={<LazyWrapper><Reports /></LazyWrapper>} />
              <Route path="subjects" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={['superadmin', 'regionadmin']}>
                    <SubjectManagement />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="institution-types-management" element={<LazyWrapper><InstitutionTypesManagement /></LazyWrapper>} />
              <Route path="notifications" element={<LazyWrapper><Notifications /></LazyWrapper>} />
              <Route path="analytics" element={<LazyWrapper><Analytics /></LazyWrapper>} />
              <Route path="settings" element={<LazyWrapper><Settings /></LazyWrapper>} />
              <Route path="audit-logs" element={<LazyWrapper><AuditLogs /></LazyWrapper>} />
              <Route path="performance" element={<LazyWrapper><Performance /></LazyWrapper>} />
              <Route path="school/workload" element={<LazyWrapper><SchoolWorkload /></LazyWrapper>} />
              <Route path="school/schedules" element={<LazyWrapper><SchoolSchedules /></LazyWrapper>} />
              
              {/* Assessment Management Routes */}
              <Route path="assessments/types" element={<LazyWrapper><AssessmentTypes /></LazyWrapper>} />
              <Route path="assessments/results" element={<LazyWrapper><AssessmentResults /></LazyWrapper>} />
              <Route path="assessments/entry" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'teacher']}>
                    <AssessmentEntry />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              
              
              {/* RegionAdmin Routes */}
              <Route path="regionadmin" element={<LazyWrapper><RegionAdminIndex /></LazyWrapper>} />
              <Route path="regionadmin/users/operators" element={<LazyWrapper><RegionAdminUsers /></LazyWrapper>} />
              <Route path="regionadmin/users/sektoradmins" element={<LazyWrapper><RegionAdminUsers /></LazyWrapper>} />
              <Route path="regionadmin/users/schooladmins" element={<LazyWrapper><RegionAdminUsers /></LazyWrapper>} />
              <Route path="regionadmin/users/teachers" element={<LazyWrapper><RegionAdminUsers /></LazyWrapper>} />
              <Route path="regionadmin/sectors" element={<LazyWrapper><RegionAdminSectors /></LazyWrapper>} />
              <Route path="regionadmin/schools" element={<div className="p-6"><h1>Regional Schools</h1><p>Hazırlanmaqdadır...</p></div>} />
              <Route path="regionadmin/hierarchy" element={<div className="p-6"><h1>Regional Hierarchy</h1><p>Hazırlanmaqdadır...</p></div>} />
              <Route path="regionadmin/tasks/*" element={<div className="p-6"><h1>Regional Tasks</h1><p>Hazırlanmaqdadır...</p></div>} />
              <Route path="regionadmin/surveys/*" element={<div className="p-6"><h1>Regional Surveys</h1><p>Hazırlanmaqdadır...</p></div>} />
              <Route path="regionadmin/documents/*" element={<div className="p-6"><h1>Regional Documents</h1><p>Hazırlanmaqdadır...</p></div>} />
              <Route path="regionadmin/reports/*" element={<div className="p-6"><h1>Regional Reports</h1><p>Hazırlanmaqdadır...</p></div>} />
              <Route path="regionadmin/settings/*" element={<div className="p-6"><h1>Regional Settings</h1><p>Hazırlanmaqdadır...</p></div>} />
              <Route path="regionadmin/schedules" element={<LazyWrapper><RegionSchedules /></LazyWrapper>} />
              
              {/* SchoolAdmin Routes */}
              <Route path="school/surveys" element={<LazyWrapper><SchoolSurveys /></LazyWrapper>} />
              <Route path="school/tasks" element={<LazyWrapper><SchoolTasks /></LazyWrapper>} />
              <Route path="school/students" element={<Navigate to="/students" replace />} />
              <Route path="school/teachers" element={<LazyWrapper><SchoolTeachers /></LazyWrapper>} />
              <Route path="school/classes" element={<LazyWrapper><SchoolClasses /></LazyWrapper>} />
              <Route path="school/attendance" element={<LazyWrapper><SchoolAttendanceRecord /></LazyWrapper>} />
              <Route path="school/attendance/bulk" element={<LazyWrapper><BulkAttendanceEntry /></LazyWrapper>} />
              <Route path="school/attendance/reports" element={<LazyWrapper><AttendanceReports /></LazyWrapper>} />
              <Route path="school/assessments" element={<LazyWrapper><SchoolAssessments /></LazyWrapper>} />
              <Route path="school/assessments/reports" element={<LazyWrapper><AssessmentResults /></LazyWrapper>} />
              <Route path="school/gradebook" element={<LazyWrapper><SchoolGradebook /></LazyWrapper>} />
              <Route path="school/schedule-management" element={<LazyWrapper><SchoolScheduleManagement /></LazyWrapper>} />
              
              {/* Teacher Routes */}
              <Route path="teacher/schedule" element={<LazyWrapper><TeacherSchedule /></LazyWrapper>} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </WebSocketProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
