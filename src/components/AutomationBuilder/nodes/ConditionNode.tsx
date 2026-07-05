import { Handle, Position } from "reactflow";
import { GitFork } from "lucide-react";

export interface ConditionNodeData {
  label: string;
  matchType: "contains" | "exact" | "regex" | "starts_with";
  value: string;
}

export function ConditionNode({ data }: { data: ConditionNodeData }) {
  return (
    <div className="rounded-node bg-panel2 border border-violet/50 px-4 py-3 w-56 shadow-sm">
      <Handle type="target" position={Position.Left} className="!bg-violet !w-2.5 !h-2.5" />
      <div className="flex items-center gap-2 text-violet-soft text-xs font-mono uppercase tracking-wide mb-1">
        <GitFork size={13} /> Condition
      </div>
      <div className="text-ivory text-sm font-medium">{data.label}</div>
      <div className="text-xs text-mute mt-1">{data.matchType}: "{data.value}"</div>
      <Handle type="source" position={Position.Right} id="yes" className="!bg-mint !w-2.5 !h-2.5" style={{ top: "35%" }} />
      <Handle type="source" position={Position.Right} id="no" className="!bg-coral !w-2.5 !h-2.5" style={{ top: "70%" }} />
    </div>
  );
}
