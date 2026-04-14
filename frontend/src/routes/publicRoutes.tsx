import { lazy } from "react";
import { Route } from "react-router-dom";
import { LazyWrapper } from "@/components/common/LazyWrapper";
import LoginPage from "@/components/auth/LoginPage";

const PasswordReset = lazy(() => import("@/pages/PasswordReset"));
const DebugConsole = lazy(() => import("@/pages/DebugConsole"));

export function PublicRoutes() {
  return (
    <>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/password-reset"
        element={
          <LazyWrapper>
            <PasswordReset />
          </LazyWrapper>
        }
      />
      <Route
        path="/debug"
        element={
          <LazyWrapper>
            <DebugConsole />
          </LazyWrapper>
        }
      />
    </>
  );
}
