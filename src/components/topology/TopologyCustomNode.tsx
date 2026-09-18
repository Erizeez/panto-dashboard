import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Server,
  ShieldCheck,
  Zap,
  Globe,
  Layers,
} from 'lucide-react';

export interface TopologyNodeData {
  id: string;
  kind: string;
  underlay?: string;
  effectiveMtu?: number;
  overhead?: number;
  path?: string[];
  dependents?: string[];
  category?: 'endpoint' | 'group';
  current?: string;
  membersCount?: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
}

export function TopologyCustomNode({
  data,
  targetPosition = Position.Left,
  sourcePosition = Position.Right,
}: NodeProps) {
  const nodeData = data as unknown as TopologyNodeData;
  const isGroup = nodeData.category === 'group';
  const isWan = nodeData.id === 'wan' || nodeData.kind === 'direct';
  const isIkev2 = nodeData.kind === 'ikev2';
  const isSelected = Boolean(nodeData.isSelected);
  const isHighlighted = Boolean(nodeData.isHighlighted);

  // 渲染图标
  const renderIcon = () => {
    if (isGroup) return <Layers className="w-4 h-4 text-emerald-400" />;
    if (isIkev2) return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
    if (nodeData.kind === 'ss') return <Zap className="w-4 h-4 text-amber-400" />;
    if (isWan) return <Globe className="w-4 h-4 text-cyan-400" />;
    return <Server className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div
      className={`relative w-[240px] rounded-xl p-3.5 transition-all text-xs select-none backdrop-blur-md ${
        isSelected
          ? 'bg-indigo-950/90 border-2 border-indigo-500 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-500/40'
          : isHighlighted
          ? 'bg-slate-900/90 border-indigo-500/80 shadow-lg shadow-indigo-950/50'
          : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
      }`}
    >
      {/* 进出 Handle 锚点 */}
      <Handle
        type="target"
        position={targetPosition}
        className="w-2.5 h-2.5 bg-indigo-400 border-2 border-slate-900"
      />
      <Handle
        type="source"
        position={sourcePosition}
        className="w-2.5 h-2.5 bg-indigo-400 border-2 border-slate-900"
      />

      {/* 头部：图标、ID 与类型 */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 truncate">
          <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 shrink-0">
            {renderIcon()}
          </div>
          <div className="truncate">
            <span className="font-bold text-slate-100 font-mono text-xs truncate block">
              {nodeData.id}
            </span>
            <span className="text-[10px] text-slate-400 font-sans">
              {isGroup ? '策略路由组' : isWan ? '底层物理出向' : '出口协议端点'}
            </span>
          </div>
        </div>

        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold shrink-0 ${
            isGroup
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : isIkev2
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          {nodeData.kind}
        </span>
      </div>

      {/* 中间指标栏 */}
      {isGroup ? (
        <div className="space-y-1 pt-1 border-t border-slate-800/80 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">活跃端点:</span>
            <span className="font-mono text-emerald-400 font-semibold truncate max-w-[120px]">
              {nodeData.current}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500 text-[10px]">
            <span>成员总数:</span>
            <span className="font-mono">{nodeData.membersCount} 个候选节点</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">底链 (Underlay):</span>
            <span className="font-mono text-cyan-300 font-medium truncate max-w-[110px]">
              {nodeData.underlay || '(物理直接出网)'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400">
              MTU: <strong className="text-slate-200 font-mono">{nodeData.effectiveMtu}</strong>
            </span>
            <span
              className={`font-mono px-1 rounded ${
                (nodeData.overhead ?? 0) > 0
                  ? 'text-amber-300 bg-amber-500/10 border border-amber-500/20'
                  : 'text-slate-400'
              }`}
            >
              +{nodeData.overhead ?? 0} B
            </span>
          </div>

          {nodeData.path && nodeData.path.length > 1 && (
            <div className="pt-1 flex items-center gap-1 font-mono text-[10px] text-slate-400 overflow-hidden truncate">
              <span className="text-slate-500 shrink-0">链:</span>
              <span className="text-indigo-300/90 truncate flex items-center gap-0.5">
                {nodeData.path.join(' ➔ ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
