import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Ban, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading, profileError, refreshProfile, signOut } = useAuth();

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

  // A session without a profile means /api/me failed. Don't redirect to
  // /login here — GuestRoute would bounce a signed-in user straight back,
  // creating an infinite redirect loop.
  if (!profile) {
    return (
      <main className="center-screen">
        <section className="panel narrow">
          <h1>Could not load your account</h1>
          <p>{profileError ?? "Something went wrong while loading your profile."}</p>
          <div className="modal-actions">
            <button className="primary" onClick={() => refreshProfile()}>
              Try again
            </button>
            <button className="secondary" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </section>
      </main>
    );
  }

  return children;
}
