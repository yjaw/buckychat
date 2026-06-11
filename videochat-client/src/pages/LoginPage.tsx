import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { BuckyChatLogo } from "../components/BuckyChatLogo";
import { LoginStory } from "../components/LoginStory";
import { WiscEmailInput, toWiscEmail } from "../components/WiscEmailInput";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const unconfirmed = searchParams.get("unconfirmed") === "1";
  const { refreshProfile } = useAuth();
  const [netid, setNetid] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: toWiscEmail(netid),
      password
    });

    if (authError) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    await refreshProfile();
    navigate("/lobby", { replace: true });
  }

  function onForgotPassword() {
    const full = netid.trim() ? toWiscEmail(netid) : "";
    const target = full
      ? `/forgot-password?email=${encodeURIComponent(full)}`
      : "/forgot-password";
    navigate(target);
  }

  return (
    <main className="login-page with-page-header">
      <header className="landing-header page-header">
        <Link className="landing-brand" to="/" aria-label="BuckyChat home">
          <BuckyChatLogo markClassName="landing-mark" />
        </Link>
      </header>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-shell">
          <div className="login-heading">
            <h1 id="login-title">Welcome back</h1>
            <p>Sign in to your account</p>
          </div>

          <form onSubmit={onSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-email">Email</label>
              <WiscEmailInput id="login-email" value={netid} onChange={setNetid} />
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

            {unconfirmed && (
              <p className="notice">
                Please confirm your wisc.edu email before signing in. Check your inbox for the confirmation link.
              </p>
            )}
            {error && <p className="error">{error}</p>}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "Signing in" : "Sign in"}
            </button>
          </form>

          <p className="login-switch">
            Don&apos;t have an account? <Link to="/register">Sign up</Link>
          </p>

        </div>

          <p className="login-terms">
            By continuing, you agree to BuckyChat&apos;s{" "}
            <Link to="/terms">Terms of Service</Link> and{" "}
            <Link to="/privacy">Privacy Policy</Link>, and to receive periodic emails with updates.
          </p>
      </section>

      <LoginStory
        quote="BuckyChat makes it easy to turn a quiet moment on campus into a real face-to-face conversation."
        caption="@buckychat"
        avatar="BC"
        wallpaper="wallpaper2.png"
      />
    </main>
  );
}
