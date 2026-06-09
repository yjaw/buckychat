import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function GuestRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <main className="center-screen">
        <Loader2 className="spin" aria-hidden="true" />
      </main>
    );
  }

  if (session) {
    return <Navigate to="/lobby" replace />;
  }

  return children;
}
