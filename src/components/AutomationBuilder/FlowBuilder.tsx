import { useCallback, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { TriggerNode } from "./nodes/TriggerNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { ActionNode } from "./nodes/ActionNode";
import { Zap, GitFork, Send, Image, Link as LinkIcon, Clock, UserCheck } from "lucide-react";
import { validateOutgoingUrl } from "../../lib/validation";

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

const paletteItems = [
  { type: "trigger", label: "Comment received", icon: Zap, defaults: { label: "Comment received", triggerType: "comment_keyword" } },
  { type: "trigger", label: "DM received", icon: Zap, defaults: { label: "DM received", triggerType: "dm_keyword" } },
  { type: "condition", label: "Keyword match", icon: GitFork, defaults: { label: "Keyword match", matchType: "contains", value: "price" } },
  { type: "action", label: "Send text", icon: Send, defaults: { label: "Send text", actionType: "send_text", content: "Thanks for reaching out!" } },
  { type: "action", label: "Send image", icon: Image, defaults: { label: "Send image", actionType: "send_image" } },
  { type: "action", label: "Send link", icon: LinkIcon, defaults: { label: "Send link", actionType: "send_link" } },
  { type: "action", label: "Delay", icon: Clock, defaults: { label: "Wait", actionType: "delay", seconds: 30 } },
  { type: "action", label: "Human handoff", icon: UserCheck, defaults: { label: "Hand off to human", actionType: "human_handoff" } },
];

let idCounter = 1;
const nextId = () => `node_${idCounter++}`;

interface FlowBuilderProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onChange: (nodes: Node[], edges: Edge[]) => void;
}

function Builder({ initialNodes = [], initialEdges = [], onChange }: FlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const emitChange = useCallback(
    (n: Node[], e: Edge[]) => onChange(n, e),
    [onChange]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge({ ...connection, animated: true, style: { stroke: "#5A43B8" } }, eds);
        emitChange(nodes, next);
        return next;
      });
    },
    [nodes, setEdges, emitChange]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/autoflow-node");
      if (!raw || !rfInstance || !wrapperRef.current) return;
      const item = JSON.parse(raw);
      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = rfInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      const newNode: Node = {
        id: nextId(),
        type: item.type,
        position,
        data: { ...item.defaults },
      };
      setNodes((nds) => {
        const next = nds.concat(newNode);
        emitChange(next, edges);
        return next;
      });
    },
    [rfInstance, edges, setNodes, emitChange]
  );

  const updateSelectedNodeData = (patch: Record<string, unknown>) => {
    setNodes((nds) => {
      const next = nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n));
      emitChange(next, edges);
      return next;
    });
  };

  const deleteSelectedNode = () => {
    setNodes((nds) => {
      const next = nds.filter((n) => n.id !== selectedNodeId);
      setEdges((eds) => {
        const nextEdges = eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId);
        emitChange(next, nextEdges);
        return nextEdges;
      });
      return next;
    });
    setSelectedNodeId(null);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex h-full">
      {/* Palette */}
      <div className="w-56 shrink-0 border-r border-line bg-panel p-4 space-y-2 overflow-y-auto">
        <p className="text-xs uppercase tracking-wide text-mute mb-2">Drag onto the canvas</p>
        {paletteItems.map((item, i) => (
          <div
            key={i}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("application/autoflow-node", JSON.stringify(item))}
            className="flex items-center gap-2 px-3 py-2 rounded-node bg-panel2 border border-line text-sm text-ivory cursor-grab hover:border-violet-soft transition-colors"
          >
            <item.icon size={15} className="text-mute" />
            {item.label}
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1" ref={wrapperRef} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(c) => {
            onNodesChange(c);
            emitChange(nodes, edges);
          }}
          onEdgesChange={(c) => {
            onEdgesChange(c);
            emitChange(nodes, edges);
          }}
          onConnect={onConnect}
          onInit={setRfInstance}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#2E2E40" gap={20} />
          <Controls />
          <MiniMap nodeColor="#2E2E40" maskColor="rgba(18,18,26,0.7)" />
        </ReactFlow>
      </div>

      {/* Property panel */}
      {selectedNode && (
        <div className="w-72 shrink-0 border-l border-line bg-panel p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-mute">Edit {selectedNode.type}</p>
            <button onClick={deleteSelectedNode} className="text-xs text-coral hover:underline">Delete</button>
          </div>

          <div>
            <label className="block text-xs text-mute mb-1">Label</label>
            <input
              value={selectedNode.data.label ?? ""}
              onChange={(e) => updateSelectedNodeData({ label: e.target.value })}
              className="w-full px-2.5 py-2 rounded-node bg-panel2 border border-line text-sm text-ivory outline-none focus:border-violet-soft"
            />
          </div>

          {selectedNode.type === "condition" && (
            <>
              <div>
                <label className="block text-xs text-mute mb-1">Match type</label>
                <select
                  value={selectedNode.data.matchType}
                  onChange={(e) => updateSelectedNodeData({ matchType: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-node bg-panel2 border border-line text-sm text-ivory"
                >
                  <option value="contains">Contains</option>
                  <option value="exact">Exact match</option>
                  <option value="starts_with">Starts with</option>
                  <option value="regex">Regex</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-mute mb-1">Keyword / value</label>
                <input
                  value={selectedNode.data.value ?? ""}
                  onChange={(e) => updateSelectedNodeData({ value: e.target.value })}
                  maxLength={200}
                  className="w-full px-2.5 py-2 rounded-node bg-panel2 border border-line text-sm text-ivory outline-none focus:border-violet-soft"
                />
              </div>
            </>
          )}

          {selectedNode.type === "action" && selectedNode.data.actionType !== "human_handoff" && selectedNode.data.actionType !== "delay" && (
            <div>
              <label className="block text-xs text-mute mb-1">
                {selectedNode.data.actionType === "send_link" ? "Link URL" : "Message"}
              </label>
              <textarea
                value={selectedNode.data.content ?? ""}
                onChange={(e) => updateSelectedNodeData({ content: e.target.value })}
                rows={4}
                maxLength={2000}
                className="w-full px-2.5 py-2 rounded-node bg-panel2 border border-line text-sm text-ivory outline-none focus:border-violet-soft"
              />
              <p className="text-[11px] text-mute mt-1">{(selectedNode.data.content ?? "").length}/2000</p>
              {selectedNode.data.actionType === "send_link" && selectedNode.data.content && (() => {
                const check = validateOutgoingUrl(selectedNode.data.content);
                return !check.ok ? <p className="text-[11px] text-coral mt-1">{check.reason}</p> : null;
              })()}
            </div>
          )}

          {selectedNode.type === "action" && selectedNode.data.actionType === "delay" && (
            <div>
              <label className="block text-xs text-mute mb-1">Delay (seconds)</label>
              <input
                type="number" min={1} max={3600}
                value={selectedNode.data.seconds ?? 30}
                onChange={(e) => updateSelectedNodeData({ seconds: Number(e.target.value) })}
                className="w-full px-2.5 py-2 rounded-node bg-panel2 border border-line text-sm text-ivory outline-none focus:border-violet-soft"
              />
            </div>
          )}

          {selectedNode.type === "action" && selectedNode.data.actionType === "human_handoff" && (
            <p className="text-xs text-mute">This pauses automation for the contact so a person can take over in the Inbox.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function FlowBuilder(props: FlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <Builder {...props} />
    </ReactFlowProvider>
  );
}
