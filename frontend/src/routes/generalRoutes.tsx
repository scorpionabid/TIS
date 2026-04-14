import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { LazyWrapper } from "@/components/common/LazyWrapper";
import { USER_ROLES } from "@/constants/roles";

const Index = lazy(() => import("@/pages/Index"));
const Attendance = lazy(() => import("@/pages/Attendance"));
const Users = lazy(() => import("@/pages/Users"));
const Students = lazy(() => import("@/pages/Students"));
const Roles = lazy(() => import("@/pages/Roles"));
const Permissions = lazy(() => import("@/pages/Permissions"));
const Departments = lazy(() => import("@/pages/Departments"));
const Institutions = lazy(() => import("@/pages/Institutions"));
const Preschools = lazy(() => import("@/pages/Preschools"));
const Regions = lazy(() => import("@/pages/Regions"));
const Sectors = lazy(() => import("@/pages/Sectors"));
const Hierarchy = lazy(() => import("@/pages/Hierarchy"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const Projects = lazy(() => import("@/pages/projects/index"));
const Links = lazy(() => import("@/pages/Links"));
const LinkDatabase = lazy(() => import("@/pages/LinkDatabase/index"));
const Documents = lazy(() => import("@/pages/Documents"));
const Folders = lazy(() => import("@/pages/Folders"));
const MyResources = lazy(() => import("@/pages/MyResources"));
const Reports = lazy(() => import("@/pages/Reports"));
const InstitutionTypesManagement = lazy(
  () => import("@/pages/InstitutionTypesManagement"),
);
const AcademicYearManagement = lazy(
  () => import("@/pages/AcademicYearManagement"),
);
const Notifications = lazy(() => import("@/pages/Notifications"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Settings = lazy(() => import("@/pages/Settings"));
const Profile = lazy(() => import("@/pages/Profile"));
const AuditLogs = lazy(() => import("@/pages/AuditLogs"));
const Performance = lazy(() => import("@/pages/Performance"));
const SchoolWorkload = lazy(() => import("@/pages/SchoolWorkload"));
const Approvals = lazy(() => import("@/pages/Approvals"));
const SubjectManagement = lazy(() => import("@/pages/SubjectManagement"));
const AiAnalysis = lazy(() => import("@/pages/AiAnalysis/index"));
const AiSettings = lazy(() => import("@/pages/AiSettings"));

export function GeneralRoutes() {
  return (
    <>
      <Route
        index
        element={
          <LazyWrapper>
            <Index />
          </LazyWrapper>
        }
      />
      <Route
        path="users"
        element={
          <LazyWrapper>
            <Users />
          </LazyWrapper>
        }
      />
      <Route
        path="students"
        element={
          <LazyWrapper>
            <Students />
          </LazyWrapper>
        }
      />
      <Route
        path="roles"
        element={
          <LazyWrapper>
            <Roles />
          </LazyWrapper>
        }
      />
      <Route
        path="permissions"
        element={
          <LazyWrapper>
            <Permissions />
          </LazyWrapper>
        }
      />
      <Route
        path="departments"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
              ]}
              requiredPermissions={["departments.read"]}
              permissionMatch="any"
            >
              <Departments />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="institutions"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
                USER_ROLES.SEKTORADMIN,
              ]}
              requiredPermissions={["institutions.read"]}
              permissionMatch="any"
            >
              <Institutions />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="preschools"
        element={
          <LazyWrapper>
            <Preschools />
          </LazyWrapper>
        }
      />
      <Route
        path="regions"
        element={
          <LazyWrapper>
            <Regions />
          </LazyWrapper>
        }
      />
      <Route
        path="sectors"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
                USER_ROLES.SEKTORADMIN,
              ]}
              requiredPermissions={["institutions.read"]}
              permissionMatch="any"
            >
              <Sectors />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="hierarchy"
        element={
          <LazyWrapper>
            <Hierarchy />
          </LazyWrapper>
        }
      />
      <Route
        path="approvals"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
                USER_ROLES.SEKTORADMIN,
              ]}
              requiredPermissions={["approvals.read"]}
              permissionMatch="any"
            >
              <Approvals />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="tasks"
        element={
          <LazyWrapper>
            <Tasks />
          </LazyWrapper>
        }
      />
      <Route
        path="projects"
        element={
          <LazyWrapper>
            <Projects />
          </LazyWrapper>
        }
      />
      <Route
        path="tasks/assigned"
        element={<Navigate to="/tasks" state={{ activeTab: "assigned" }} replace />}
      />
      <Route
        path="my-delegations"
        element={<Navigate to="/tasks" state={{ activeTab: "delegations" }} replace />}
      />
      <Route
        path="links"
        element={
          <LazyWrapper>
            <Links />
          </LazyWrapper>
        }
      />
      <Route
        path="link-database"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
              ]}
              requiredPermissions={["links.read"]}
              permissionMatch="any"
            >
              <LinkDatabase />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="documents"
        element={
          <LazyWrapper>
            <Documents />
          </LazyWrapper>
        }
      />
      <Route
        path="folders"
        element={
          <LazyWrapper>
            <Folders />
          </LazyWrapper>
        }
      />
      <Route
        path="my-resources"
        element={
          <LazyWrapper>
            <MyResources />
          </LazyWrapper>
        }
      />
      <Route path="resources" element={<Navigate to="/links" replace />} />
      <Route path="my-documents" element={<Navigate to="/my-resources?tab=folders" replace />} />
      <Route
        path="reports"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN]}
              requiredPermissions={["reports.read"]}
            >
              <Reports />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="subjects"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
              ]}
              requiredPermissions={["subjects.read"]}
              permissionMatch="any"
            >
              <SubjectManagement />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="institution-types-management"
        element={
          <LazyWrapper>
            <InstitutionTypesManagement />
          </LazyWrapper>
        }
      />
      <Route
        path="academic-year-management"
        element={
          <LazyWrapper>
            <AcademicYearManagement />
          </LazyWrapper>
        }
      />
      <Route
        path="notifications"
        element={
          <LazyWrapper>
            <Notifications />
          </LazyWrapper>
        }
      />
      <Route
        path="analytics"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.SEKTORADMIN,
                USER_ROLES.SCHOOLADMIN,
                USER_ROLES.REGIONOPERATOR,
              ]}
              requiredPermissions={["analytics.view"]}
            >
              <Analytics />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="profile"
        element={
          <LazyWrapper>
            <Profile />
          </LazyWrapper>
        }
      />
      <Route
        path="settings"
        element={
          <LazyWrapper>
            <Settings />
          </LazyWrapper>
        }
      />
      <Route
        path="audit-logs"
        element={
          <LazyWrapper>
            <AuditLogs />
          </LazyWrapper>
        }
      />
      <Route
        path="performance"
        element={
          <LazyWrapper>
            <Performance />
          </LazyWrapper>
        }
      />
      <Route
        path="school/workload"
        element={
          <LazyWrapper>
            <SchoolWorkload />
          </LazyWrapper>
        }
      />
      <Route
        path="attendance"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.SEKTORADMIN,
                USER_ROLES.REGIONOPERATOR,
                USER_ROLES.SCHOOLADMIN,
              ]}
            >
              <Attendance />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="ai-analysis"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN]}
              requiredPermissions={["ai_analysis.view"]}
            >
              <AiAnalysis />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="ai-settings"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[USER_ROLES.SUPERADMIN]}
              requiredPermissions={["ai_analysis.view"]}
            >
              <AiSettings />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
    </>
  );
}
