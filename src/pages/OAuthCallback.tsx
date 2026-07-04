import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const platform = params.get("state");
    const oauthError = params.get("error_description");

    if (oauthError) {
      setError(oauthError);
      return;
    }
    if (!code || !platform) {
      setError("Missing authorization code.");
      return;
    }

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-callback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, platform, redirect_uri: `${window.location.origin}/oauth/callback` }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to connect account.");
        return;
      }
      navigate("/accounts");
    })();
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink text-ivory">
      {error ? (
        <div className="text-center">
          <p className="text-coral mb-3">{error}</p>
          <button onClick={() => navigate("/accounts")} className="text-violet-soft hover:underline">
            Back to accounts
          </button>
        </div>
      ) : (
        <p className="text-mute">Finishing connection…</p>
      )}
    </div>
  );
}
