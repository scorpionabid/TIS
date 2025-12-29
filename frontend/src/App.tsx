import React, { lazy, Suspense, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DebugProvider } from "@/contexts/DebugContext";
import WebSocketProvider from "@/contexts/WebSocketContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { LazyWrapper } from "@/components/common/LazyWrapper";
import { USER_ROLES } from "@/constants/roles";
import Layout from "./components/layout/Layout";
import NotFound from "./pages/NotFound";
import { accessibilityChecker } from "@/utils/accessibility-checker";
import { EnhancedDebugPanel } from "@/components/debug/EnhancedDebugPanel";
import "@/utils/debugHelpers"; // Load debug helpers in development

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Users = lazy(() => import("./pages/Users"));
const Students = lazy(() => import("./pages/Students"));
const Roles = lazy(() => import("./pages/Roles"));
const Permissions = lazy(() => import("./pages/Permissions"));
const Departments = lazy(() => import("./pages/Departments"));
const Institutions = lazy(() => import("./pages/Institutions"));
const Preschools = lazy(() => import("./pages/Preschools"));
const Regions = lazy(() => import("./pages/Regions"));
const Sectors = lazy(() => import("./pages/Sectors"));
const Hierarchy = lazy(() => import("./pages/Hierarchy"));
const Surveys = lazy(() => import("./pages/Surveys"));
const SurveyArchive = lazy(() => import("./pages/SurveyArchive"));
const SurveyResponse = lazy(() => import("./pages/SurveyResponse"));
const Tasks = lazy(() => import("./pages/Tasks"));
const AssignedTasks = lazy(() => import("./pages/AssignedTasks"));
const ResourcesRedirect = lazy(() => import("./pages/ResourcesRedirect"));
const ResourcesLinksPage = lazy(() => import("./pages/resources/LinksPage"));
const ResourcesDocumentsPage = lazy(() => import("./pages/resources/DocumentsPage"));
const ResourcesFoldersPage = lazy(() => import("./pages/resources/FoldersPage"));
const MyResources = lazy(() => import("./pages/MyResources"));
const Reports = lazy(() => import("./pages/Reports"));
const InstitutionTypesManagement = lazy(() => import("./pages/InstitutionTypesManagement"));
const AcademicYearManagement = lazy(() => import("./pages/AcademicYearManagement"));
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
const PasswordReset = lazy(() => import("./pages/PasswordReset"));

// RegionAdmin pages
const RegionAdminIndex = lazy(() => import("./pages/regionadmin/RegionAdminIndex"));
const RegionAdminUsers = lazy(() => import("./pages/regionadmin/RegionAdminUsers"));
const RegionAdminSectors = lazy(() => import("./pages/regionadmin/RegionAdminSectors"));
const RegionSchedules = lazy(() => import("./pages/regionadmin/RegionSchedules"));
const RegionTeacherManagement = lazy(() => import("./pages/regionadmin/RegionTeacherManagement").then(m => ({ default: m.RegionTeacherManagement })));
const RegionClassManagement = lazy(() => import("./pages/regionadmin/RegionClassManagement"));
const RegionAttendanceReports = lazy(() => import("./pages/regionadmin/RegionAttendanceReports"));

// Teacher Rating pages
const RegionAdminTeacherRating = lazy(() => import("./pages/regionadmin/RegionAdminTeacherRating"));
const TeacherRatingProfile = lazy(() => import("./pages/regionadmin/TeacherRatingProfile"));
const TeacherRatingImport = lazy(() => import("./pages/regionadmin/TeacherRatingImport"));
const TeacherRatingLeaderboard = lazy(() => import("./pages/regionadmin/TeacherRatingLeaderboard"));
const TeacherRatingComparison = lazy(() => import("./pages/regionadmin/TeacherRatingComparison"));
const TeacherRatingConfiguration = lazy(() => import("./pages/regionadmin/TeacherRatingConfiguration"));
const TeacherOwnRating = lazy(() => import("./pages/teacher/TeacherOwnRating"));

// Staff Rating pages
const MyRating = lazy(() => import("./pages/staff-rating/MyRating"));
const RatingDashboard = lazy(() => import("./pages/staff-rating/RatingDashboard"));
const DirectorManagement = lazy(() => import("./pages/staff-rating/DirectorManagement"));
const RatingConfiguration = lazy(() => import("./pages/staff-rating/RatingConfiguration"));

