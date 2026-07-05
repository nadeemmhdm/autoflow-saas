import { useEffect, useState } from "react";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface AuditRow {
  id: string;
  action: string;
  ip_address: string | null;
  created_at: string;
  user_id: string | null;
}

interface SecretStatus {
  name: string;
  state: "missing" | "configured" | "looks_invalid";
}

export default function AdminPanel() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [secrets, setSecrets] = useState<SecretStatus[] | null>(null);
  const [secretsError, setSecretsError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("audit_log")
      .select("id, action, ip_address, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setLogs((data as AuditRow[]) ?? []));

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secrets-health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) setSecretsError(body.error ?? "Failed to check secrets");
      else setSecrets(body.secrets);
    })();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl space-y-10">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ivory">Admin</h1>
          <p className="text-mute mt-1">Platform health and security audit — visible to admins only.</p>
        </div>

        <div>
          <h2 className="font-display font-medium text-ivory mb-3">Secrets health</h2>
          <p className="text-xs text-mute mb-4">
            Shows whether each Edge Function secret is set — never the actual value.
          </p>
          {secretsError && <p className="text-sm text-coral">{secretsError}</p>}
          {secrets && (
            <div className="grid sm:grid-cols-2 gap-2">
              {secrets.map((s) => (
                <div key={s.name} className="flex items-center gap-2 p-3 rounded-node bg-panel border border-line text-sm">
                  {s.state === "configured" && <CheckCircle2 size={15} className="text-mint shrink-0" />}
                  {s.state === "missing" && <XCircle size={15} className="text-coral shrink-0" />}
                  {s.state === "looks_invalid" && <AlertTriangle size={15} className="text-amber shrink-0" />}
                  <span className="text-ivory font-mono text-xs truncate">{s.name}</span>
                  <span className="ml-auto text-xs text-mute capitalize">{s.state.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display font-medium text-ivory mb-3">Audit log</h2>
          <div className="rounded-node border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-panel2 text-mute text-left">
                <tr>
                  <th className="px-4 py-2 font-normal">Action</th>
                  <th className="px-4 py-2 font-normal">User</th>
                  <th className="px-4 py-2 font-normal">IP</th>
                  <th className="px-4 py-2 font-normal">When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-line">
                    <td className="px-4 py-2 text-ivory">{l.action}</td>
                    <td className="px-4 py-2 text-mute font-mono text-xs">{l.user_id?.slice(0, 8) ?? "—"}</td>
                    <td className="px-4 py-2 text-mute">{l.ip_address ?? "—"}</td>
                    <td className="px-4 py-2 text-mute">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
