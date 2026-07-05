import { useEffect, useState } from "react";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { AtSign, Send, MessageCircle, Pause, Play, Tag } from "lucide-react";

interface Conversation {
  id: string;
  platform: "instagram" | "facebook" | "whatsapp";
  contact_external_id: string;
  contact_name: string | null;
  tags: string[];
  notes: string | null;
  automation_paused: boolean;
  last_event_at: string | null;
}

interface LogEntry {
  id: string;
  action_taken: string | null;
  status: string;
  created_at: string;
}

const platformIcon = { instagram: AtSign, facebook: Send, whatsapp: MessageCircle };

export default function Inbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [notesDraft, setNotesDraft] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("id, platform, contact_external_id, contact_name, tags, notes, automation_paused, last_event_at")
      .order("last_event_at", { ascending: false });
    setConversations((data as Conversation[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const openConversation = async (c: Conversation) => {
    setSelected(c);
    setNotesDraft(c.notes ?? "");
    const { data } = await supabase
      .from("automation_logs")
      .select("id, action_taken, status, created_at")
      .eq("conversation_id", c.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs((data as LogEntry[]) ?? []);
  };

  const togglePause = async (c: Conversation) => {
    await supabase.from("conversations").update({ automation_paused: !c.automation_paused }).eq("id", c.id);
    load();
    if (selected?.id === c.id) setSelected({ ...c, automation_paused: !c.automation_paused });
  };

  const saveNotes = async () => {
    if (!selected) return;
    await supabase.from("conversations").update({ notes: notesDraft }).eq("id", selected.id);
    load();
  };

  return (
    <DashboardLayout>
      <div className="flex h-screen">
        <div className="w-80 border-r border-line overflow-y-auto">
          <div className="p-4 border-b border-line">
            <h1 className="font-display text-lg font-semibold text-ivory">Inbox</h1>
            <p className="text-xs text-mute mt-1">Every contact your automations have talked to.</p>
          </div>
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-mute">No conversations yet — they'll appear here once an automation runs.</p>
          )}
          {conversations.map((c) => {
            const Icon = platformIcon[c.platform];
            return (
              <button
                key={c.id}
                onClick={() => openConversation(c)}
                className={`w-full text-left px-4 py-3 border-b border-line hover:bg-panel2 transition-colors ${selected?.id === c.id ? "bg-panel2" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} className="text-mute shrink-0" />
                  <span className="text-sm text-ivory truncate">{c.contact_name ?? c.contact_external_id}</span>
                  {c.automation_paused && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber/15 text-amber shrink-0">paused</span>}
                </div>
                {c.last_event_at && (
                  <p className="text-xs text-mute mt-1">{new Date(c.last_event_at).toLocaleString()}</p>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 p-6">
          {!selected ? (
            <p className="text-mute">Select a conversation to see its automation history.</p>
          ) : (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ivory">
                    {selected.contact_name ?? selected.contact_external_id}
                  </h2>
                  <p className="text-xs text-mute mt-1 capitalize">{selected.platform}</p>
                </div>
                <button
                  onClick={() => togglePause(selected)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-node text-sm font-medium ${
                    selected.automation_paused ? "bg-mint text-ink" : "bg-amber text-ink"
                  }`}
                >
                  {selected.automation_paused ? <><Play size={15} /> Resume automation</> : <><Pause size={15} /> Hand off to human</>}
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-mute">
                <Tag size={13} />
                {selected.tags.length ? selected.tags.join(", ") : "No tags yet"}
              </div>

              <div className="mt-6">
                <label className="block text-sm text-mute mb-1.5">Internal notes</label>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  onBlur={saveNotes}
                  rows={3}
                  placeholder="Notes only your team can see..."
                  className="w-full px-3.5 py-2.5 rounded-node bg-panel border border-line text-ivory outline-none focus:border-violet-soft"
                />
              </div>

              <div className="mt-6">
                <h3 className="font-display font-medium text-ivory mb-3">Automation history</h3>
                <div className="space-y-2">
                  {logs.length === 0 && <p className="text-sm text-mute">No automation activity yet.</p>}
                  {logs.map((l) => (
                    <div key={l.id} className="p-3 rounded-node bg-panel border border-line flex items-center justify-between text-sm">
                      <span className="text-ivory">{l.action_taken ?? "—"}</span>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            l.status === "success" ? "bg-mint/15 text-mint" : l.status === "failed" ? "bg-coral/15 text-coral" : "bg-line text-mute"
                          }`}
                        >
                          {l.status}
                        </span>
                        <span className="text-mute text-xs">{new Date(l.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
