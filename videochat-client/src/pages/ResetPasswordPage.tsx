import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { BuckyChatLogo } from "../components/BuckyChatLogo";
import { supabase } from "../lib/supabase";

type ResetStatus = "checking" | "ready" | "success" | "error";

export function ResetPasswordPage() {
  const startedSessionCheck = useRef(false);
  const [status, setStatus] = useState<ResetStatus>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (startedSessionCheck.current) {
      return;
    }
    startedSessionCheck.current = true;

    async function checkResetSession() {
      const urlError = authUrlError();
      if (urlError) {
        setError(urlError);
        setStatus("error");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const nextTokenHash = params.get("token_hash")?.trim();
      const type = params.get("type")?.trim() || "recovery";

      if (nextTokenHash) {
        if (type !== "recovery") {
          setError("This reset link is not valid for password recovery.");
          setStatus("error");
          return;
        }

        setTokenHash(nextTokenHash);
        setStatus("ready");
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setError(sessionError.message);
        setStatus("error");
        return;
      }

      if (!data.session) {
        setError("This reset link is invalid or expired. Request a new password reset link.");
        setStatus("error");
        return;
      }

      setEmail(data.session.user.email ?? null);
      setStatus("ready");
    }

    void checkResetSession();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (tokenHash) {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery" as EmailOtpType
        });

        if (verifyError) {
          setError("Email link is invalid or has expired.");
          setStatus("error");
          return;
        }

        clearResetTokenFromUrl();
        setTokenHash(null);
        setEmail(data.user?.email ?? data.session?.user.email ?? null);
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setMessage("Password updated. Sign in with your new password.");
      setStatus("success");
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="reset-password-title">
        <Link className="login-brand" to="/" aria-label="BuckyChat home">
          <BuckyChatLogo markClassName="login-brand-mark" />
        </Link>

        <div className="login-shell">
          <div className="login-heading">
            <h1 id="reset-password-title">Choose new password</h1>
            <p>{email ? `Resetting ${email}` : "Finish your password reset"}</p>
          </div>

          {status === "checking" && <p className="muted login-state">Checking reset link...</p>}

          {status === "error" && (
            <div className="login-form">
              {error && <p className="error">{error}</p>}
              <Link className="login-submit login-submit-link" to="/forgot-password">
                Send a new reset link
              </Link>
            </div>
          )}

          {status === "success" && (
            <div className="login-form">
              {message && <p className="success">{message}</p>}
              <Link className="login-submit login-submit-link" to="/login">
                Sign in
              </Link>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={onSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="reset-password-new">New password</label>
                <span className="password-control">
                  <input
                    id="reset-password-new"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
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

              <div className="login-field">
                <label htmlFor="reset-password-confirm">Confirm password</label>
                <span className="password-control">
                  <input
                    id="reset-password-confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </span>
              </div>

              {error && <p className="error">{error}</p>}

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? "Updating password" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </section>

      <aside className="login-story" aria-label="Password reset story">
        <Link className="login-doc-link" to="/">
          <BookOpen aria-hidden="true" />
          Home
        </Link>
        <figure>
          <blockquote>
            Pick something sturdy, then jump back into the lobby with a clean
            sign-in.
          </blockquote>
          <figcaption>
            <span className="login-avatar" aria-hidden="true">
              BC
            </span>
            <span>Password reset</span>
          </figcaption>
        </figure>
      </aside>
    </main>
  );
}

function authUrlError() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    searchParams.get("error_description") ??
    hashParams.get("error_description") ??
    searchParams.get("error") ??
    hashParams.get("error")
  );
}

function clearResetTokenFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");
  window.history.replaceState(window.history.state, "", url.toString());
}
