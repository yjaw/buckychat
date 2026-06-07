import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Ban, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading, profileError } = useAuth();

  if (loading) {
    return (
      <main className="center-screen">
        <Loader2 className="spin" aria-hidden="true" />
      </main>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.status === "banned") {
    return (
      <main className="center-screen">
        <section className="panel narrow">
          <Ban aria-hidden="true" />
          <h1>Account unavailable</h1>
          <p>Your account cannot access BuckyChat right now.</p>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="center-screen">
        <section className="panel narrow">
          <h1>Almost there</h1>
          <p>{profileError ?? "Confirm your wisc.edu email, then sign in again."}</p>
        </section>
      </main>
    );
  }

  return children;
}
