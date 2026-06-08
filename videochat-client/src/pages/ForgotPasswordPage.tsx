import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, MailCheck } from "lucide-react";
import { BuckyChatLogo } from "../components/BuckyChatLogo";
import { CooldownSubmitButton } from "../components/CooldownSubmitButton";
import { hasWiscDomain, normalizeEmail } from "../lib/email";
import { getPasswordResetRedirectTo, supabase } from "../lib/supabase";

const resetCooldownSeconds = 60;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return normalizeEmail(params.get("email") ?? "");
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [resetEmail, setResetEmail] = useState<string | null>(null);

  useEffect(() => {
    if (resetCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResetCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resetCooldown]);

  const normalizedCurrentEmail = normalizeEmail(email);
  const resetLocked = resetCooldown > 0 && resetEmail === normalizedCurrentEmail;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    setMessage(null);
    setError(null);

    if (!hasWiscDomain(normalizedEmail)) {
      setError("Use your exact wisc.edu email address.");
      return;
    }
    if (resetLocked) {
      setError(`Please wait ${resetCooldown}s before sending another reset link.`);
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: getPasswordResetRedirectTo()
      });

      if (resetError && !isAccountLookupResetError(resetError.message)) {
        setError(resetError.message);
        return;
      }

      setEmail(normalizedEmail);
      setResetEmail(normalizedEmail);
      setResetCooldown(resetCooldownSeconds);
      setMessage(
        `Reset link sent. If ${normalizedEmail} belongs to a BuckyChat account, check your inbox and spam folder.`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="forgot-password-title">
        <Link className="login-brand" to="/" aria-label="BuckyChat home">
          <BuckyChatLogo markClassName="login-brand-mark" />
        </Link>

        <div className="login-shell">
          <div className="login-heading">
            <h1 id="forgot-password-title">Reset password</h1>
            <p>Send a reset link to your wisc.edu inbox</p>
          </div>

          <form onSubmit={onSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="forgot-password-email">Email</label>
              <input
                id="forgot-password-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@wisc.edu"
                autoComplete="email"
                required
              />
            </div>

            {error && <p className="error">{error}</p>}
            {message && <p className="success">{message}</p>}

            <CooldownSubmitButton
              cooldownLabel={(seconds) => `Send again in ${seconds}s`}
              cooldownSeconds={resetLocked ? resetCooldown : 0}
              cooldownTotalSeconds={resetCooldownSeconds}
              loading={loading}
              loadingLabel="Sending reset link"
            >
              {resetEmail === normalizedCurrentEmail ? "Send another reset link" : "Send reset link"}
            </CooldownSubmitButton>
          </form>

          <p className="login-switch">
            Remembered it? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>

      <aside className="login-story" aria-label="Password reset story">
        <Link className="login-doc-link" to="/">
          <BookOpen aria-hidden="true" />
          Home
        </Link>
        <figure>
          <blockquote>
            A fresh password should get you back to campus conversations without
            making you jump through extra hoops.
          </blockquote>
          <figcaption>
            <span className="login-avatar" aria-hidden="true">
              <MailCheck aria-hidden="true" />
            </span>
            <span>Password help</span>
          </figcaption>
        </figure>
      </aside>
    </main>
  );
}

function isAccountLookupResetError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("user not found") ||
    normalized.includes("not registered") ||
    normalized.includes("does not exist") ||
    normalized.includes("not found")
  );
}
