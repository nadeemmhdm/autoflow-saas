import { Handle, Position } from "reactflow";
import { Zap } from "lucide-react";

export interface TriggerNodeData {
  label: string;
  triggerType: string;
  keyword?: string;
}

export function TriggerNode({ data }: { data: TriggerNodeData }) {
  return (
    <div className="rounded-node bg-panel2 border border-mint/40 px-4 py-3 w-56 shadow-sm">
      <div className="flex items-center gap-2 text-mint text-xs font-mono uppercase tracking-wide mb-1">
        <Zap size={13} /> Trigger
      </div>
      <div className="text-ivory text-sm font-medium">{data.label}</div>
      {data.keyword && <div className="text-xs text-mute mt-1">keyword: "{data.keyword}"</div>}
      <Handle type="source" position={Position.Right} className="!bg-mint !w-2.5 !h-2.5" />
    </div>
  );
}
