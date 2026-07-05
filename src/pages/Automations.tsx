import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { Plus, Pause, Play, Workflow, X, LayoutTemplate } from "lucide-react";
import { AUTOMATION_TEMPLATES, blankFlow } from "../lib/templates";
import { automationNameSchema } from "../lib/validation";

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
  const [showTemplates, setShowTemplates] = useState(false);

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

  const createAutomation = async (templateKey?: string) => {
    const template = AUTOMATION_TEMPLATES.find((t) => t.key === templateKey);
    const flow = template ? { nodes: template.nodes, edges: template.edges } : blankFlow();
    const name = automationNameSchema.safeParse(template?.name ?? "Untitled automation");

    const { data, error } = await supabase
      .from("automations")
      .insert({
        name: name.success ? name.data : "Untitled automation",
        platform: template?.platform ?? "instagram",
        trigger_type: template?.triggerType ?? "comment_keyword",
        flow_definition: flow,
        template_key: templateKey ?? null,
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-node border border-line text-ivory text-sm hover:border-violet-soft transition-colors"
            >
              <LayoutTemplate size={16} /> Templates
            </button>
            <button
              onClick={() => createAutomation()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-node bg-violet text-white text-sm font-medium hover:bg-violet-soft transition-colors"
            >
              <Plus size={16} /> New automation
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {!loading && automations.length === 0 && (
            <div className="p-8 rounded-node border border-dashed border-line text-center text-mute">
              <Workflow className="mx-auto mb-3 text-mute" />
              No automations yet. Start from a template or create one from scratch.
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

      {showTemplates && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-panel border border-line rounded-node max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-line sticky top-0 bg-panel">
              <h2 className="font-display text-lg font-semibold text-ivory">Start from a template</h2>
              <button onClick={() => setShowTemplates(false)} className="text-mute hover:text-ivory">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => createAutomation()}
                className="text-left p-4 rounded-node border border-dashed border-line hover:border-violet-soft transition-colors"
              >
                <div className="text-ivory font-medium text-sm">Blank automation</div>
                <div className="text-xs text-mute mt-1">Start from scratch</div>
              </button>
              {AUTOMATION_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => createAutomation(t.key)}
                  className="text-left p-4 rounded-node border border-line hover:border-violet-soft transition-colors"
                >
                  <div className="text-ivory font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-mute mt-1">{t.description}</div>
                  <div className="text-xs text-violet-soft mt-2 capitalize">{t.platform}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
