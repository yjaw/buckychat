import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function finish() {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      }
      navigate("/lobby", { replace: true });
    }
    finish();
  }, [navigate]);

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

