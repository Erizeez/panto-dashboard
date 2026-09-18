import React, { useState, useEffect, useMemo } from 'react';
import {
  Network,
  LayoutGrid,
  GitFork,
  Server,
  RefreshCw,
  Info,
  X,
} from 'lucide-react';
import { getTopology, getGroups, type TopologyNode, type GroupItem } from '../../api';
import { useI18n } from '../../i18n';
import { buildGraphElements } from './layout';
import { TopologyGraph } from './TopologyGraph';

export function TopologyPage() {
  const { t } = useI18n();
  const [topology, setTopology] = useState<TopologyNode[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'graph' | 'matrix'>('graph');
  const [direction, setDirection] = useState<'LR' | 'TB'>('LR');
  const [includeGroups, setIncludeGroups] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [topoRes, groupsRes] = await Promise.all([
        getTopology(),
        getGroups(),
      ]);
      if (topoRes.data?.nodes) {
        setTopology(topoRes.data.nodes);
      }
      if (groupsRes.data?.groups) {
        setGroups(groupsRes.data.groups);
      }
    } catch (e) {
      console.error('加载拓扑数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 计算 ReactFlow 节点与边
  const { nodes, edges } = useMemo(() => {
    return buildGraphElements(topology, groups, {
      direction,
      includeGroups,
      selectedNodeId,
    });
  }, [topology, groups, direction, includeGroups, selectedNodeId]);

  // 获取当前选中的节点对象
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return topology.find((n) => n.id === selectedNodeId) ?? null;
  }, [topology, selectedNodeId]);

  return (
    <div className="space-y-5 flex-1 flex flex-col h-full">
      {/* 头部标题与控制栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Network className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              {t('topo_title')}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t('topo_desc')}
          </p>
        </div>

        {/* 交互工具条 */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 视图模式切换 */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition font-medium ${
                viewMode === 'graph'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>{t('topo_view_graph')}</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition font-medium ${
                viewMode === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t('topo_view_matrix')}</span>
            </button>
          </div>

          {viewMode === 'graph' && (
            <>
              {/* 方向切换 */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                <button
                  onClick={() => setDirection('LR')}
                  className={`px-2.5 py-1.5 rounded-md transition font-medium ${
                    direction === 'LR'
                      ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="水平流向"
                >
                  {t('topo_layout_lr')}
                </button>
                <button
                  onClick={() => setDirection('TB')}
                  className={`px-2.5 py-1.5 rounded-md transition font-medium ${
                    direction === 'TB'
                      ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="垂直流向"
                >
                  {t('topo_layout_tb')}
                </button>
              </div>

              {/* 勾选展示策略组 */}
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={includeGroups}
                  onChange={(e) => setIncludeGroups(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span>{t('topo_include_groups')}</span>
              </label>
            </>
          )}

          {/* 刷新 */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="刷新数据"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 视图主体 */}
      {viewMode === 'graph' ? (
        <div className="flex-1 flex flex-col min-h-[560px] relative">
          <TopologyGraph
            nodes={nodes}
            edges={edges}
            onSelectNode={setSelectedNodeId}
          />

          {/* 选中节点参数详情抽屉 / 提示条 */}
          {selectedNode ? (
            <div className="mt-3 p-4 rounded-xl bg-slate-900/95 border border-indigo-500/50 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-indigo-300 font-mono">
                    {selectedNode.id}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase text-[10px] border border-slate-700">
                    {selectedNode.kind}
                  </span>
                  <span className="text-slate-400">
                    底链: <strong className="text-cyan-300 font-mono">{selectedNode.underlay || '(物理出网)'}</strong>
                  </span>
                  <span className="text-slate-400">
                    MTU: <strong className="text-slate-200 font-mono">{selectedNode.effective_mtu}</strong>
                  </span>
                  <span className="text-slate-400">
                    开销: <strong className="text-amber-300 font-mono">+{selectedNode.overhead} B</strong>
                  </span>
                </div>

                {selectedNode.path && selectedNode.path.length > 0 && (
                  <div className="flex items-center gap-1.5 font-mono text-[11px] pt-1">
                    <span className="text-slate-400">{t('topo_active_chain')}:</span>
                    {selectedNode.path.map((step, idx) => (
                      <React.Fragment key={step}>
                        <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-semibold">
                          {step}
                        </span>
                        {idx < selectedNode.path.length - 1 && (
                          <span className="text-slate-500">➔</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedNodeId(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="mt-2 text-center text-slate-500 text-xs flex items-center justify-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>{t('topo_click_hint')}</span>
            </div>
          )}
        </div>
      ) : (
        /* 卡片矩阵视图（备选速览） */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-1">
          {topology.map((node) => (
            <div
              key={node.id}
              className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" />
                  <span className="font-mono font-bold text-slate-200">{node.id}</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {node.kind}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{t('topo_label_underlay')}</span>
                  <span className="font-mono text-cyan-300 font-medium">
                    {node.underlay || t('topo_wan_direct')}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-slate-400">
                  <span>{t('topo_col_mtu')}: <strong className="text-slate-200 font-mono">{node.effective_mtu}</strong></span>
                  <span>{t('topo_col_overhead')}: <strong className="text-slate-200 font-mono">+{node.overhead} B</strong></span>
                </div>

                {node.path && node.path.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400 block mb-1">{t('topo_linear_path')}</span>
                    <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px]">
                      {node.path.map((step, idx) => (
                        <React.Fragment key={step}>
                          <span className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/50">
                            {step}
                          </span>
                          {idx < node.path.length - 1 && (
                            <span className="text-slate-500">➔</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
