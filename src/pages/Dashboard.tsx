import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Workflow, Link2, Activity, ArrowUpRight } from "lucide-react";

interface Stats {
  automations: number;
  activeAutomations: number;
  connectedAccounts: number;
  eventsToday: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ automations: 0, activeAutomations: 0, connectedAccounts: 0, eventsToday: 0 });

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
    })();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl">
        <h1 className="font-display text-2xl font-semibold text-ivory">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-mute mt-1">Here's what's running across your channels.</p>

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
