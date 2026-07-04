import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { Plus, Pause, Play, Workflow } from "lucide-react";

interface Automation {
  id: string;
  name: string;
  platform: string;
  trigger_type: string;
  status: "draft" | "active" | "paused";
  updated_at: string;
}

export default function Automations() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("automations")
      .select("id, name, platform, trigger_type, status, updated_at")
      .order("updated_at", { ascending: false });
    setAutomations((data as Automation[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createAutomation = async () => {
    const { data, error } = await supabase
      .from("automations")
      .insert({
        name: "Untitled automation",
        platform: "instagram",
        trigger_type: "comment_keyword",
      })
      .select("id")
      .single();
    if (!error && data) {
      window.location.href = `/automations/${data.id}`;
    }
  };

  const toggleStatus = async (a: Automation) => {
    const newStatus = a.status === "active" ? "paused" : "active";
    await supabase.from("automations").update({ status: newStatus }).eq("id", a.id);
    load();
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ivory">Automations</h1>
            <p className="text-mute mt-1">Drag-and-drop flows that run on your connected accounts.</p>
          </div>
          <button
            onClick={createAutomation}
            className="flex items-center gap-2 px-4 py-2.5 rounded-node bg-violet text-white text-sm font-medium hover:bg-violet-soft transition-colors"
          >
            <Plus size={16} /> New automation
          </button>
        </div>

        <div className="mt-8 space-y-3">
          {!loading && automations.length === 0 && (
            <div className="p-8 rounded-node border border-dashed border-line text-center text-mute">
              <Workflow className="mx-auto mb-3 text-mute" />
              No automations yet. Create your first one to get started.
            </div>
          )}

          {automations.map((a) => (
            <div key={a.id} className="p-4 rounded-node bg-panel border border-line flex items-center justify-between">
              <Link to={`/automations/${a.id}`} className="flex-1">
                <div className="text-ivory font-medium">{a.name}</div>
                <div className="text-xs text-mute mt-1 capitalize">{a.platform} · {a.trigger_type.replace("_", " ")}</div>
              </Link>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    a.status === "active" ? "bg-mint/15 text-mint" : a.status === "paused" ? "bg-amber/15 text-amber" : "bg-line text-mute"
                  }`}
                >
                  {a.status}
                </span>
                {a.status !== "draft" && (
                  <button onClick={() => toggleStatus(a)} className="p-2 rounded-node hover:bg-panel2 text-mute hover:text-ivory">
                    {a.status === "active" ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
