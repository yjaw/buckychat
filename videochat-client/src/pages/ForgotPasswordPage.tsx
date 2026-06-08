import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, MailCheck } from "lucide-react";
import { BuckyChatLogo } from "../components/BuckyChatLogo";
import { hasWiscDomain, normalizeEmail } from "../lib/email";
import { getPasswordResetRedirectTo, supabase } from "../lib/supabase";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return normalizeEmail(params.get("email") ?? "");
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    setMessage(null);
    setError(null);

    if (!hasWiscDomain(normalizedEmail)) {
      setError("Use your exact wisc.edu email address.");
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: getPasswordResetRedirectTo()
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setEmail(normalizedEmail);
      setMessage(`Password reset link sent to ${normalizedEmail}.`);
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

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "Sending reset link" : "Send reset link"}
            </button>
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
