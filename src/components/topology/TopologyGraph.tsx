import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TopologyCustomNode } from './TopologyCustomNode';

const nodeTypes = {
  customTopology: TopologyCustomNode,
};

interface TopologyGraphProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onSelectNode: (nodeId: string | null) => void;
}

export function TopologyGraph({
  nodes,
  edges,
  onSelectNode,
}: TopologyGraphProps) {
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  const onPaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  return (
    <div className="w-full h-full min-h-[560px] rounded-xl overflow-hidden relative border border-slate-800/80 bg-[#070b14]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={24} size={1.5} />
        <Controls
          showInteractive={false}
          className="rounded-xl overflow-hidden shadow-2xl"
        />
        <MiniMap
          nodeStrokeWidth={1.5}
          nodeStrokeColor="#0f172a"
          nodeBorderRadius={4}
          zoomable
          pannable
          nodeColor={(n) => {
            const data = n.data as Record<string, unknown> | undefined;
            if (data?.category === 'group') return '#10b981'; // 策略组：翡翠绿
            if (n.id === 'wan' || data?.kind === 'direct') return '#06b6d4'; // 直连WAN：青色
            if (data?.kind === 'ikev2') return '#38bdf8'; // IKEv2：天蓝
            if (data?.kind === 'ss') return '#f59e0b'; // Shadowsocks：琥珀金
            if (data?.kind === 'socks5') return '#818cf8'; // Socks5：靛蓝
            return '#6366f1';
          }}
          maskColor="rgba(11, 15, 23, 0.75)"
          maskStrokeColor="#6366f1"
          maskStrokeWidth={1.5}
          style={{ width: 190, height: 130 }}
          className="rounded-xl overflow-hidden shadow-2xl"
        />
      </ReactFlow>
    </div>
  );
}
