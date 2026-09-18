import React, { useEffect, useState } from 'react';
import {
  Activity,
  Network,
  ShieldCheck,
  Layers,
  Zap,
  FileText,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Globe,
  Languages,
  Server,
} from 'lucide-react';
import { ProbePage } from './components/ProbePage';
import { TopologyPage } from './components/topology/TopologyPage';
import { MagicIPModal } from './components/MagicIPModal';
import { useI18n } from './i18n';
import {
  getBaseUrl,
  setBaseUrl,
  getStatus,
  getGroups,
  selectGroupMember,
  testGroupDelay,
  getTopology,
  getRules,
  matchRule,
  getConfig,
  getMode,
  setMode,
  getTailscaleExitNodes,
  setTailscaleExitNode,
  getMagicIpPending,
  getMagicIpChoices,
  type StatusResponse,
  type GroupItem,
  type TopologyNode,
  type RuleItem,
  type RuleMatchResponse,
  type TailscaleExitNodeItem,
  type MagicIpConflictItem,
  type MagicIpChoiceItem,
} from './api';

export default function App() {
  const { t, lang, setLang } = useI18n();
  const [tab, setTab] = useState<'groups' | 'probe' | 'topology' | 'rules' | 'test' | 'config'>('groups');
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [topology, setTopology] = useState<TopologyNode[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [rawConfig, setRawConfig] = useState<string>('');
  
  // 运行模式与全局出口状态
  const [currentMode, setCurrentMode] = useState<string>('rule');
  const [globalTarget, setGlobalTarget] = useState<string>('Proxy');
  const [exitNodes, setExitNodes] = useState<TailscaleExitNodeItem[]>([]);

  // Magic IP 冲突与偏好状态
  const [magicConflicts, setMagicConflicts] = useState<MagicIpConflictItem[]>([]);
  const [magicChoices, setMagicChoices] = useState<MagicIpChoiceItem[]>([]);

  // 测速中状态记录
  const [testingGroup, setTestingGroup] = useState<string | null>(null);
  const [delays, setDelays] = useState<Record<string, Record<string, number>>>({});
  const [nodeSearch, setNodeSearch] = useState<Record<string, string>>({});

  // 规则模拟匹配状态
  const [testHost, setTestHost] = useState('speedtest.campus.edu');
  const [testPort, setTestPort] = useState(443);
  const [matchResult, setMatchResult] = useState<RuleMatchResponse | null>(null);
  const [matching, setMatching] = useState(false);

  // 数据刷新
  const refreshAll = async () => {
    try {
      const s = await getStatus();
      if (s.data) setStatus(s.data);

      const m = await getMode();
      if (m.data) {
        setCurrentMode(m.data.mode);
        setGlobalTarget(m.data.global_target);
      }

      const ens = await getTailscaleExitNodes();
      if (ens.data?.nodes) {
        setExitNodes(ens.data.nodes);
      }

      const confRes = await getMagicIpPending();
      if (confRes.data?.conflicts) {
        setMagicConflicts(confRes.data.conflicts);
      }

      const choicesRes = await getMagicIpChoices();
      if (choicesRes.data?.choices) {
        setMagicChoices(choicesRes.data.choices);
      }

      const g = await getGroups();
      if (g.data?.groups) setGroups(g.data.groups);

      const topo = await getTopology();
      if (topo.data?.nodes) setTopology(topo.data.nodes);

      const r = await getRules();
      if (r.data?.rules) setRules(r.data.rules);

      const c = await getConfig();
      if (c.data?.content) setRawConfig(c.data.content);
    } catch (e) {
      console.error('刷新数据失败', e);
    }
  };

  useEffect(() => {
    refreshAll();
    const timer = setInterval(refreshAll, 5000);
    return () => clearInterval(timer);
  }, []);

  // 切换组节点
  const handleSelectMember = async (groupId: string, member: string) => {
    try {
      await selectGroupMember({
        path: { id: groupId },
        body: { selected: member },
      });
      // 局部更新
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, current: member } : g))
      );
    } catch (e) {
      alert('切换节点失败: ' + String(e));
    }
  };

  // 组内测速
  const handleTestDelay = async (groupId: string) => {
    setTestingGroup(groupId);
    try {
      const res = await testGroupDelay({
        path: { id: groupId },
        body: { timeout_ms: 3000 },
      });
      if (res.data?.delays) {
        setDelays((prev) => ({
          ...prev,
          [groupId]: res.data!.delays as Record<string, number>,
        }));
      }
    } catch (e) {
      console.error('测速失败', e);
    } finally {
      setTestingGroup(null);
    }
  };

  // 切换运行模式 (rule / global / direct)
  const handleSwitchMode = async (mode: string) => {
    try {
      await setMode({ body: { mode, global_target: globalTarget } });
      setCurrentMode(mode);
    } catch (e) {
      alert('切换模式失败: ' + String(e));
    }
  };

  // 切换全局模式出口
  const handleSwitchGlobalTarget = async (target: string) => {
    try {
      let finalTarget = target;
      if (target.startsWith('exit-node:')) {
        const exitNodeHost = target.slice('exit-node:'.length);
        await setTailscaleExitNode({ body: { selected: exitNodeHost } });
        finalTarget = 'corp-tailscale';
      }
      await setMode({ body: { mode: currentMode, global_target: finalTarget } });
      setGlobalTarget(finalTarget);
    } catch (e) {
      alert('切换全局出口失败: ' + String(e));
    }
  };

  // 规则模拟匹配测试
  const handleRunMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testHost) return;
    setMatching(true);
    try {
      const res = await matchRule({
        body: { host: testHost, port: testPort },
      });
      if (res.data) {
        setMatchResult(res.data);
      }
    } catch (e) {
      alert('匹配求值失败: ' + String(e));
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Magic IP 跨网络冲突提醒与偏好选择器 */}
      <MagicIPModal
        conflicts={magicConflicts}
        choices={magicChoices}
        onRefresh={refreshAll}
      />

      {/* 顶部状态栏 */}
      <header className="border-b border-slate-800/80 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                {t('dashboard_title')}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                v0.2.0-preview
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {t('dashboard_subtitle')}
            </p>
          </div>
        </div>

        {/* 核心模式切换器与指标 */}
        <div className="flex items-center gap-3 text-xs">
          {/* 三模切换胶囊 (规则 / 全局 / 直连) */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 shadow-inner">
            <button
              onClick={() => handleSwitchMode('rule')}
              className={`px-3 py-1.5 rounded-md transition font-medium ${
                currentMode === 'rule'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('mode_rule')}
            </button>
            <button
              onClick={() => handleSwitchMode('global')}
              className={`px-3 py-1.5 rounded-md transition font-medium ${
                currentMode === 'global'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('mode_global')}
            </button>
            <button
              onClick={() => handleSwitchMode('direct')}
              className={`px-3 py-1.5 rounded-md transition font-medium ${
                currentMode === 'direct'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('mode_direct')}
            </button>
          </div>

          {/* 若为全局模式，展示全局出口选择器 */}
          {currentMode === 'global' && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs">
              <span className="text-indigo-300 font-medium">{t('global_target_select')}:</span>
              <select
                value={globalTarget}
                onChange={(e) => handleSwitchGlobalTarget(e.target.value)}
                className="bg-slate-900/90 border border-indigo-500/40 rounded px-2 py-1 text-slate-200 font-mono focus:outline-none focus:border-indigo-400 cursor-pointer"
              >
                <optgroup label="策略组">
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.id}
                    </option>
                  ))}
                </optgroup>
                {exitNodes.length > 0 && (
                  <optgroup label="Tailscale 远端 Exit Node">
                    {exitNodes.map((en) => (
                      <option key={en.id} value={`exit-node:${en.hostname}`}>
                        {en.hostname} ({en.ips[0] || ''})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="直通出站">
                  <option value="DIRECT">DIRECT</option>
                </optgroup>
              </select>
            </div>
          )}

          <div className="h-4 w-px bg-slate-700/80" />

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">{t('mixed_proxy')}</span>
            <span className="font-mono text-cyan-400 font-semibold">
              :{status?.mixed_port ?? 7890}
            </span>
          </div>

          {status?.assigned_ip && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 text-[11px]">Campus VPN:</span>
              <span className="text-emerald-300 font-semibold">{status.assigned_ip}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('uptime')}:</span>
            <span className="font-mono text-slate-200">
              {Math.floor((status?.uptime_seconds ?? 0) / 60)}m {(status?.uptime_seconds ?? 0) % 60}s
            </span>
          </div>

          <button
            onClick={refreshAll}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title={t('refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const current = getBaseUrl() || 'http://127.0.0.1:9090';
              const input = window.prompt('配置 Panto 核心后端连接地址 (支持远程或本机 IP):', current);
              if (input !== null && input.trim() !== '') {
                setBaseUrl(input.trim());
                refreshAll();
              }
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition"
            title="配置后端服务地址"
          >
            <Server className="w-4 h-4" />
          </button>

          {/* 分隔线 */}
          <div className="h-4 w-px bg-slate-700/80" />

          {/* 右上角醒目双语切换开关 */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 text-xs shadow-inner">
            <div className="pl-2 pr-1 text-slate-400 flex items-center">
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <button
              onClick={() => setLang('zh')}
              className={`px-2.5 py-1 rounded-md transition font-medium ${
                lang === 'zh'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-md transition font-medium ${
                lang === 'en'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </header>

      {/* 主体区域：全宽左对齐布局 */}
      <div className="flex-1 flex w-full p-6 gap-6">
        {/* 左侧导航栏（左对齐） */}
        <aside className="w-60 shrink-0 flex flex-col gap-1.5">
          <button
            onClick={() => setTab('groups')}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              tab === 'groups'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t('tab_groups')}</span>
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded-md bg-white/10 font-mono">
              {groups.length}
            </span>
          </button>

          <button
            onClick={() => setTab('probe')}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              tab === 'probe'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>{t('tab_probe')}</span>
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              52
            </span>
          </button>

          <button
            onClick={() => setTab('topology')}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              tab === 'topology'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>{t('tab_topology')}</span>
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded-md bg-white/10 font-mono">
              {topology.length}
            </span>
          </button>

          <button
            onClick={() => setTab('rules')}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              tab === 'rules'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{t('tab_rules')}</span>
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded-md bg-white/10 font-mono">
              {rules.length}
            </span>
          </button>

          <button
            onClick={() => setTab('test')}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              tab === 'test'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{t('tab_simulator')}</span>
          </button>

          <button
            onClick={() => setTab('config')}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              tab === 'config'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t('tab_config')}</span>
          </button>
        </aside>

        {/* 右侧主内容展示卡片 */}
        <main className="flex-1 min-w-0 bg-[#0e1424] rounded-2xl border border-slate-800/80 p-6 overflow-hidden flex flex-col shadow-xl">
          {/* TAB 0: 全球 50 站点连通性与出网测试 */}
          {tab === 'probe' && <ProbePage />}

          {/* TAB 1: 策略分组与节点卡片 */}
          {tab === 'groups' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">{t('groups_title')}</h2>
                  <p className="text-xs text-slate-400">
                    {t('groups_desc')}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {groups.map((group) => {
                  const isTesting = testingGroup === group.id;
                  const groupDelays = delays[group.id] || (group.delays as Record<string, number>) || {};

                  return (
                    <div
                      key={group.id}
                      className="rounded-xl bg-slate-900/70 border border-slate-800/90 p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-slate-200 tracking-wide text-base">
                            {group.id}
                          </span>
                          <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {group.kind === 'url-test' ? t('group_kind_auto') : group.kind === 'fallback' ? t('group_kind_fallback') : group.kind}
                          </span>
                          <span className="text-xs text-slate-400">
                            {t('group_active')}: <strong className="text-indigo-400 font-mono">{group.current}</strong>
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            ({group.members.length} {t('group_nodes_count') || 'nodes'})
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <input
                            type="text"
                            placeholder={t('group_search_placeholder')}
                            value={nodeSearch[group.id] || ''}
                            onChange={(e) =>
                              setNodeSearch({ ...nodeSearch, [group.id]: e.target.value })
                            }
                            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44"
                          />

                          <button
                            disabled={isTesting}
                            onClick={() => handleTestDelay(group.id)}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition disabled:opacity-50"
                          >
                            <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-bounce' : ''}`} />
                            {isTesting ? t('group_testing') : t('group_test_btn')}
                          </button>
                        </div>
                      </div>

                      {/* 节点成员网格卡片 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-1">
                        {group.members
                          .filter((m) =>
                            m.toLowerCase().includes((nodeSearch[group.id] || '').toLowerCase())
                          )
                          .map((member) => {
                            const isCurrent = group.current === member;
                            const isFallback = member === 'campus' || member.toLowerCase().includes('campus') || member.toLowerCase().includes('vpn');
                            const isDirect = member === 'DIRECT';
                            const targetGroup = groups.find((g) => g.id === member);
                            const delay = groupDelays[member];

                          return (
                            <div
                              key={member}
                              onClick={() => handleSelectMember(group.id, member)}
                              className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                isCurrent
                                  ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-500/10'
                                  : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-mono text-sm font-semibold text-slate-200 truncate flex items-center gap-1.5 flex-wrap">
                                  {isCurrent && (
                                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                                  )}
                                  <span>{member}</span>
                                  {targetGroup && (
                                    <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 font-sans flex items-center gap-1">
                                      <span>🔀</span>
                                      <span>{targetGroup.kind}</span>
                                      {targetGroup.current && (
                                        <span className="text-slate-400 font-mono">➔ {targetGroup.current}</span>
                                      )}
                                    </span>
                                  )}
                                  {isFallback && (
                                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-sans">
                                      🛡️ {t('group_fallback_badge')}
                                    </span>
                                  )}
                                  {isDirect && (
                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-sans">
                                      ⚡ 直连
                                    </span>
                                  )}
                                </div>
                                
                                {delay !== undefined && (
                                  <span
                                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-medium ${
                                      delay === 0
                                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                        : delay < 300
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}
                                  >
                                    {delay === 0 ? t('group_timeout') : `${delay}ms`}
                                  </span>
                                )}
                              </div>

                              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                                <span>{t('group_click_to_switch')}</span>
                                <span className="opacity-0 group-hover:opacity-100 transition text-indigo-400 flex items-center gap-1">
                                  {t('group_select')} <ArrowRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: 可编程拓扑 (DAG) */}
          {tab === 'topology' && <TopologyPage />}

          {/* TAB 3: 分流规则 */}
          {tab === 'rules' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-100">{t('rules_title')}</h2>
                <p className="text-xs text-slate-400">
                  {t('rules_desc')}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/90 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{t('rules_col_idx')}</th>
                      <th className="px-4 py-3 font-semibold">{t('rules_col_type')}</th>
                      <th className="px-4 py-3 font-semibold">{t('rules_col_payload')}</th>
                      <th className="px-4 py-3 font-semibold">{t('rules_col_target')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {rules.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-900/40 transition">
                        <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                        <td className="px-4 py-2.5 font-bold text-indigo-300">{r.type}</td>
                        <td className="px-4 py-2.5 text-slate-300">{r.payload || '*'}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-semibold border border-slate-700">
                            {r.target}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: 规则模拟求值 */}
          {tab === 'test' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-lg font-bold text-slate-100">{t('sim_title')}</h2>
                <p className="text-xs text-slate-400">
                  {t('sim_desc')}
                </p>
              </div>

              <form onSubmit={handleRunMatch} className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {t('sim_label_target')}
                    </label>
                    <input
                      type="text"
                      value={testHost}
                      onChange={(e) => setTestHost(e.target.value)}
                      placeholder={t('sim_placeholder_target')}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {t('sim_label_port')}
                    </label>
                    <input
                      type="number"
                      value={testPort}
                      onChange={(e) => setTestPort(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={matching}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium text-sm transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {matching ? t('sim_btn_matching') : t('sim_btn_match')}
                </button>
              </form>

              {matchResult && (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{t('sim_is_matched')}:</span>
                    <span className={matchResult.matched ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      {matchResult.matched ? t('sim_matched_yes') : t('sim_matched_no')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{t('sim_rule_target')}:</span>
                    <span className="text-indigo-400 font-bold">{matchResult.rule_target}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{t('sim_selected_ep')}:</span>
                    <span className="text-cyan-400 font-bold">{matchResult.selected_endpoint}</span>
                  </div>

                  {matchResult.chain && matchResult.chain.length > 0 && (
                    <div>
                      <span className="text-slate-400 block mb-1.5">{t('sim_chain')}:</span>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {matchResult.chain.map((c, idx) => (
                          <React.Fragment key={c}>
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-semibold">
                              {c}
                            </span>
                            {idx < matchResult.chain.length - 1 && (
                              <span className="text-slate-500">➔</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: 配置查看 */}
          {tab === 'config' && (
            <div className="space-y-4 flex-1 flex flex-col">
              <div>
                <h2 className="text-lg font-bold text-slate-100">{t('cfg_title')}</h2>
                <p className="text-xs text-slate-400">
                  {t('cfg_desc')}
                </p>
              </div>

              <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-auto text-slate-300 leading-relaxed max-h-[550px]">
                <pre>{rawConfig || t('cfg_loading')}</pre>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