// School pages  
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

// My Surveys pages
const PendingSurveys = lazy(() => import("./pages/my-surveys/PendingSurveys"));
const MyResponses = lazy(() => import("./pages/my-surveys/MyResponses"));

// Advanced Schedule Management pages
const ScheduleBuilderPage = lazy(() => import("./components/schedules/ScheduleBuilderPage"));
const RegionalSchedulesDashboard = lazy(() => import("./components/schedules/RegionalSchedulesDashboard"));
const ScheduleComparisonTool = lazy(() => import("./components/schedules/ScheduleComparisonTool"));

// Debug Console
const DebugConsole = lazy(() => import("./pages/DebugConsole"));

// Memory-optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce memory usage with shorter cache times
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime)
      // Reduce network requests
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      // Error handling
      retry: 1, // Reduce retry attempts
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1, // Reduce retry attempts for mutations
    },
  },
});

const REGION_ADMIN_ALLOWED_ROLES = [
  USER_ROLES.SUPERADMIN,
  USER_ROLES.REGIONADMIN,
  USER_ROLES.REGIONOPERATOR,
  USER_ROLES.SEKTORADMIN,
] as const;

// Protected Route Component  
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // Pass the current location as state so LoginPage can redirect back
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

// Login Page Component with Enhanced Error Handling
const LoginPage = () => {
  const { login, loading, isAuthenticated } = useAuth();
  const [loginError, setLoginError] = useState<string | undefined>();
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [forceForgotPassword, setForceForgotPassword] = useState(false);
  const location = useLocation();

  if (isAuthenticated) {
    // Get the intended URL from state, or default to "/"
    const intendedUrl = (location.state as any)?.from?.pathname || "/";
    return <Navigate to={intendedUrl} replace />;
  }

  // Enhanced error categorization
  const categorizeError = (error: unknown): { message: string; canRetry: boolean; isNetwork: boolean; code?: string; retryAfter?: number } => {
    const errorMessage = error instanceof Error ? error.message : 'Giriş xətası';
    const errorData = typeof error === 'object' && error !== null ? (error as any) : {};
    const derivedCode = errorData.code || errorData?.errors?.code?.[0];
    const rawRetryAfter = errorData.retryAfter ?? errorData.retry_after ?? errorData?.errors?.retry_after?.[0];
    const retryAfter = typeof rawRetryAfter === 'number' ? rawRetryAfter : rawRetryAfter ? Number(rawRetryAfter) : undefined;

    if (derivedCode === 'RATE_LIMITED') {
      return {
        message: retryAfter
          ? `Çox sayda cəhd. ${retryAfter} saniyə sonra yenidən cəhd edin.`
          : 'Çox sayda cəhd. Zəhmət olmasa bir az sonra yenidən cəhd edin.',
        canRetry: false,
        isNetwork: false,
        code: derivedCode,
        retryAfter,
      };
    }
    if (derivedCode === 'BAD_CREDENTIALS') {
      return {
        message: 'İstifadəçi adı və ya şifrə yanlışdır.',
        canRetry: false,
        isNetwork: false,
        code: derivedCode,
      };
    }
    if (derivedCode === 'ACCOUNT_INACTIVE') {
      return {
        message: errorMessage || 'Hesabınız deaktiv edilib.',
        canRetry: false,
        isNetwork: false,
        code: derivedCode,
      };
    }
    if (derivedCode === 'PASSWORD_RESET_REQUIRED') {
      return {
        message: 'Şifrənizi yeniləməlisiniz. Zəhmət olmasa davam edin.',
        canRetry: false,
        isNetwork: false,
        code: derivedCode,
      };
    }

    // Network/Connection errors (retriable)
    if (errorMessage.includes('fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Unable to initialize authentication')) {
      return {
        message: 'Şəbəkə əlaqəsi problemi. Zəhmət olmasa bir az sonra cəhd edin.',
        canRetry: true,
        isNetwork: true
      };
    }

    // Authentication errors (not retriable)
    if (errorMessage.includes('credentials') ||
        errorMessage.includes('yanlışdır') ||
        errorMessage.includes('401')) {
      return {
        message: 'İstifadəçi adı və ya şifrə yanlışdır.',
        canRetry: false,
        isNetwork: false
      };
    }

    // Server errors (partially retriable)
    if (errorMessage.includes('500') || errorMessage.includes('server')) {
      return {
        message: 'Server xətası baş verdi. Zəhmət olmasa bir az sonra cəhd edin.',
        canRetry: true,
        isNetwork: false
      };
    }

    // Default fallback
    return {
      message: errorMessage,
      canRetry: false,
      isNetwork: false,
      code: derivedCode,
      retryAfter,
    };
  };

  // Smart retry logic with exponential backoff
  const handleRetry = async (email: string, password: string, remember: boolean, attemptNumber: number = 1) => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay

    if (attemptNumber > maxRetries) {
      setLoginError('Çox sayda uğursuz cəhd. Zəhmət olmasa bir az gözləyin.');
      return false;
    }

    try {
      if (attemptNumber > 1) {
        setIsRetrying(true);
        const delay = baseDelay * Math.pow(2, attemptNumber - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        setIsRetrying(false);
      }

      await login({ email, password, remember });
      setRetryCount(0);
      return true;
    } catch (error) {
      const { message, canRetry, isNetwork, code } = categorizeError(error);

      if (canRetry && isNetwork && attemptNumber < maxRetries) {
        setRetryCount(attemptNumber);
        return handleRetry(email, password, remember, attemptNumber + 1);
      } else {
        setLoginError(message);
        if (code === 'PASSWORD_RESET_REQUIRED') {
          setForceForgotPassword(true);
        }
        setRetryCount(0);
        return false;
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleLogin = async (email: string, password: string, remember: boolean) => {
    try {
      setLoginError(undefined);
      setRetryCount(0);
      setForceForgotPassword(false);
      await handleRetry(email, password, remember, 1);
    } catch (error) {
      const { message, code } = categorizeError(error);
      setLoginError(message);
      if (code === 'PASSWORD_RESET_REQUIRED') {
        setForceForgotPassword(true);
      }
    }
  };
  
  // Enhanced loading message based on state
  const getLoadingMessage = () => {
    if (isRetrying && retryCount > 0) {
      return `Yenidən cəhd edilir... (${retryCount}/3)`;
    }
    if (loading) {
      return 'Məlumatlar yoxlanılır...';
    }
    return undefined;
  };

  const handleErrorDismiss = () => {
    setLoginError(undefined);
  };

  return (
    <LoginForm
      onLogin={handleLogin}
      isLoading={loading || isRetrying}
      error={loginError}
      loadingMessage={getLoadingMessage()}
      onErrorDismiss={handleErrorDismiss}
      retryCount={retryCount}
      showHelpfulHints={true}
      forceForgotPassword={forceForgotPassword}
      onForgotPasswordAutoOpen={() => setForceForgotPassword(false)}
    />
  );
};

const App = () => {
  // Development accessibility monitoring
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Check accessibility on major DOM changes
      const observer = new MutationObserver((mutations) => {
        const hasSignificantChanges = mutations.some(mutation => 
          mutation.type === 'childList' && mutation.addedNodes.length > 0
        );
        
        if (hasSignificantChanges) {
          // Debounce accessibility checks
          setTimeout(() => {
            const issues = accessibilityChecker.runAllChecks();
            const criticalIssues = issues.filter(issue => issue.severity === 'critical');
            
            if (criticalIssues.length > 0) {
              console.warn('🚨 Critical Accessibility Issues Found:', criticalIssues);
            }
          }, 500);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-hidden', 'tabindex', 'role']
      });

      return () => observer.disconnect();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DebugProvider>
          <WebSocketProvider>
            <TooltipProvider>
              <Toaster />
              <EnhancedDebugPanel />
              <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/password-reset" element={<LazyWrapper><PasswordReset /></LazyWrapper>} />
            <Route path="/debug" element={<LazyWrapper><DebugConsole /></LazyWrapper>} />
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
              <Route path="permissions" element={<LazyWrapper><Permissions /></LazyWrapper>} />
              <Route path="departments" element={
                <LazyWrapper>
                  <RoleProtectedRoute
                    allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
                    requiredPermissions={['departments.read']}
                    permissionMatch="any"
                  >
                    <Departments />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="institutions" element={
                <LazyWrapper>
                  <RoleProtectedRoute
                    allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
                    requiredPermissions={['institutions.read']}
                    permissionMatch="any"
                  >
                    <Institutions />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="preschools" element={<LazyWrapper><Preschools /></LazyWrapper>} />
              <Route path="regions" element={<LazyWrapper><Regions /></LazyWrapper>} />
              <Route path="sectors" element={
                <LazyWrapper>
                  <RoleProtectedRoute
                    allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN]}
                    requiredPermissions={['institutions.read']}
                    permissionMatch="any"
                  >
                    <Sectors />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="hierarchy" element={<LazyWrapper><Hierarchy /></LazyWrapper>} />
              <Route path="surveys" element={<LazyWrapper><Surveys /></LazyWrapper>} />
              <Route path="survey-response/:surveyId" element={<LazyWrapper><SurveyResponse /></LazyWrapper>} />
              <Route path="survey-response/:surveyId/:responseId" element={<LazyWrapper><SurveyResponse /></LazyWrapper>} />
              <Route path="approvals" element={
                <LazyWrapper>
                  <RoleProtectedRoute
                    allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN]}
                    requiredPermissions={['approvals.read']}
                    permissionMatch="any"
                  >
                    <Approvals />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="survey-archive" element={<LazyWrapper><SurveyArchive /></LazyWrapper>} />
              <Route path="survey-analytics" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN]}>
                    <SurveyAnalytics />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="survey-export" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN]}>
                    <SurveyExport />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="tasks" element={<LazyWrapper><Tasks /></LazyWrapper>} />
              <Route
                path="tasks/assigned"
                element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[
                        USER_ROLES.SUPERADMIN,
                        USER_ROLES.REGIONADMIN,
                        USER_ROLES.REGIONOPERATOR,
                        USER_ROLES.SEKTORADMIN,
                        USER_ROLES.SCHOOLADMIN,
                      ]}
                      requiredPermissions={['tasks.read']}
                    >
                      <AssignedTasks />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                }
              />

              {/* Resources section routes */}
              <Route path="resources" element={<LazyWrapper><ResourcesRedirect /></LazyWrapper>} />
              <Route path="resources/links" element={<LazyWrapper><ResourcesLinksPage /></LazyWrapper>} />
              <Route path="resources/documents" element={<LazyWrapper><ResourcesDocumentsPage /></LazyWrapper>} />
              <Route path="resources/folders" element={<LazyWrapper><ResourcesFoldersPage /></LazyWrapper>} />
              <Route path="my-resources" element={<LazyWrapper><MyResources /></LazyWrapper>} />

              {/* Redirect old paths to new resources routes */}
              <Route path="documents" element={<Navigate to="/resources/documents" replace />} />
              <Route path="links" element={<Navigate to="/resources/links" replace />} />

              <Route path="reports" element={
                <LazyWrapper>
                  <RoleProtectedRoute
                    allowedRoles={[
                      USER_ROLES.SUPERADMIN,
                      USER_ROLES.REGIONADMIN,
                      USER_ROLES.SEKTORADMIN,
                      USER_ROLES.SCHOOLADMIN,
                      USER_ROLES.REGIONOPERATOR,
                    ]}
                    requiredPermissions={['reports.read']}
                  >
                    <Reports />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="subjects" element={
                <LazyWrapper>
                  <RoleProtectedRoute
                    allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
                    requiredPermissions={['subjects.read']}
                    permissionMatch="any"
                  >
                    <SubjectManagement />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="institution-types-management" element={<LazyWrapper><InstitutionTypesManagement /></LazyWrapper>} />
              <Route path="academic-year-management" element={<LazyWrapper><AcademicYearManagement /></LazyWrapper>} />
              <Route path="notifications" element={<LazyWrapper><Notifications /></LazyWrapper>} />
              <Route path="analytics" element={
                <LazyWrapper>
                  <RoleProtectedRoute
                    allowedRoles={[
                      USER_ROLES.SUPERADMIN,
                      USER_ROLES.REGIONADMIN,
                      USER_ROLES.SEKTORADMIN,
                      USER_ROLES.SCHOOLADMIN,
                      USER_ROLES.REGIONOPERATOR,
                    ]}
                    requiredPermissions={['analytics.view']}
                  >
                    <Analytics />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="settings" element={<LazyWrapper><Settings /></LazyWrapper>} />
              <Route path="audit-logs" element={<LazyWrapper><AuditLogs /></LazyWrapper>} />
              <Route path="performance" element={<LazyWrapper><Performance /></LazyWrapper>} />
              <Route path="school/workload" element={<LazyWrapper><SchoolWorkload /></LazyWrapper>} />
              <Route path="school/schedules" element={<LazyWrapper><SchoolSchedules /></LazyWrapper>} />
              
              {/* Assessment Management Routes */}
              <Route path="assessments/types" element={<LazyWrapper><AssessmentTypes /></LazyWrapper>} />
              <Route path="assessments/results" element={
                <LazyWrapper>
                  <RoleProtectedRoute
                    allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN]}
                    requiredPermissions={['assessments.read']}
                    permissionMatch="any"
                  >
                    <AssessmentResults />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="assessments/entry" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM]}>
                    <AssessmentEntry />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              
              
              {/* RegionAdmin Routes */}
              <Route
                element={
                  <RoleProtectedRoute allowedRoles={[...REGION_ADMIN_ALLOWED_ROLES]}>
                    <Outlet />
                  </RoleProtectedRoute>
                }
              >
                <Route path="regionadmin" element={<LazyWrapper><RegionAdminIndex /></LazyWrapper>} />
                <Route path="regionadmin/users/operators" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
                      requiredPermissions={['users.read']}
                      permissionMatch="any"
                    >
                      <RegionAdminUsers />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/users/sektoradmins" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
                      requiredPermissions={['users.read']}
                      permissionMatch="any"
                    >
                      <RegionAdminUsers />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/users/schooladmins" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
                      requiredPermissions={['users.read']}
                      permissionMatch="any"
                    >
                      <RegionAdminUsers />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/users/teachers" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
                      requiredPermissions={['users.read']}
                      permissionMatch="any"
                    >
                      <RegionAdminUsers />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/sectors" element={<LazyWrapper><RegionAdminSectors /></LazyWrapper>} />
                <Route path="regionadmin/teachers" element={<LazyWrapper><RegionTeacherManagement /></LazyWrapper>} />
                <Route path="regionadmin/classes" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
                      requiredPermissions={['classes.read']}
                      permissionMatch="any"
                    >
                      <RegionClassManagement />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/schools" element={<div className="p-6"><h1>Regional Schools</h1><p>Hazırlanmaqdadır...</p></div>} />
                <Route path="regionadmin/hierarchy" element={<div className="p-6"><h1>Regional Hierarchy</h1><p>Hazırlanmaqdadır...</p></div>} />
                <Route path="regionadmin/tasks/*" element={<div className="p-6"><h1>Regional Tasks</h1><p>Hazırlanmaqdadır...</p></div>} />
                <Route path="regionadmin/surveys/*" element={<div className="p-6"><h1>Regional Surveys</h1><p>Hazırlanmaqdadır...</p></div>} />
                <Route path="regionadmin/documents/*" element={<div className="p-6"><h1>Regional Documents</h1><p>Hazırlanmaqdadır...</p></div>} />
                <Route path="regionadmin/reports/*" element={<div className="p-6"><h1>Regional Reports</h1><p>Hazırlanmaqdadır...</p></div>} />
                <Route path="regionadmin/settings/*" element={<div className="p-6"><h1>Regional Settings</h1><p>Hazırlanmaqdadır...</p></div>} />
                <Route path="regionadmin/attendance/reports" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[
                        USER_ROLES.SUPERADMIN,
                        USER_ROLES.REGIONADMIN,
                        USER_ROLES.SEKTORADMIN,
                        USER_ROLES.REGIONOPERATOR,
                      ]}
                      requiredPermissions={['attendance.read']}
                    >
                      <RegionAttendanceReports />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/schedules" element={<LazyWrapper><RegionSchedules /></LazyWrapper>} />

                {/* Teacher Rating Routes */}
                <Route path="regionadmin/teacher-rating" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
                      requiredPermissions={['teacher_rating.view']}
                    >
                      <RegionAdminTeacherRating />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/teacher-rating/profile/:teacherId" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
                      requiredPermissions={['teacher_rating.view']}
                    >
                      <TeacherRatingProfile />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/teacher-rating/import" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN]}
                      requiredPermissions={['teacher_rating.manage']}
                    >
                      <TeacherRatingImport />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/teacher-rating/leaderboard" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
                      requiredPermissions={['teacher_rating.view']}
                    >
                      <TeacherRatingLeaderboard />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/teacher-rating/comparison" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
                      requiredPermissions={['teacher_rating.view']}
                    >
                      <TeacherRatingComparison />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/teacher-rating/configuration" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN]}
                      requiredPermissions={['teacher_rating.configure']}
                    >
                      <TeacherRatingConfiguration />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />

                {/* Staff Rating Routes (Directors, SektorAdmin, RegionOperator) */}
                <Route path="regionadmin/staff-rating/dashboard" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
                      requiredPermissions={['staff_rating.view']}
                    >
                      <RatingDashboard />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/staff-rating/directors" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN]}
                      requiredPermissions={['staff_rating.manage_directors']}
                    >
                      <DirectorManagement />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/staff-rating/configuration" element={
                  <LazyWrapper>
                    <RoleProtectedRoute
                      allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN]}
                      requiredPermissions={['staff_rating.configure']}
                    >
                      <RatingConfiguration />
                    </RoleProtectedRoute>
                  </LazyWrapper>
                } />
                <Route path="regionadmin/folders" element={<Navigate to="/resources/folders" replace />} />
                <Route path="regionadmin/schedule-dashboard" element={
                  <LazyWrapper>
                    <RegionalSchedulesDashboard />
                  </LazyWrapper>
                } />
                <Route path="regionadmin/schedule-comparison" element={
                  <LazyWrapper>
                    <ScheduleComparisonTool />
                  </LazyWrapper>
                } />
              </Route>

              {/* Staff Rating - My Rating (accessible to all staff) */}
              <Route path="/staff-rating/my-rating" element={
                <LazyWrapper>
                  <RoleProtectedRoute
                    allowedRoles={[
                      USER_ROLES.SUPERADMIN,
                      USER_ROLES.REGIONADMIN,
                      USER_ROLES.REGIONOPERATOR,
                      USER_ROLES.SEKTORADMIN,
                      USER_ROLES.SCHOOLADMIN
                    ]}
                    requiredPermissions={['view_staff_ratings']}
                  >
                    <MyRating />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />

              {/* REDIRECTS for old routes - backward compatibility */}
              <Route path="my-documents" element={<Navigate to="/my-resources?tab=folders" replace />} />
              
              {/* SchoolAdmin Routes */}
              <Route path="school/students" element={<Navigate to="/students" replace />} />
              <Route path="school/teachers" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]}>
                    <SchoolTeachers />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="school/classes" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]}>
                    <SchoolClasses />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="school/attendance" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]}>
                    <SchoolAttendanceRecord />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="school/attendance/bulk" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]}>
                    <BulkAttendanceEntry />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="school/attendance/reports" element={
                <LazyWrapper>
                  <RoleProtectedRoute
                    allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.REGIONOPERATOR]}
                    requiredPermissions={['attendance.read']}
                  >
                    <AttendanceReports />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="school/assessments" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM]}>
                    <SchoolAssessments />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="school/assessments/reports" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN]}>
                    <AssessmentResults />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="school/gradebook" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM]}>
                    <SchoolGradebook />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="school/schedule-management" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]}>
                    <SchoolScheduleManagement />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="school/schedule-builder" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]}>
                    <ScheduleBuilderPage />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="school/schedule-comparison" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]}>
                    <ScheduleComparisonTool />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              {/* Teacher Routes */}
              <Route path="teacher/schedule" element={
                <LazyWrapper>
                  <RoleProtectedRoute allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.MUELLIM]}>
                    <TeacherSchedule />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />
              <Route path="teacher/rating/profile" element={
                <LazyWrapper>
                  <RoleProtectedRoute
                    allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.MUELLIM]}
                  >
                    <TeacherOwnRating />
                  </RoleProtectedRoute>
                </LazyWrapper>
              } />

              {/* My Surveys Routes */}
              <Route path="my-surveys/pending" element={<LazyWrapper><PendingSurveys /></LazyWrapper>} />
              <Route path="my-surveys/responses" element={<LazyWrapper><MyResponses /></LazyWrapper>} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </WebSocketProvider>
        </DebugProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
