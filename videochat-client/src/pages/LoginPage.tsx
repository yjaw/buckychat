import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <main className="center-screen">
      <section className="panel auth-panel">
        <div>
          <p className="eyebrow">BuckyChat</p>
          <h1>Sign in with your wisc.edu account</h1>
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
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" type="submit" disabled={loading}>
            <LogIn aria-hidden="true" />
            {loading ? "Signing in" : "Sign in"}
          </button>
        </form>
        <p className="muted">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
