import { useEffect, useState } from "react";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { supabase } from "../lib/supabaseClient";

interface AuditRow {
  id: string;
  action: string;
  ip_address: string | null;
  created_at: string;
  user_id: string | null;
}

export default function AdminPanel() {
  const [logs, setLogs] = useState<AuditRow[]>([]);

  useEffect(() => {
    supabase
      .from("audit_log")
      .select("id, action, ip_address, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setLogs((data as AuditRow[]) ?? []));
  }, []);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        <h1 className="font-display text-2xl font-semibold text-ivory">Admin · Audit log</h1>
        <p className="text-mute mt-1">Security-sensitive actions across the platform. Visible to admins only via RLS.</p>

        <div className="mt-6 rounded-node border border-line overflow-hidden">
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
    </DashboardLayout>
  );
}
