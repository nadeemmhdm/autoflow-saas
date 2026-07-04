import { useEffect, useState } from "react";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Trash2, Copy, KeyRound } from "lucide-react";

interface ApiKey {
  id: string;
  key_name: string;
  key_prefix: string;
  scopes: string[];
  revoked: boolean;
  last_used_at: string | null;
  created_at: string;
}

// Generates a random API key client-side, hashes it before it ever reaches
// the server, and shows the raw value to the user exactly once.
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

  const load = async () => {
    const { data } = await supabase
      .from("api_keys")
      .select("id, key_name, key_prefix, scopes, revoked, last_used_at, created_at")
      .order("created_at", { ascending: false });
    setKeys((data as ApiKey[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const createKey = async () => {
    if (!newKeyName.trim() || !user) return;
    const { raw, prefix, hash } = await generateKey();
    await supabase.from("api_keys").insert({
      user_id: user.id,
      key_name: newKeyName,
      key_prefix: prefix,
      key_hash: hash,
      scopes: ["read", "automations:write"],
    });
    setRevealedKey(raw);
    setNewKeyName("");
    load();
  };

  const revoke = async (id: string) => {
    await supabase.from("api_keys").update({ revoked: true }).eq("id", id);
    load();
  };

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

        <div className="mt-6 flex gap-2">
          <input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name, e.g. Zapier integration"
            className="flex-1 px-3.5 py-2.5 rounded-node bg-panel border border-line text-ivory outline-none focus:border-violet-soft"
          />
          <button onClick={createKey} className="flex items-center gap-1.5 px-4 py-2.5 rounded-node bg-violet text-white text-sm font-medium hover:bg-violet-soft">
            <Plus size={16} /> Generate
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
                </div>
              </div>
              {k.revoked ? (
                <span className="text-xs text-coral">revoked</span>
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
