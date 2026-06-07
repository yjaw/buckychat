import { Settings } from "lucide-react";
import { supabaseConfigIssues } from "../lib/supabase";

export function SetupPage() {
  return (
    <main className="center-screen">
      <section className="panel auth-panel">
        <Settings aria-hidden="true" />
        <div>
          <p className="eyebrow">BuckyChat</p>
          <h1>Supabase setup needed</h1>
        </div>
        <p className="muted">
          Add these frontend environment variables in `videochat-client/.env.local`,
          then restart the Vite dev server.
        </p>
        <pre className="code-block">{supabaseConfigIssues.join("\n")}</pre>
        <p className="muted">
          You can copy the values from your Supabase project settings. The setup
          steps are in `docs/supabase-setup.md`.
        </p>
      </section>
    </main>
  );
}
