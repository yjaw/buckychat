import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, MonitorSmartphone } from "lucide-react";
import { BuckyChatLogo } from "../components/BuckyChatLogo";
import { CameraPermissionBanner } from "../components/CameraPermissionBanner";
import { ConnectionErrorBanner } from "../components/ConnectionErrorBanner";
import { PageFooter } from "../components/PageFooter";
import { useAuth } from "../context/AuthContext";
import { useMatch } from "../context/MatchContext";
import { useCameraPermission } from "../hooks/useCameraPermission";
import { useStats } from "../hooks/useStats";

export function LobbyPage() {
  const navigate = useNavigate();
  const { profile, profileError, signOut } = useAuth();
  const { connectionState, queueState, activeMatch, error, joinQueue, leaveQueue } = useMatch();
  const wsError = connectionState === "error";

  useEffect(() => {
    if (activeMatch) {
      navigate(`/call/${activeMatch.roomID}`, { state: activeMatch });
    }
  }, [activeMatch, navigate]);

  const connected = connectionState === "connected";
  const waiting = queueState === "waiting";
  const duplicateSession = error === "duplicate_session";
  const { state: cameraPermission } = useCameraPermission();
  const stats = useStats(60_000);
  const cameraBlocked = cameraPermission === "denied";

  function startMatchSearch() {
    joinQueue();
    navigate("/call/waiting");
  }

  return (
    <main className="lobby-page">
      {cameraBlocked && <CameraPermissionBanner />}
      {wsError && <ConnectionErrorBanner kind="error" />}
      <header className="landing-header page-header">
        <Link className="landing-brand" to="/lobby" aria-label="BuckyChat home">
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
        {duplicateSession && (
          <div className="center-screen">
            <section className="panel narrow" style={{ textAlign: "center" }}>
              <MonitorSmartphone size={40} aria-hidden="true" style={{ margin: "0 auto 12px", color: "#b45309" }} />
              <h1>Signed in elsewhere</h1>
              <p>Your account was opened on another device or tab. Only one session is allowed at a time.</p>
              <button className="primary large" style={{ marginTop: "16px" }} onClick={signOut}>
                Sign out
              </button>
            </section>
          </div>
        )}
        {!duplicateSession && <section className="lobby-band">
          <div className="lobby-copy">
            <h1>{waiting ? "Looking for someone" : "Ready when you are"}</h1>
            <p>{profile?.email}</p>
            <p className={`status ${connected ? "ok" : "warn"}`}>
              {connected ? "Connected" : "Connecting"}
            </p>
            {stats && (
              <div className="lobby-stats">
                <span><span className="stat-dot online" />{stats.online} Online</span>
                <span><span className="stat-dot members" />{stats.waiting} In queue</span>
              </div>
            )}
            {profileError && <p className="error">{profileError}</p>}
            {error && !duplicateSession && <p className="error">{error}</p>}
          </div>

          <div className="match-control">
            {waiting ? (
              <button className="secondary large" onClick={leaveQueue}>
                <X aria-hidden="true" />
                Cancel
              </button>
            ) : (
              <button className="primary large" onClick={startMatchSearch} disabled={!connected || cameraBlocked}>
                <Search aria-hidden="true" />
                Find match
              </button>
            )}
          </div>
        </section>}
      </div>

      <PageFooter />
    </main>
  );
}
