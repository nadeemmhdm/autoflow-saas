import { Handle, Position } from "reactflow";
import { Send, Image, Link as LinkIcon, Clock, UserCheck } from "lucide-react";

export interface ActionNodeData {
  label: string;
  actionType: "send_text" | "send_image" | "send_link" | "delay" | "human_handoff";
  content?: string;
  seconds?: number;
}

const icons = {
  send_text: Send,
  send_image: Image,
  send_link: LinkIcon,
  delay: Clock,
  human_handoff: UserCheck,
};

export function ActionNode({ data }: { data: ActionNodeData }) {
  const Icon = icons[data.actionType] ?? Send;
  const isHandoff = data.actionType === "human_handoff";
  return (
    <div className={`rounded-node bg-panel2 border px-4 py-3 w-56 shadow-sm ${isHandoff ? "border-amber/50" : "border-coral/40"}`}>
      <Handle type="target" position={Position.Left} className="!bg-coral !w-2.5 !h-2.5" />
      <div className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wide mb-1 ${isHandoff ? "text-amber" : "text-coral"}`}>
        <Icon size={13} /> {isHandoff ? "Human handoff" : "Action"}
      </div>
      <div className="text-ivory text-sm font-medium">{data.label}</div>
      {data.content && <div className="text-xs text-mute mt-1 truncate">"{data.content}"</div>}
      {data.seconds !== undefined && <div className="text-xs text-mute mt-1">{data.seconds}s delay</div>}
      {isHandoff && <div className="text-xs text-mute mt-1">Pauses automation for this contact</div>}
      <Handle type="source" position={Position.Right} className="!bg-line !w-2.5 !h-2.5" />
    </div>
  );
}
