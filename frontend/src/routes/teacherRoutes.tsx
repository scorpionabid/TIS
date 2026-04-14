import { lazy } from "react";
import { Route } from "react-router-dom";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { LazyWrapper } from "@/components/common/LazyWrapper";
import { USER_ROLES } from "@/constants/roles";

const TeacherSchedule = lazy(() => import("@/pages/teacher/TeacherSchedule"));
const TeacherDashboard = lazy(
  () => import("@/components/teacher/TeacherDashboard"),
);
const TeacherProfile = lazy(() => import("@/pages/teacher/TeacherProfile"));
const TeacherClasses = lazy(() => import("@/pages/teacher/TeacherClasses"));
const TeacherPerformance = lazy(
  () => import("@/pages/teacher/TeacherPerformance"),
);
const TeacherResources = lazy(() => import("@/pages/teacher/TeacherResources"));

const TEACHER_ALLOWED_ROLES = [USER_ROLES.SUPERADMIN, USER_ROLES.MUELLIM] as const;

export function TeacherRoutes() {
  return (
    <>
      <Route
        path="teacher/schedule"
        element={
          <LazyWrapper>
            <RoleProtectedRoute allowedRoles={[...TEACHER_ALLOWED_ROLES]}>
              <TeacherSchedule />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="teacher/dashboard"
        element={
          <LazyWrapper>
            <RoleProtectedRoute allowedRoles={[...TEACHER_ALLOWED_ROLES]}>
              <TeacherDashboard />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="teacher/profile"
        element={
          <LazyWrapper>
            <RoleProtectedRoute allowedRoles={[...TEACHER_ALLOWED_ROLES]}>
              <TeacherProfile />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="teacher/classes"
        element={
          <LazyWrapper>
            <RoleProtectedRoute allowedRoles={[...TEACHER_ALLOWED_ROLES]}>
              <TeacherClasses />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="teacher/performance"
        element={
          <LazyWrapper>
            <RoleProtectedRoute allowedRoles={[...TEACHER_ALLOWED_ROLES]}>
              <TeacherPerformance />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="teacher/resources"
        element={
          <LazyWrapper>
            <RoleProtectedRoute allowedRoles={[...TEACHER_ALLOWED_ROLES]}>
              <TeacherResources />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
    </>
  );
}
