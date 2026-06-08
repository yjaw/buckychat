import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BuckyChatLogo } from "../components/BuckyChatLogo";

const techStack = [
  { name: "GitHub", src: "/github.png", logoClass: "github" },
  { name: "Vercel", src: "/vercel.png", logoClass: "vercel" },
  { name: "Cloudflare", src: "/cloudflare.png", logoClass: "cloudflare" },
  { name: "Railway", src: "/railway.png", logoClass: "railway" },
  { name: "Resend", src: "/resend.png", logoClass: "resend" },
];

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
            Sign up
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
            <Link className="landing-button accent large" to="/login">
              Start to chat
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="landing-audience" aria-label="BuckyChat platform partners">
          <div
            className="landing-tech-marquee"
            aria-label={`BuckyChat is powered by ${techStack
              .map((tech) => tech.name)
              .join(", ")}`}
          >
            <div className="landing-tech-track" aria-hidden="true">
              {[0, 1].map((copyIndex) => (
                <div className="landing-tech-group" key={copyIndex}>
                  {techStack.map((tech) => (
                    <span className="landing-tech-item" key={`${tech.name}-${copyIndex}`}>
                      <img
                        className={`landing-tech-logo ${tech.logoClass}`}
                        src={tech.src}
                        alt=""
                        loading="lazy"
                      />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <p>BuckyChat is powered by these companies and an unemployed CS graduate</p>
        </div>
      </section>

      <footer className="landing-legal">
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
      </footer>
    </main>
  );
}
