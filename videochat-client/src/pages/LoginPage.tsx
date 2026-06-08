import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { BuckyChatLogo } from "../components/BuckyChatLogo";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    await refreshProfile();
    navigate("/lobby", { replace: true });
  }

  function onForgotPassword() {
    setError("Password reset is not configured for BuckyChat yet.");
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <Link className="login-brand" to="/" aria-label="BuckyChat home">
          <BuckyChatLogo markClassName="login-brand-mark" />
        </Link>

        <div className="login-shell">
          <div className="login-heading">
            <h1 id="login-title">Welcome back</h1>
            <p>Sign in to your account</p>
          </div>

          <form onSubmit={onSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="login-field">
              <div className="login-field-row">
                <label htmlFor="login-password">Password</label>
                <button className="login-text-button" type="button" onClick={onForgotPassword}>
                  Forgot password?
                </button>
              </div>
              <span className="password-control">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </div>

            {error && <p className="error">{error}</p>}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "Signing in" : "Sign in"}
            </button>
          </form>

          <p className="login-switch">
            Don&apos;t have an account? <Link to="/register">Sign up</Link>
          </p>

          <p className="login-terms">
            By continuing, you agree to BuckyChat&apos;s{" "}
            <Link to="/terms">Terms of Service</Link> and{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </section>

      <aside className="login-story" aria-label="BuckyChat story">
        <Link className="login-doc-link" to="/">
          <BookOpen aria-hidden="true" />
          Home
        </Link>
        <figure>
          <blockquote>
            BuckyChat makes it easy to turn a quiet moment on campus into a real
            face-to-face conversation.
          </blockquote>
          <figcaption>
            <span className="login-avatar" aria-hidden="true">
              BC
            </span>
            <span>@buckychat</span>
          </figcaption>
        </figure>
      </aside>
    </main>
  );
}
