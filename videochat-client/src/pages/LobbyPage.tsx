import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { BuckyChatLogo } from "../components/BuckyChatLogo";
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

  function startMatchSearch() {
    joinQueue();
    navigate("/call/waiting");
  }

  return (
    <main className="lobby-page">
      <header className="landing-header page-header">
        <Link className="landing-brand" to="/" aria-label="BuckyChat home">
          <BuckyChatLogo markClassName="landing-mark" />
        </Link>
        <div className="landing-actions lobby-header-actions">
          <button
            className="lobby-header-button danger"
            type="button"
            onClick={signOut}
          >
            Log out
          </button>
        </div>
      </header>

      <div className="app-shell">
        <section className="lobby-band">
          <div className="lobby-copy">
            <h1>{waiting ? "Looking for someone" : "Ready when you are"}</h1>
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
              <button className="primary large" onClick={startMatchSearch} disabled={!connected}>
                <Search aria-hidden="true" />
                Find match
              </button>
            )}
          </div>
        </section>
      </div>

      <footer className="landing-legal">
        <span className="landing-legal-copy">&copy; 2026 BuckyChat</span>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
      </footer>
    </main>
  );
}
