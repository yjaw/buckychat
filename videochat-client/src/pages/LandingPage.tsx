import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BuckyChatLogo } from "../components/BuckyChatLogo";
import { PageFooter } from "../components/PageFooter";
import { useStats } from "../hooks/useStats";

const techStack = [
  { name: "GitHub", src: "/github.png", logoClass: "github" },
  { name: "Vercel", src: "/vercel.png", logoClass: "vercel" },
  { name: "Cloudflare", src: "/cloudflare.png", logoClass: "cloudflare" },
  { name: "Railway", src: "/railway.png", logoClass: "railway" },
  { name: "Resend", src: "/resend.png", logoClass: "resend" },
  { name: "PostHog", src: "/posthog.svg", logoClass: "posthog" },
];

export function LandingPage() {
  const { stats } = useStats(null);

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
            <span className="landing-title-main">Where badgers</span>
            <span>make new friends</span>
          </h1>
          <ol className="landing-steps">
            <li>Create an account</li>
            <li>Jump into a room</li>
            <li>Chat with amazing new people!</li>
          </ol>
          <div className="landing-stats">
            <span><span className="stat-dot online" />{(stats?.online ?? 0).toLocaleString()} Online</span>
            <span><span className="stat-dot gray" />{(stats?.userCount ?? 0).toLocaleString()} Badger{(stats?.userCount ?? 0) !== 1 ? "s" : ""}</span>
          </div>

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
                        loading="eager"
                      />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <p>
            Powered by these great PaaS platforms, maintained with love by{" "}
            <a
              href="https://www.linkedin.com/in/yjaw/"
            >
              a passionate badger
            </a>
          </p>
        </div>
      </section>

      <PageFooter />
    </main>
  );
}
