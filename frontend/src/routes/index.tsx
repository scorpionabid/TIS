import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Layout from "@/components/layout/Layout";
import NotFound from "@/pages/NotFound";
import { PublicRoutes } from "./publicRoutes";
import { GeneralRoutes } from "./generalRoutes";
import { RegionAdminRoutes } from "./regionAdminRoutes";
import { SchoolRoutes } from "./schoolRoutes";
import { TeacherRoutes } from "./teacherRoutes";
import { AssessmentRoutes } from "./assessmentRoutes";
import { SurveyRoutes } from "./surveyRoutes";
import { RatingRoutes } from "./ratingRoutes";

/**
 * Root route tree.
 *
 * Route groups are called as functions (not <Component />) so that React Router v6
 * createRoutesFromChildren can traverse the Route elements directly.
 * Custom component wrappers are opaque to React Router and would be silently ignored.
 */
export function AppRoutes() {
  return (
    <Routes>
      {PublicRoutes()}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {GeneralRoutes()}
        {RegionAdminRoutes()}
        {SchoolRoutes()}
        {TeacherRoutes()}
        {AssessmentRoutes()}
        {SurveyRoutes()}
        {RatingRoutes()}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
