import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { LazyWrapper } from "@/components/common/LazyWrapper";
import { USER_ROLES } from "@/constants/roles";

const SchoolTeachers = lazy(() => import("@/pages/school/SchoolTeachers"));
const SchoolClasses = lazy(() => import("@/pages/school/SchoolClasses"));
const SchoolSchedules = lazy(() => import("@/pages/SchoolSchedules"));
const CurriculumPlan = lazy(() => import("@/pages/school/CurriculumPlan"));
const SchoolAttendance = lazy(() => import("@/pages/school/Attendance"));
const SchoolGradebook = lazy(() => import("@/pages/school/SchoolGradebook"));
const SchoolAssessments = lazy(() => import("@/pages/SchoolAssessments"));
const AttendanceReports = lazy(() => import("@/pages/AttendanceReports"));
const SchoolScheduleManagement = lazy(
  () => import("@/pages/school/SchoolScheduleManagement"),
);
const PreschoolGroups = lazy(() => import("@/pages/preschool/PreschoolGroups"));
const PreschoolAttendanceEntry = lazy(
  () => import("@/pages/preschool/PreschoolAttendanceEntry"),
);
const PreschoolAttendanceReports = lazy(
  () => import("@/pages/preschool/PreschoolAttendanceReports"),
);
const GradeBooks = lazy(() => import("@/pages/GradeBooks"));
const GradeBookDetail = lazy(() => import("@/pages/GradeBookDetail"));
const GradeBookCreate = lazy(() => import("@/pages/GradeBookCreate"));
const AssessmentResults = lazy(() => import("@/pages/AssessmentResults"));
const ScheduleBuilderPage = lazy(
  () => import("@/components/schedules/ScheduleBuilderPage"),
);
const ScheduleComparisonTool = lazy(
  () => import("@/components/schedules/ScheduleComparisonTool"),
);
const AdminCurriculumDashboard = lazy(
  () => import("@/pages/curriculum/AdminCurriculumDashboard"),
);

export function SchoolRoutes() {
  return (
    <>
      {/* Curriculum */}
      <Route
        path="school/curriculum-plan/:institutionId?"
        element={
          <LazyWrapper>
            <CurriculumPlan />
          </LazyWrapper>
        }
      />
      <Route
        path="curriculum/dashboard"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.SEKTORADMIN,
                USER_ROLES.REGIONOPERATOR,
              ]}
            >
              <AdminCurriculumDashboard />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="curriculum/plan/:institutionId"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.SEKTORADMIN,
                USER_ROLES.REGIONOPERATOR,
              ]}
            >
              <CurriculumPlan />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />

      {/* School staff & students */}
      <Route
        path="school/students"
        element={<Navigate to="/students" replace />}
      />
      <Route
        path="school/teachers"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.SCHOOLADMIN,
                USER_ROLES.SEKTORADMIN,
              ]}
            >
              <SchoolTeachers />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="school/classes"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.SCHOOLADMIN,
                USER_ROLES.SEKTORADMIN,
              ]}
            >
              <SchoolClasses />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />

      {/* School attendance */}
      <Route
        path="school/attendance"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.SCHOOLADMIN,
                USER_ROLES.SEKTORADMIN,
              ]}
            >
              <SchoolAttendance />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="school/attendance/bulk"
        element={<Navigate to="/school/attendance?tab=entry" replace />}
      />
      <Route
        path="school/attendance/reports"
        element={<Navigate to="/school/attendance?tab=reports" replace />}
      />

      {/* Preschool */}
      <Route
        path="preschool/groups"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.SCHOOLADMIN,
                USER_ROLES.PRESCHOOLADMIN,
              ]}
              requiredPermissions={["preschool.groups.manage"]}
              permissionMatch="any"
            >
              <PreschoolGroups />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="preschool/attendance"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.SCHOOLADMIN,
                USER_ROLES.PRESCHOOLADMIN,
              ]}
              requiredPermissions={["preschool.attendance.write"]}
              permissionMatch="any"
            >
              <PreschoolAttendanceEntry />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="preschool/attendance/reports"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
                USER_ROLES.SEKTORADMIN,
                USER_ROLES.PRESCHOOLADMIN,
              ]}
              requiredPermissions={["preschool.attendance.reports"]}
              permissionMatch="any"
            >
              <PreschoolAttendanceReports />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />

      {/* Grade Books */}
      <Route
        path="grade-books"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
                USER_ROLES.SEKTORADMIN,
                USER_ROLES.SCHOOLADMIN,
                USER_ROLES.MUELLIM,
              ]}
            >
              <GradeBooks />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="grade-books/create"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]}
            >
              <GradeBookCreate />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="grade-books/:id"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
                USER_ROLES.SEKTORADMIN,
                USER_ROLES.SCHOOLADMIN,
                USER_ROLES.MUELLIM,
              ]}
            >
              <GradeBookDetail />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />

      {/* School gradebook & assessments */}
      <Route
        path="school/assessments"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.SCHOOLADMIN,
                USER_ROLES.MUELLIM,
              ]}
            >
              <SchoolAssessments />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="school/assessments/reports"
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
            >
              <AssessmentResults />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="school/gradebook"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.SCHOOLADMIN,
                USER_ROLES.MUELLIM,
              ]}
            >
              <SchoolGradebook />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />

      {/* School schedules */}
      <Route
        path="school/schedules"
        element={
          <LazyWrapper>
            <SchoolSchedules />
          </LazyWrapper>
        }
      />
      <Route
        path="school/schedule-management"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.SCHOOLADMIN,
                USER_ROLES.SEKTORADMIN,
              ]}
            >
              <SchoolScheduleManagement />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="school/schedule-builder"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]}
            >
              <ScheduleBuilderPage />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="school/schedule-comparison"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]}
            >
              <ScheduleComparisonTool />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
    </>
  );
}
