import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Workflow, Link2, Activity, ArrowUpRight, AlertTriangle } from "lucide-react";

interface Stats {
  automations: number;
  activeAutomations: number;
  connectedAccounts: number;
  eventsToday: number;
}

interface ExpiringAccount {
  id: string;
  account_name: string;
  platform: string;
  token_expires_at: string;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ automations: 0, activeAutomations: 0, connectedAccounts: 0, eventsToday: 0 });
  const [expiringSoon, setExpiringSoon] = useState<ExpiringAccount[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: total }, { count: active }, { count: accounts }, { count: events }] = await Promise.all([
        supabase.from("automations").select("*", { count: "exact", head: true }),
        supabase.from("automations").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("social_accounts_safe").select("*", { count: "exact", head: true }),
        supabase
          .from("automation_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      ]);
      setStats({
        automations: total ?? 0,
        activeAutomations: active ?? 0,
        connectedAccounts: accounts ?? 0,
        eventsToday: events ?? 0,
      });

      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: expiring } = await supabase
        .from("social_accounts_safe")
        .select("id, account_name, platform, token_expires_at")
        .not("token_expires_at", "is", null)
        .lte("token_expires_at", sevenDaysFromNow);
      setExpiringSoon((expiring as ExpiringAccount[]) ?? []);
    })();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl">
        <h1 className="font-display text-2xl font-semibold text-ivory">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-mute mt-1">Here's what's running across your channels.</p>

        {expiringSoon.length > 0 && (
          <div className="mt-6 p-4 rounded-node bg-amber/10 border border-amber/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-ivory font-medium">
                {expiringSoon.length} connected account{expiringSoon.length > 1 ? "s" : ""} expiring soon
              </p>
              <p className="text-xs text-mute mt-1">
                {expiringSoon.map((a) => `${a.account_name} (${a.platform})`).join(", ")} — reconnect under{" "}
                <Link to="/accounts" className="text-violet-soft hover:underline">Connected accounts</Link> to avoid a gap in automation.
              </p>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-4 gap-4 mt-8">
          <StatCard icon={<Workflow size={18} />} label="Automations" value={stats.automations} />
          <StatCard icon={<Activity size={18} />} label="Active now" value={stats.activeAutomations} accent="text-mint" />
          <StatCard icon={<Link2 size={18} />} label="Connected accounts" value={stats.connectedAccounts} />
          <StatCard icon={<Activity size={18} />} label="Events today" value={stats.eventsToday} />
        </div>

        {stats.connectedAccounts === 0 && (
          <div className="mt-8 p-6 rounded-node bg-panel border border-line flex items-center justify-between">
            <div>
              <h3 className="font-display font-medium text-ivory">Connect your first account</h3>
              <p className="text-sm text-mute mt-1">Link Instagram, Facebook, or WhatsApp to start building automations.</p>
            </div>
            <Link to="/accounts" className="flex items-center gap-1.5 px-4 py-2 rounded-node bg-violet text-white text-sm font-medium hover:bg-violet-soft transition-colors">
              Connect <ArrowUpRight size={15} />
            </Link>
          </div>
        )}

        <div className="mt-8 p-6 rounded-node bg-panel2 border border-line">
          <h3 className="font-display font-medium text-ivory mb-2">This is a beta release</h3>
          <p className="text-sm text-mute">
            AutoFlow is under active development. Review the{" "}
            <a href="https://github.com/nadeemmhdm/autoflow-saas" target="_blank" rel="noopener noreferrer" className="text-violet-soft hover:underline">
              GitHub repo
            </a>{" "}
            for known limitations before connecting production accounts, and always test automations on a low-traffic account first.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: string }) {
  return (
    <div className="p-5 rounded-node bg-panel border border-line">
      <div className={`mb-3 ${accent ?? "text-violet-soft"}`}>{icon}</div>
      <div className="text-2xl font-display font-semibold text-ivory">{value}</div>
      <div className="text-xs text-mute mt-1">{label}</div>
    </div>
  );
}
