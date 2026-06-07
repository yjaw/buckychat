import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MailPlus, RefreshCcw } from "lucide-react";
import { getAuthRedirectTo, supabase } from "../lib/supabase";

const resendCooldownSeconds = 60;

function hasWiscDomain(email: string) {
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 && parts[1] === "wisc.edu";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function authErrorMessage(message: string) {
  if (message.toLowerCase().includes("error sending confirmation email")) {
    return "Supabase could not send the confirmation email. Check custom SMTP, sender verification, and Auth logs.";
  }

  return message;
}

function authErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  const authError = error as Error & {
    code?: string;
    status?: number;
  };

  return JSON.stringify(
    {
      name: authError.name,
      status: authError.status,
      code: authError.code,
      message: authError.message
    },
    null,
    2
  );
}

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const resendLocked = resendCooldown > 0;
  const resendProgress = ((resendCooldownSeconds - resendCooldown) / resendCooldownSeconds) * 100;
  const normalizedCurrentEmail = normalizeEmail(email);
  const emailOnCooldown = Boolean(
    confirmationEmail && confirmationEmail === normalizedCurrentEmail && resendLocked
  );
  const showingResendAction = Boolean(confirmationEmail);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (showingResendAction) {
      await onResendConfirmation();
      return;
    }

    setMessage(null);
    setError(null);
    setErrorDetails(null);
    setConfirmationEmail(null);

    const normalizedEmail = normalizeEmail(email);

    if (!hasWiscDomain(normalizedEmail)) {
      setError("Use your exact wisc.edu email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (emailOnCooldown) {
      setError(`Please wait ${resendCooldown}s before sending another confirmation email.`);
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: getAuthRedirectTo()
        }
      });

      if (authError) {
        setError(authErrorMessage(authError.message));
        setErrorDetails(authErrorDetails(authError));
        return;
      }

      setConfirmationEmail(normalizedEmail);
      setResendCooldown(resendCooldownSeconds);
      if (data.session) {
        setMessage("Account created. Email confirmation is not required for this project.");
        return;
      }

      setMessage("Check your wisc.edu inbox to confirm your account.");
    } finally {
      setLoading(false);
    }
  }

  async function onResendConfirmation() {
    const targetEmail = confirmationEmail ?? normalizeEmail(email);
    setMessage(null);
    setError(null);
    setErrorDetails(null);

    if (!hasWiscDomain(targetEmail)) {
      setError("Use your exact wisc.edu email address.");
      return;
    }
    if (resendLocked) {
      setError(`Please wait ${resendCooldown}s before resending.`);
      return;
    }

    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: {
          emailRedirectTo: getAuthRedirectTo()
        }
      });

      if (resendError) {
        setError(authErrorMessage(resendError.message));
        setErrorDetails(authErrorDetails(resendError));
        return;
      }

      setConfirmationEmail(targetEmail);
      setResendCooldown(resendCooldownSeconds);
      setMessage("Confirmation email sent. Check your wisc.edu inbox and spam folder.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="center-screen">
      <section className="panel auth-panel">
        <div>
          <p className="eyebrow">BuckyChat</p>
          <h1>Create your campus account</h1>
        </div>
        <form onSubmit={onSubmit} className="form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@wisc.edu"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          {errorDetails && <pre className="code-block">{errorDetails}</pre>}
          {message && <p className="success">{message}</p>}
          <button
            className={showingResendAction && !resendLocked ? "primary active" : "primary"}
            type="submit"
            disabled={loading || resending || emailOnCooldown}
          >
            {showingResendAction ? <RefreshCcw aria-hidden="true" /> : <MailPlus aria-hidden="true" />}
            {loading
              ? "Creating account"
              : resending
                ? "Sending confirmation"
                : emailOnCooldown
                  ? `Resend in ${resendCooldown}s`
                  : showingResendAction
                    ? "Resend confirmation"
                    : "Create account"}
          </button>
          {confirmationEmail && resendLocked && (
            <div className="cooldown" aria-label={`${resendCooldown} seconds before resend is available`}>
              <span style={{ width: `${resendProgress}%` }} />
            </div>
          )}
        </form>
        <p className="muted">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
