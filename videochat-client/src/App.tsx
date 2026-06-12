import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute } from "./components/GuestRoute";
import { LegalModal } from "./components/LegalModal";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { supabaseConfigured } from "./lib/supabase";

const AdminPage = lazy(() => import("./pages/AdminPage").then((module) => ({ default: module.AdminPage })));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage").then((module) => ({ default: module.AuthCallbackPage })));
const CallPage = lazy(() => import("./pages/CallPage").then((module) => ({ default: module.CallPage })));
const ConfirmSignupPage = lazy(() => import("./pages/ConfirmSignupPage").then((module) => ({ default: module.ConfirmSignupPage })));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage })));
const LandingPage = lazy(() => import("./pages/LandingPage").then((module) => ({ default: module.LandingPage })));
const LobbyPage = lazy(() => import("./pages/LobbyPage").then((module) => ({ default: module.LobbyPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage").then((module) => ({ default: module.ResetPasswordPage })));
const SetupPage = lazy(() => import("./pages/SetupPage").then((module) => ({ default: module.SetupPage })));

export function App() {
  return (
    <>
      <LegalModal />
      <Suspense fallback={<main className="center-screen">Loading...</main>}>
        <Routes>
          <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />
          <Route path="/terms" element={<Navigate to="/?legal=terms" replace />} />
          <Route path="/privacy" element={<Navigate to="/?legal=privacy" replace />} />
          <Route path="/login" element={supabaseConfigured ? <GuestRoute><LoginPage /></GuestRoute> : <SetupPage />} />
          <Route path="/register" element={supabaseConfigured ? <GuestRoute><RegisterPage /></GuestRoute> : <SetupPage />} />
          <Route
            path="/forgot-password"
            element={supabaseConfigured ? <ForgotPasswordPage /> : <SetupPage />}
          />
          <Route
            path="/reset-password"
            element={supabaseConfigured ? <ResetPasswordPage /> : <SetupPage />}
          />
          <Route
            path="/auth/callback"
            element={supabaseConfigured ? <AuthCallbackPage /> : <SetupPage />}
          />
          <Route
            path="/confirm-signup"
            element={supabaseConfigured ? <ConfirmSignupPage /> : <SetupPage />}
          />
          <Route
            path="/lobby"
            element={supabaseConfigured ? (
              <ProtectedRoute>
                <LobbyPage />
              </ProtectedRoute>
            ) : (
              <SetupPage />
            )}
          />
          <Route
            path="/call/:roomID"
            element={supabaseConfigured ? (
              <ProtectedRoute>
                <CallPage />
              </ProtectedRoute>
            ) : (
              <SetupPage />
            )}
          />
          <Route
            path="/admin"
            element={supabaseConfigured ? (
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            ) : (
              <SetupPage />
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
