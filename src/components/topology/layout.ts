import dagre from '@dagrejs/dagre';
import { Position, type Node, type Edge } from '@xyflow/react';
import type { TopologyNode, GroupItem } from '../../api';

export interface TopologyLayoutOptions {
  direction?: 'LR' | 'TB';
  includeGroups?: boolean;
  selectedNodeId?: string | null;
}

export function buildGraphElements(
  topoNodes: TopologyNode[],
  groups: GroupItem[],
  options: TopologyLayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const { direction = 'LR', includeGroups = true, selectedNodeId = null } = options;
  const isHorizontal = direction === 'LR';

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: isHorizontal ? 50 : 80,
    ranksep: isHorizontal ? 140 : 100,
    marginx: 40,
    marginy: 40,
  });

  const rawNodes: Node[] = [];
  const rawEdges: Edge[] = [];

  // 获取选中节点展开的路径集合，用于高亮显示
  const highlightedSet = new Set<string>();
  if (selectedNodeId) {
    highlightedSet.add(selectedNodeId);
    const targetNode = topoNodes.find((n) => n.id === selectedNodeId);
    if (targetNode?.path) {
      targetNode.path.forEach((p) => highlightedSet.add(p));
    }
  }

  // 1. 添加端点与底层依赖节点
  for (const node of topoNodes) {
    const isSelected = selectedNodeId === node.id;
    const isHighlighted = highlightedSet.has(node.id);

    g.setNode(node.id, { width: 240, height: 110 });
    rawNodes.push({
      id: node.id,
      type: 'customTopology',
      position: { x: 0, y: 0 },
      data: {
        id: node.id,
        kind: node.kind,
        underlay: node.underlay,
        effectiveMtu: node.effective_mtu,
        overhead: node.overhead,
        path: node.path,
        dependents: node.dependents,
        category: 'endpoint',
        isSelected,
        isHighlighted,
      },
    });

    // 端点指向其 Underlay 链路
    if (node.underlay) {
      const isEdgeHighlighted =
        highlightedSet.has(node.id) && highlightedSet.has(node.underlay);

      g.setEdge(node.id, node.underlay);
      rawEdges.push({
        id: `edge-${node.id}->${node.underlay}`,
        source: node.id,
        target: node.underlay,
        animated: true,
        style: {
          stroke: isEdgeHighlighted ? '#6366f1' : '#475569',
          strokeWidth: isEdgeHighlighted ? 2.5 : 1.5,
          strokeDasharray: isEdgeHighlighted ? undefined : '5,5',
        },
      });
    }
  }

  // 2. 可选：将策略组（Group）作为上层调度器加入拓扑图中
  if (includeGroups && groups.length > 0) {
    for (const group of groups) {
      const groupId = `group-${group.id}`;
      const isGroupSelected = selectedNodeId === groupId;
      const isGroupHighlighted = group.current ? highlightedSet.has(group.current) : false;

      g.setNode(groupId, { width: 240, height: 100 });
      rawNodes.push({
        id: groupId,
        type: 'customTopology',
        position: { x: 0, y: 0 },
        data: {
          id: group.id,
          kind: group.kind,
          current: group.current,
          membersCount: group.members.length,
          category: 'group',
          isSelected: isGroupSelected,
          isHighlighted: isGroupHighlighted,
        },
      });

      // 策略组指向其当前活跃节点（实线加粗带流动光束）
      if (group.current) {
        g.setEdge(groupId, group.current);
        rawEdges.push({
          id: `edge-${groupId}->${group.current}`,
          source: groupId,
          target: group.current,
          animated: true,
          style: {
            stroke: '#10b981',
            strokeWidth: 2,
          },
        });
      }
    }
  }

  // 执行 Dagre 分层拓扑布局
  dagre.layout(g);

  // 映射回节点坐标并显式注入宽高，确保 MiniMap 缩略图准确绘制
  const positionedNodes: Node[] = rawNodes.map((node) => {
    const layoutNode = g.node(node.id);
    const w = layoutNode?.width || 240;
    const h = layoutNode?.height || 110;
    return {
      ...node,
      width: w,
      height: h,
      style: { width: w, height: h },
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: (layoutNode?.x ?? 0) - w / 2,
        y: (layoutNode?.y ?? 0) - h / 2,
      },
    };
  });

  return { nodes: positionedNodes, edges: rawEdges };
}
