import { lazy } from "react";
import { Navigate, Outlet, Route } from "react-router-dom";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { LazyWrapper } from "@/components/common/LazyWrapper";
import { USER_ROLES } from "@/constants/roles";

const RegionAdminIndex = lazy(() => import("@/pages/regionadmin/RegionAdminIndex"));
const RegionAdminUsers = lazy(() => import("@/pages/regionadmin/RegionAdminUsers"));
const RegionAdminSectors = lazy(() => import("@/pages/regionadmin/RegionAdminSectors"));
const RegionSchedules = lazy(() => import("@/pages/regionadmin/RegionSchedules"));
const RegionTeacherManagement = lazy(() =>
  import("@/pages/regionadmin/RegionTeacherManagement").then((m) => ({
    default: m.RegionTeacherManagement,
  })),
);
const RegionClassManagement = lazy(() => import("@/pages/regionadmin/RegionClassManagement"));
const RegionAttendanceReports = lazy(() => import("@/pages/regionadmin/RegionAttendanceReports"));
const RegionStudents = lazy(() => import("@/pages/regionadmin/RegionStudents"));
const RegionalSchedulesDashboard = lazy(
  () => import("@/components/schedules/RegionalSchedulesDashboard"),
);
const ScheduleComparisonTool = lazy(
  () => import("@/components/schedules/ScheduleComparisonTool"),
);

const REGION_ADMIN_ALLOWED_ROLES = [
  USER_ROLES.SUPERADMIN,
  USER_ROLES.REGIONADMIN,
  USER_ROLES.REGIONOPERATOR,
  USER_ROLES.SEKTORADMIN,
] as const;

export function RegionAdminRoutes() {
  return (
    <Route
      element={
        <RoleProtectedRoute allowedRoles={[...REGION_ADMIN_ALLOWED_ROLES]}>
          <Outlet />
        </RoleProtectedRoute>
      }
    >
      <Route
        path="regionadmin"
        element={
          <LazyWrapper>
            <RegionAdminIndex />
          </LazyWrapper>
        }
      />
      <Route
        path="regionadmin/users/operators"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
              ]}
              requiredPermissions={["users.read"]}
              permissionMatch="any"
            >
              <RegionAdminUsers />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="regionadmin/users/sektoradmins"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
              ]}
              requiredPermissions={["users.read"]}
              permissionMatch="any"
            >
              <RegionAdminUsers />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="regionadmin/users/schooladmins"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
              ]}
              requiredPermissions={["users.read"]}
              permissionMatch="any"
            >
              <RegionAdminUsers />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="regionadmin/users/teachers"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
              ]}
              requiredPermissions={["users.read"]}
              permissionMatch="any"
            >
              <RegionAdminUsers />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="regionadmin/sectors"
        element={
          <LazyWrapper>
            <RegionAdminSectors />
          </LazyWrapper>
        }
      />
      <Route
        path="regionadmin/teachers"
        element={
          <LazyWrapper>
            <RegionTeacherManagement />
          </LazyWrapper>
        }
      />
      <Route
        path="regionadmin/students"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]}
              requiredPermissions={['students.read']}
              permissionMatch="any"
            >
              <RegionStudents />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="regionadmin/classes"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
              ]}
              requiredPermissions={["classes.read"]}
              permissionMatch="any"
            >
              <RegionClassManagement />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="regionadmin/attendance/reports"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.SEKTORADMIN,
                USER_ROLES.REGIONOPERATOR,
              ]}
              requiredPermissions={["attendance.read"]}
            >
              <RegionAttendanceReports />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="regionadmin/schedules"
        element={
          <LazyWrapper>
            <RegionSchedules />
          </LazyWrapper>
        }
      />
      <Route
        path="regionadmin/folders"
        element={<Navigate to="/resources?tab=folders" replace />}
      />
      <Route
        path="regionadmin/schedule-dashboard"
        element={
          <LazyWrapper>
            <RegionalSchedulesDashboard />
          </LazyWrapper>
        }
      />
      <Route
        path="regionadmin/schedule-comparison"
        element={
          <LazyWrapper>
            <ScheduleComparisonTool />
          </LazyWrapper>
        }
      />
    </Route>
  );
}
