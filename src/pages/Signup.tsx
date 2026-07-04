import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function passwordStrengthOk(pw: string) {
  return pw.length >= 10 && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
}

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordStrengthOk(password)) {
      setError("Password needs at least 10 characters, one uppercase letter, and one number.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setNotice("Check your inbox to confirm your email, then log in.");
    setTimeout(() => navigate("/login"), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display font-semibold text-xl text-ivory">AutoFlow</Link>
        <h1 className="mt-6 text-2xl font-display font-semibold text-ivory">Create your workspace</h1>
        <p className="text-mute text-sm mt-1">Free to start. No card required.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm text-mute mb-1.5" htmlFor="fullName">Full name</label>
            <input
              id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-node bg-panel border border-line text-ivory focus:border-violet-soft outline-none"
            />
          </div>
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
              id="password" type="password" required autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-node bg-panel border border-line text-ivory focus:border-violet-soft outline-none"
            />
            <p className="text-xs text-mute mt-1">10+ characters, 1 uppercase letter, 1 number.</p>
          </div>

          {error && <p className="text-sm text-coral">{error}</p>}
          {notice && <p className="text-sm text-mint">{notice}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-node bg-violet text-white font-medium hover:bg-violet-soft transition-colors disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-mute">
          Already have an account? <Link to="/login" className="text-violet-soft hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
