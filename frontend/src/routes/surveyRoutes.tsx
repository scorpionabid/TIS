import { lazy } from "react";
import { Route } from "react-router-dom";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { LazyWrapper } from "@/components/common/LazyWrapper";
import { USER_ROLES } from "@/constants/roles";

const Surveys = lazy(() => import("@/pages/Surveys"));
const SurveyArchive = lazy(() => import("@/pages/SurveyArchive"));
const SurveyResponse = lazy(() => import("@/pages/SurveyResponse"));
const SurveyAnalytics = lazy(() => import("@/pages/SurveyAnalytics"));
const SurveyExport = lazy(() => import("@/pages/SurveyExport"));
const PendingSurveys = lazy(() => import("@/pages/my-surveys/PendingSurveys"));
const MyResponses = lazy(() => import("@/pages/my-surveys/MyResponses"));

export function SurveyRoutes() {
  return (
    <>
      <Route
        path="surveys"
        element={
          <LazyWrapper>
            <Surveys />
          </LazyWrapper>
        }
      />
      <Route
        path="survey-response/:surveyId"
        element={
          <LazyWrapper>
            <SurveyResponse />
          </LazyWrapper>
        }
      />
      <Route
        path="survey-response/:surveyId/:responseId"
        element={
          <LazyWrapper>
            <SurveyResponse />
          </LazyWrapper>
        }
      />
      <Route
        path="survey-archive"
        element={
          <LazyWrapper>
            <SurveyArchive />
          </LazyWrapper>
        }
      />
      <Route
        path="survey-analytics"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.SEKTORADMIN,
                USER_ROLES.SCHOOLADMIN,
              ]}
            >
              <SurveyAnalytics />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="survey-export"
        element={
          <LazyWrapper>
            <RoleProtectedRoute
              allowedRoles={[
                USER_ROLES.SUPERADMIN,
                USER_ROLES.REGIONADMIN,
                USER_ROLES.SEKTORADMIN,
                USER_ROLES.SCHOOLADMIN,
              ]}
            >
              <SurveyExport />
            </RoleProtectedRoute>
          </LazyWrapper>
        }
      />
      <Route
        path="my-surveys/pending"
        element={
          <LazyWrapper>
            <PendingSurveys />
          </LazyWrapper>
        }
      />
      <Route
        path="my-surveys/responses"
        element={
          <LazyWrapper>
            <MyResponses />
          </LazyWrapper>
        }
      />
    </>
  );
}
