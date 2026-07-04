import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Node, Edge } from "reactflow";
import { FlowBuilder } from "../components/AutomationBuilder/FlowBuilder";
import { supabase } from "../lib/supabaseClient";
import { ArrowLeft, Save, Play, Pause } from "lucide-react";

export default function AutomationBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("Untitled automation");
  const [status, setStatus] = useState<"draft" | "active" | "paused">("draft");
  const [platform, setPlatform] = useState("instagram");
  const [saving, setSaving] = useState(false);
  const flowRef = useRef<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const [loadedFlow, setLoadedFlow] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("automations")
      .select("name, status, platform, flow_definition")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setName(data.name);
        setStatus(data.status);
        setPlatform(data.platform);
        const flow = data.flow_definition as { nodes: Node[]; edges: Edge[] };
        setLoadedFlow(flow);
        flowRef.current = flow;
      });
  }, [id]);

  const handleFlowChange = useCallback((nodes: Node[], edges: Edge[]) => {
    flowRef.current = { nodes, edges };
  }, []);

  const save = async (newStatus?: "draft" | "active" | "paused") => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      name,
      platform,
      flow_definition: flowRef.current,
    };
    if (newStatus) payload.status = newStatus;
    await supabase.from("automations").update(payload).eq("id", id);
    if (newStatus) setStatus(newStatus);
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      <header className="border-b border-line px-6 py-3 flex items-center justify-between bg-panel">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/automations")} className="text-mute hover:text-ivory">
            <ArrowLeft size={18} />
          </button>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent text-ivory font-display font-medium text-lg outline-none border-b border-transparent focus:border-line"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-panel2 border border-line rounded-node text-sm text-ivory px-2 py-1"
          >
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => save()}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-node border border-line text-sm text-ivory hover:border-violet-soft"
          >
            <Save size={15} /> {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            onClick={() => save(status === "active" ? "paused" : "active")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-node text-sm font-medium ${
              status === "active" ? "bg-amber text-ink" : "bg-mint text-ink"
            }`}
          >
            {status === "active" ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Activate</>}
          </button>
        </div>
      </header>

      <div className="flex-1">
        {loadedFlow !== null || !id ? (
          <FlowBuilder
            initialNodes={loadedFlow?.nodes ?? []}
            initialEdges={loadedFlow?.edges ?? []}
            onChange={handleFlowChange}
          />
        ) : (
          <div className="p-8 text-mute">Loading…</div>
        )}
      </div>
    </div>
  );
}
