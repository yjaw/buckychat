import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Search, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useMatch } from "../context/MatchContext";

export function LobbyPage() {
  const navigate = useNavigate();
  const { profile, profileError, signOut } = useAuth();
  const { connectionState, queueState, activeMatch, error, joinQueue, leaveQueue } = useMatch();

  useEffect(() => {
    if (activeMatch) {
      navigate(`/call/${activeMatch.roomID}`, { state: activeMatch });
    }
  }, [activeMatch, navigate]);

  const connected = connectionState === "connected";
  const waiting = queueState === "waiting";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">BuckyChat</p>
          <h1>Lobby</h1>
        </div>
        <div className="topbar-actions">
          <Link className="icon-link" to="/admin" title="Admin reports">
            <ShieldCheck aria-hidden="true" />
          </Link>
          <button className="icon-button" onClick={signOut} title="Sign out">
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="lobby-band">
        <div className="lobby-copy">
          <h2>{waiting ? "Looking for someone" : "Ready when you are"}</h2>
          <p>{profile?.email}</p>
          <p className={`status ${connected ? "ok" : "warn"}`}>
            {connected ? "Connected" : "Connecting"}
          </p>
          {profileError && <p className="error">{profileError}</p>}
          {error && <p className="error">{error}</p>}
        </div>

        <div className="match-control">
          {waiting ? (
            <button className="secondary large" onClick={leaveQueue}>
              <X aria-hidden="true" />
              Cancel
            </button>
          ) : (
            <button className="primary large" onClick={joinQueue} disabled={!connected}>
              <Search aria-hidden="true" />
              Find match
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
