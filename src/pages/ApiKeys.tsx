import { useEffect, useState } from "react";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Trash2, Copy, KeyRound } from "lucide-react";
import { apiKeyNameSchema } from "../lib/validation";

interface ApiKey {
  id: string;
  key_name: string;
  key_prefix: string;
  scopes: string[];
  revoked: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const AVAILABLE_SCOPES = [
  { value: "logs:read", label: "Read logs" },
  { value: "automations:read", label: "Read automations" },
  { value: "automations:write", label: "Edit automations" },
  { value: "accounts:read", label: "Read connected accounts" },
];

const EXPIRY_OPTIONS = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
  { label: "Never expires", days: null },
];

async function generateKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = "af_live_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const prefix = raw.slice(0, 12);
  const enc = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, prefix, hash };
}

export default function ApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["logs:read"]);
  const [expiryDays, setExpiryDays] = useState<number | null>(90);

  const load = async () => {
    const { data } = await supabase
      .from("api_keys")
      .select("id, key_name, key_prefix, scopes, revoked, last_used_at, expires_at, created_at")
      .order("created_at", { ascending: false });
    setKeys((data as ApiKey[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  const createKey = async () => {
    const parsed = apiKeyNameSchema.safeParse(newKeyName);
    if (!parsed.success) {
      setNameError(parsed.error.issues[0].message);
      return;
    }
    setNameError(null);
    if (!user || selectedScopes.length === 0) return;

    const { raw, prefix, hash } = await generateKey();
    const expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString() : null;

    await supabase.from("api_keys").insert({
      user_id: user.id,
      key_name: parsed.data,
      key_prefix: prefix,
      key_hash: hash,
      scopes: selectedScopes,
      expires_at: expiresAt,
    });
    setRevealedKey(raw);
    setNewKeyName("");
    load();
  };

  const revoke = async (id: string) => {
    await supabase.from("api_keys").update({ revoked: true }).eq("id", id);
    load();
  };

  const isExpired = (k: ApiKey) => k.expires_at && new Date(k.expires_at) < new Date();

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl">
        <h1 className="font-display text-2xl font-semibold text-ivory">API keys</h1>
        <p className="text-mute mt-1">
          Use these to call the AutoFlow API from your own tools. Keys are hashed —
          if you lose one, revoke it and create a new one.
        </p>

        {revealedKey && (
          <div className="mt-6 p-4 rounded-node bg-mint/10 border border-mint/40">
            <p className="text-sm text-mint mb-2">Copy this now — it won't be shown again.</p>
            <div className="flex items-center gap-2 bg-panel px-3 py-2 rounded-node font-mono text-sm text-ivory">
              <span className="truncate">{revealedKey}</span>
              <button onClick={() => navigator.clipboard.writeText(revealedKey)} className="ml-auto text-mute hover:text-ivory shrink-0">
                <Copy size={15} />
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 rounded-node bg-panel border border-line space-y-4">
          <div>
            <label className="block text-sm text-mute mb-1.5">Key name</label>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Zapier integration"
              className="w-full px-3.5 py-2.5 rounded-node bg-panel2 border border-line text-ivory outline-none focus:border-violet-soft"
            />
            {nameError && <p className="text-xs text-coral mt-1">{nameError}</p>}
          </div>

          <div>
            <label className="block text-sm text-mute mb-1.5">Scopes</label>
            <div className="grid sm:grid-cols-2 gap-2">
              {AVAILABLE_SCOPES.map((s) => (
                <label key={s.value} className="flex items-center gap-2 text-sm text-ivory">
                  <input type="checkbox" checked={selectedScopes.includes(s.value)} onChange={() => toggleScope(s.value)} />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-mute mb-1.5">Expires</label>
            <select
              value={expiryDays ?? "never"}
              onChange={(e) => setExpiryDays(e.target.value === "never" ? null : Number(e.target.value))}
              className="px-3 py-2 rounded-node bg-panel2 border border-line text-sm text-ivory"
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.days ?? "never"}>{opt.label}</option>
              ))}
            </select>
          </div>

          <button onClick={createKey} className="flex items-center gap-1.5 px-4 py-2.5 rounded-node bg-violet text-white text-sm font-medium hover:bg-violet-soft">
            <Plus size={16} /> Generate key
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {keys.map((k) => (
            <div key={k.id} className="p-4 rounded-node bg-panel border border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <KeyRound size={16} className="text-mute" />
                <div>
                  <div className="text-ivory text-sm font-medium">{k.key_name}</div>
                  <div className="text-xs text-mute font-mono mt-0.5">{k.key_prefix}••••••••••••••••••••</div>
                  <div className="text-xs text-mute mt-1">
                    {k.scopes.join(", ")} · {k.expires_at ? `expires ${new Date(k.expires_at).toLocaleDateString()}` : "never expires"}
                    {k.last_used_at && ` · last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
              {k.revoked ? (
                <span className="text-xs text-coral">revoked</span>
              ) : isExpired(k) ? (
                <span className="text-xs text-amber">expired</span>
              ) : (
                <button onClick={() => revoke(k.id)} className="text-mute hover:text-coral">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
