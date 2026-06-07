import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const allowedOtpTypes = new Set(["email", "signup"]);

export function ConfirmSignupPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function finish() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash")?.trim();
      const type = params.get("type")?.trim() || "email";

      if (!tokenHash) {
        setError("This confirmation link is missing its token.");
        return;
      }
      if (!allowedOtpTypes.has(type)) {
        setError("This confirmation link is not valid for signup.");
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType
      });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      await refreshProfile();
      navigate("/lobby", { replace: true });
    }

    finish();
  }, [navigate, refreshProfile]);

  return (
    <main className="center-screen">
      <section className="panel narrow">
        {error ? (
          <>
            <h1>Confirmation failed</h1>
            <p className="error">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="spin" aria-hidden="true" />
            <h1>Confirming account</h1>
          </>
        )}
      </section>
    </main>
  );
}
