import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Node, Edge } from "reactflow";
import { FlowBuilder } from "../components/AutomationBuilder/FlowBuilder";
import { supabase } from "../lib/supabaseClient";
import { ArrowLeft, Save, Play, Pause, FlaskConical, X } from "lucide-react";

interface TestResult {
  matched: boolean;
  paths?: { condition: any; matched: boolean; action: any }[];
  error?: string;
}

export default function AutomationBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("Untitled automation");
  const [status, setStatus] = useState<"draft" | "active" | "paused">("draft");
  const [platform, setPlatform] = useState("instagram");
  const [dailyLimit, setDailyLimit] = useState(500);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [saving, setSaving] = useState(false);
  const flowRef = useRef<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const [loadedFlow, setLoadedFlow] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const [showSandbox, setShowSandbox] = useState(false);
  const [sampleText, setSampleText] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("automations")
      .select("name, status, platform, flow_definition, daily_limit, hourly_limit")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setName(data.name);
        setStatus(data.status);
        setPlatform(data.platform);
        setDailyLimit(data.daily_limit ?? 500);
        setHourlyLimit(data.hourly_limit ?? 100);
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
      daily_limit: dailyLimit,
      hourly_limit: hourlyLimit,
    };
    if (newStatus) payload.status = newStatus;
    await supabase.from("automations").update(payload).eq("id", id);
    if (newStatus) setStatus(newStatus);
    setSaving(false);
  };

  const runTest = async () => {
    if (!sampleText.trim() || !id) return;
    setTesting(true);
    setTestResult(null);
    try {
      // Save the current flow first so the sandbox tests what's on screen,
      // not the last-saved version.
      await save();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-automation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ automation_id: id, sample_text: sampleText }),
      });
      const body = await res.json();
      setTestResult(res.ok ? body : { matched: false, error: body.error });
    } catch (err) {
      setTestResult({ matched: false, error: String(err) });
    } finally {
      setTesting(false);
    }
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
          <div className="hidden md:flex items-center gap-3 text-xs text-mute pl-2 border-l border-line">
            <label className="flex items-center gap-1.5">
              Daily limit
              <input
                type="number" min={1} max={10000} value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="w-16 bg-panel2 border border-line rounded px-1.5 py-0.5 text-ivory"
              />
            </label>
            <label className="flex items-center gap-1.5">
              Hourly limit
              <input
                type="number" min={1} max={2000} value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-16 bg-panel2 border border-line rounded px-1.5 py-0.5 text-ivory"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSandbox(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-node border border-line text-sm text-ivory hover:border-violet-soft"
          >
            <FlaskConical size={15} /> Test
          </button>
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

      {showSandbox && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-panel border border-line rounded-node max-w-lg w-full">
            <div className="flex items-center justify-between p-5 border-b border-line">
              <h2 className="font-display text-lg font-semibold text-ivory flex items-center gap-2">
                <FlaskConical size={18} className="text-violet-soft" /> Test this automation
              </h2>
              <button onClick={() => setShowSandbox(false)} className="text-mute hover:text-ivory">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-mute mb-3">
                Simulate an incoming comment or message. Nothing is sent for real, and this doesn't count against your rate limits.
              </p>
              <textarea
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                placeholder="e.g. what's the price?"
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-node bg-panel2 border border-line text-ivory outline-none focus:border-violet-soft"
              />
              <button
                onClick={runTest}
                disabled={testing || !sampleText.trim()}
                className="mt-3 w-full py-2.5 rounded-node bg-violet text-white text-sm font-medium hover:bg-violet-soft disabled:opacity-50"
              >
                {testing ? "Running…" : "Run test"}
              </button>

              {testResult && (
                <div className="mt-4 p-4 rounded-node bg-panel2 border border-line">
                  {testResult.error ? (
                    <p className="text-sm text-coral">{testResult.error}</p>
                  ) : testResult.matched ? (
                    <div className="space-y-2">
                      <p className="text-sm text-mint">✓ Matched</p>
                      {testResult.paths?.filter((p) => p.matched).map((p, i) => (
                        <div key={i} className="text-xs text-mute">
                          {p.condition && <span>Condition "{p.condition.value}" matched → </span>}
                          <span className="text-ivory">
                            {p.action?.actionType === "human_handoff" ? "Hand off to human" : `Send: "${p.action?.content ?? ""}"`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-mute">No condition matched this text — nothing would be sent.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
