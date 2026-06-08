import { Link } from "react-router-dom";
import { ArrowRight, PlayCircle } from "lucide-react";
import { BuckyChatLogo } from "../components/BuckyChatLogo";

const audienceLabels = ["Clubs", "Classes", "Events", "Study groups", "Open mic"];

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="BuckyChat home">
          <BuckyChatLogo markClassName="landing-mark" />
        </Link>

        <div className="landing-actions">
          <Link className="landing-button subtle" to="/login">
            Sign in
          </Link>
          <Link className="landing-button accent" to="/register">
            Start a room
          </Link>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <h1 id="landing-title">
            <span className="landing-title-main">Meet in seconds</span>
            <span>Go live together</span>
          </h1>
          <p>
            BuckyChat is a simple live video lobby for campus communities. Create an
            account, jump into a room, and start face-to-face conversations without
            the noise.
          </p>
          <div className="landing-cta-row">
            <Link className="landing-button accent large" to="/register">
              Start a room
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="landing-button subtle large" to="/login">
              <PlayCircle aria-hidden="true" />
              Watch the lobby
            </Link>
          </div>
        </div>

        <div className="landing-audience" aria-label="Made for campus communities">
          <div className="landing-audience-row">
            {audienceLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <p>Made for fast-moving UW-Madison communities</p>
        </div>
      </section>

      <footer className="landing-legal">
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
      </footer>
    </main>
  );
}
