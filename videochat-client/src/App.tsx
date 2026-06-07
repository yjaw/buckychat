import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminPage } from "./pages/AdminPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { CallPage } from "./pages/CallPage";
import { ConfirmSignupPage } from "./pages/ConfirmSignupPage";
import { LobbyPage } from "./pages/LobbyPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SetupPage } from "./pages/SetupPage";
import { supabaseConfigured } from "./lib/supabase";

export function App() {
  if (!supabaseConfigured) {
    return <SetupPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/confirm-signup" element={<ConfirmSignupPage />} />
      <Route
        path="/lobby"
        element={
          <ProtectedRoute>
            <LobbyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/call/:roomID"
        element={
          <ProtectedRoute>
            <CallPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
