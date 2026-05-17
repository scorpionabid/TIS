import { lazy } from "react";
import { Route } from "react-router-dom";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { LazyWrapper } from "@/components/common/LazyWrapper";
import { USER_ROLES } from "@/constants/roles";

const EducationRating = lazy(() => import("@/pages/EducationRating"));
const SectorRating = lazy(() => import("@/pages/SectorRating"));
const SchoolAdminRating = lazy(() => import("@/pages/SchoolAdminRating"));
const TeacherRating = lazy(() => import("@/pages/TeacherRating"));
const TeacherVerification = lazy(() => import("@/pages/TeacherVerification"));
const RatingConfiguration = lazy(() => import("@/pages/RatingConfiguration"));

export function RatingRoutes() {
  return (
    <>
      <Route
        path="education-rating"
        element={
          <LazyWrapper>
            <EducationRating />
          </LazyWrapper>
        }
      />
      <Route
        path="sector-rating"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
              ]}
            >
              <SectorRating />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="school-admin-rating"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
                USER_ROLES.SEKTORADMIN,
              ]}
            >
              <SchoolAdminRating />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="teacher-rating"
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
              <TeacherRating />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="teacher-verification"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.REGIONOPERATOR,
                USER_ROLES.SEKTORADMIN,
              ]}
            >
              <TeacherVerification />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="rating-configuration"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[USER_ROLES.SUPERADMIN]}
              requiredPermissions={["rating-configs.manage"]}
            >
              <RatingConfiguration />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
    </>
  );
}
