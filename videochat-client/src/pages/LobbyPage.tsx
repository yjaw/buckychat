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

const SUBTITLES = [
  "Who will you meet today?",
  "Jump in and start a conversation.",
  "Your campus community is waiting.",
  "A new face is just one click away.",
  "Every great conversation starts somewhere.",
  "Someone out there is ready to chat.",
  "Make someone's day — say hello.",
  "You never know who you'll meet.",
  "The best talks happen unexpectedly.",
  "Connect with a fellow Badger right now.",
];

const RANDOM_SUBTITLE = SUBTITLES[Math.floor(Math.random() * SUBTITLES.length)];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

export function LobbyPage() {
  const navigate = useNavigate();
  const { profile, profileError, signOut } = useAuth();
  const { connectionState, queueState, activeMatch, error, joinQueue, leaveQueue } = useMatch();
  const wsError = connectionState === "error";

  const { stats, refresh: refreshStats } = useStats(60_000);

  useEffect(() => {
    if (activeMatch) {
      navigate(`/call/${activeMatch.roomID}`, { state: activeMatch });
    }
  }, [activeMatch, navigate]);

  useEffect(() => {
    if (connectionState === "connected") refreshStats();
  }, [connectionState, refreshStats]);

  const connected = connectionState === "connected";
  const waiting = queueState === "waiting";
  const duplicateSession = error === "duplicate_session";
  const { state: cameraPermission } = useCameraPermission();
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
            <p className={`status ${connected ? "ok" : "warn"}`}>
              {connected ? "Connected" : "Connecting"}
            </p>
            <h1>{`Good ${getGreeting()}, ${profile?.email?.split("@")[0]}`}</h1>
            <p>{RANDOM_SUBTITLE}</p>
            {profileError && <p className="error">{profileError}</p>}
            {error && !duplicateSession && <p className="error">{error}</p>}
          </div>

          <div className="match-control">
            <div className="lobby-stats">
              <span><span className="stat-dot online" />{Math.max(stats?.online ?? 1, 1)} Online</span>
              <span><span className="stat-dot members" />{stats?.waiting ?? 0} In queue</span>
            </div>
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
