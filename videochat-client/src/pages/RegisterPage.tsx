import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { BuckyChatLogo } from "../components/BuckyChatLogo";
import { LoginStory } from "../components/LoginStory";
import { WiscEmailInput, toWiscEmail } from "../components/WiscEmailInput";
import { CooldownSubmitButton } from "../components/CooldownSubmitButton";
import { getAuthRedirectTo, supabase } from "../lib/supabase";
import { hasWiscDomain, normalizeEmail } from "../lib/email";

const resendCooldownSeconds = 60;

function authErrorMessage(message: string) {
  if (message.toLowerCase().includes("error sending confirmation email")) {
    return "Supabase could not send the confirmation email. Check custom SMTP, sender verification, and Auth logs.";
  }
  if (isAlreadyRegisteredMessage(message)) {
    return "An account already exists for this email. Sign in instead.";
  }

  return message;
}

function isAlreadyRegisteredMessage(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("already registered") || normalized.includes("already exists");
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

function isExistingAccountResponse(data: Awaited<ReturnType<typeof supabase.auth.signUp>>["data"]) {
  return !data.session && Array.isArray(data.user?.identities) && data.user.identities.length === 0;
}

export function RegisterPage() {
  const [netid, setNetid] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
  const showingResendAction = Boolean(confirmationEmail);
  const resendButtonLocked = showingResendAction && resendLocked;

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

    const normalizedEmail = normalizeEmail(toWiscEmail(netid));

    if (!hasWiscDomain(normalizedEmail)) {
      setError("Use your exact wisc.edu email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
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

      if (isExistingAccountResponse(data)) {
        setError("An account already exists for this email. Sign in instead.");
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
    const targetEmail = confirmationEmail ?? normalizeEmail(toWiscEmail(netid));
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
    <main className="login-page with-page-header">
      <header className="landing-header page-header">
        <Link className="landing-brand" to="/" aria-label="BuckyChat home">
          <BuckyChatLogo markClassName="landing-mark" />
        </Link>
      </header>

      <section className="login-panel" aria-labelledby="register-title">
        <div className="login-shell">
          <div className="login-heading">
            <h1 id="register-title">Create your account</h1>
            <p>Join your campus video lobby</p>
          </div>

          <form onSubmit={onSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="register-email">Email</label>
              <WiscEmailInput id="register-email" value={netid} onChange={setNetid} />
            </div>

            <div className="login-field">
              <label htmlFor="register-password">Password</label>
              <span className="password-control">
                <input
                  id="register-password"
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

            {error && <p className="error">{error}</p>}
            {errorDetails && <pre className="code-block">{errorDetails}</pre>}
            {message && <p className="success">{message}</p>}

            <CooldownSubmitButton
              cooldownLabel={(seconds) => `Resend in ${seconds}s`}
              cooldownSeconds={resendButtonLocked ? resendCooldown : 0}
              cooldownTotalSeconds={resendCooldownSeconds}
              loading={loading || resending}
              loadingLabel={loading ? "Creating account" : "Sending confirmation"}
            >
              {showingResendAction ? "Resend confirmation" : "Create account"}
            </CooldownSubmitButton>
          </form>

          <p className="login-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>

          <p className="login-terms">
            By continuing, you agree to BuckyChat&apos;s{" "}
            <Link to="/terms">Terms of Service</Link> and{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </section>

      <LoginStory
        quote="A verified campus account keeps BuckyChat focused on real UW-Madison conversations."
        caption="@buckychat"
        avatar="BC"
      />
    </main>
  );
}
