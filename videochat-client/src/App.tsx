import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminPage } from "./pages/AdminPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { CallPage } from "./pages/CallPage";
import { ConfirmSignupPage } from "./pages/ConfirmSignupPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LandingPage } from "./pages/LandingPage";
import { PrivacyPage, TermsPage } from "./pages/LegalPages";
import { LobbyPage } from "./pages/LobbyPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SetupPage } from "./pages/SetupPage";
import { supabaseConfigured } from "./lib/supabase";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/login" element={supabaseConfigured ? <LoginPage /> : <SetupPage />} />
      <Route path="/register" element={supabaseConfigured ? <RegisterPage /> : <SetupPage />} />
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
  );
}
