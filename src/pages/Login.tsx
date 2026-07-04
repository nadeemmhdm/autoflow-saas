import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      // Never reveal whether the email exists — avoid account enumeration.
      setError("Invalid email or password.");
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display font-semibold text-xl text-ivory">AutoFlow</Link>
        <h1 className="mt-6 text-2xl font-display font-semibold text-ivory">Welcome back</h1>
        <p className="text-mute text-sm mt-1">Log in to manage your automations.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm text-mute mb-1.5" htmlFor="email">Email</label>
            <input
              id="email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-node bg-panel border border-line text-ivory focus:border-violet-soft outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-mute mb-1.5" htmlFor="password">Password</label>
            <input
              id="password" type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-node bg-panel border border-line text-ivory focus:border-violet-soft outline-none"
            />
          </div>

          {error && <p className="text-sm text-coral">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-node bg-violet text-white font-medium hover:bg-violet-soft transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-mute">
          Don't have an account? <Link to="/signup" className="text-violet-soft hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
