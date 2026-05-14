import { lazy } from "react";
import { Route } from "react-router-dom";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { LazyWrapper } from "@/components/common/LazyWrapper";
import { USER_ROLES } from "@/constants/roles";

const AssessmentTypes = lazy(() => import("@/pages/AssessmentTypes"));
const AssessmentResults = lazy(() => import("@/pages/AssessmentResults"));
const AssessmentEntry = lazy(() => import("@/pages/AssessmentEntry"));
const ReportTables = lazy(() => import("@/pages/ReportTables"));
const ReportTableEntry = lazy(() => import("@/pages/ReportTableEntry"));

export function AssessmentRoutes() {
  return (
    <>
      <Route
        path="assessments/types"
        element={
          <LazyWrapper>
            <AssessmentTypes />
          </LazyWrapper>
        }
      />
      <Route
        path="assessments/results"
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
              requiredPermissions={["assessments.read"]}
              permissionMatch="any"
            >
              <AssessmentResults />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="assessments/entry"
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
              <AssessmentEntry />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="report-tables"
        element={
          <LazyWrapper>
            <ReportTables />
          </LazyWrapper>
        }
      />
      <Route
        path="report-table-entry"
        element={
          <LazyWrapper>
            <ReportTableEntry />
          </LazyWrapper>
        }
      />
    </>
  );
}
