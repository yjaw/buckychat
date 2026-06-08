import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const allowedOtpTypes = new Set(["email", "signup"]);

export function ConfirmSignupPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [tokenHash, setTokenHash] = useState("");
  const [type, setType] = useState<EmailOtpType>("email");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextTokenHash = params.get("token_hash")?.trim();
    const nextType = params.get("type")?.trim() || "email";

    if (!nextTokenHash) {
      setError("This confirmation link is missing its token.");
      return;
    }
    if (!allowedOtpTypes.has(nextType)) {
      setError("This confirmation link is not valid for signup.");
      return;
    }

    setTokenHash(nextTokenHash);
    setType(nextType as EmailOtpType);
  }, []);

  async function confirmAccount() {
    if (!tokenHash) {
      return;
    }

    setError(null);
    setVerifying(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type
      });
      if (verifyError) {
        setError(
          verifyError.message.toLowerCase().includes("invalid") ||
            verifyError.message.toLowerCase().includes("expired")
            ? "This link was already used or has expired. Try signing in, or resend the confirmation email."
            : verifyError.message
        );
        return;
      }

      await refreshProfile();
      navigate("/lobby", { replace: true });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className="center-screen">
      <section className="panel narrow">
        {error ? (
          <>
            <h1>Confirmation needs attention</h1>
            <p className="error">{error}</p>
            <Link className="text-link" to="/login">
              Go to sign in
            </Link>
          </>
        ) : tokenHash ? (
          <>
            <h1>Confirm your account</h1>
            <p className="muted">Finish verifying your wisc.edu email.</p>
            <button className="primary" type="button" onClick={confirmAccount} disabled={verifying}>
              {verifying && <Loader2 className="spin" aria-hidden="true" />}
              {verifying ? "Confirming" : "Confirm account"}
            </button>
          </>
        ) : (
          <>
            <Loader2 className="spin" aria-hidden="true" />
            <h1>Preparing confirmation</h1>
          </>
        )}
      </section>
    </main>
  );
}
