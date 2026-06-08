import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CheckCircle2, Loader2 } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { BuckyChatLogo } from "../components/BuckyChatLogo";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const allowedOtpTypes = new Set(["email", "signup"]);
type ConfirmationStatus = "checking" | "verified" | "error";

export function ConfirmSignupPage() {
  const { refreshProfile } = useAuth();
  const startedVerification = useRef(false);
  const [status, setStatus] = useState<ConfirmationStatus>("checking");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startedVerification.current) {
      return;
    }
    startedVerification.current = true;

    async function verifyAccount() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash")?.trim();
      const type = params.get("type")?.trim() || "email";

      if (!tokenHash) {
        setError("This confirmation link is missing its token.");
        setStatus("error");
        return;
      }
      if (!allowedOtpTypes.has(type)) {
        setError("This confirmation link is not valid for signup.");
        setStatus("error");
        return;
      }

      setError(null);
      setStatus("checking");

      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as EmailOtpType
        });

        if (verifyError) {
          const { data: currentUser } = await supabase.auth.getUser();
          if (currentUser.user?.email && isUsedOrExpiredLink(verifyError.message)) {
            setVerifiedEmail(currentUser.user.email);
            setStatus("verified");
            await refreshProfile();
            return;
          }

          setError(
            isUsedOrExpiredLink(verifyError.message)
              ? "This link was already used or has expired. Try signing in, or resend the confirmation email."
              : verifyError.message
          );
          setStatus("error");
          return;
        }

        const email = data.user?.email ?? data.session?.user.email;
        if (email) {
          setVerifiedEmail(email);
        }
        setStatus("verified");
        await refreshProfile();
      } catch (unknownError) {
        setError(unknownError instanceof Error ? unknownError.message : "Could not verify account.");
        setStatus("error");
      }
    }

    void verifyAccount();
  }, [refreshProfile]);

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="confirm-signup-title">
        <Link className="login-brand" to="/" aria-label="BuckyChat home">
          <BuckyChatLogo markClassName="login-brand-mark" />
        </Link>

        <div className="login-shell">
          <div className="login-heading">
            <h1 id="confirm-signup-title">
              {status === "error"
                ? "Confirmation needs attention"
                : status === "verified"
                  ? "Account verified"
                  : "Verifying account"}
            </h1>
            <p>
              {status === "verified"
                ? "Your wisc.edu account is ready for BuckyChat"
                : status === "error"
                  ? "We could not finish your email confirmation"
                : "Checking your wisc.edu confirmation link"}
            </p>
          </div>

          {status === "error" && (
            <div className="login-form">
              <p className="error">{error}</p>
              <Link className="login-submit login-submit-link" to="/login">
                Go to sign in
              </Link>
            </div>
          )}

          {status === "verified" && (
            <div className="login-form">
              <CheckCircle2 className="status-icon success-icon" aria-hidden="true" />
              <p className="success">
                You have already verified your account: {verifiedEmail ?? "your wisc.edu email"}.
              </p>
            </div>
          )}

          {status === "checking" && (
            <div className="login-form">
              <Loader2 className="spin status-icon" aria-hidden="true" />
              <p className="muted">Verifying account...</p>
            </div>
          )}
        </div>
      </section>

      <aside className="login-story" aria-label="Email verification story">
        <Link className="login-doc-link" to="/">
          <BookOpen aria-hidden="true" />
          Home
        </Link>
        <figure>
          <blockquote>
            A verified campus email keeps BuckyChat focused on real UW-Madison
            conversations.
          </blockquote>
          <figcaption>
            <span className="login-avatar" aria-hidden="true">
              BC
            </span>
            <span>Email verification</span>
          </figcaption>
        </figure>
      </aside>
    </main>
  );
}

function isUsedOrExpiredLink(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("invalid") || normalized.includes("expired");
}
