import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Globe,
  Play,
  RotateCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Zap,
  Square,
} from 'lucide-react';
import {
  getProbeSites,
  testProbeSites,
  streamProbeSites,
  type ProbeSite,
  type ProbeResultItem,
} from '../api';
import { useI18n } from '../i18n';

export function ProbePage() {
  const { t, translateCategory } = useI18n();
  const [sites, setSites] = useState<ProbeSite[]>([]);
  const [results, setResults] = useState<Record<string, ProbeResultItem>>({});
  const [testingAll, setTestingAll] = useState(false);
  const [pendingSites, setPendingSites] = useState<Record<string, boolean>>({});
  const [testingIds, setTestingIds] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // 1. 加载站点列表
  const loadSites = async () => {
    try {
      const res = await getProbeSites();
      if (res.data?.sites) {
        setSites(res.data.sites);
      }
    } catch (e) {
      console.error('加载测试站点失败:', e);
    }
  };

  useEffect(() => {
    loadSites();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  // 2. 实时流式全量并发测速 (调用自动生成的 streamProbeSites SDK，零手搓 URL)
  const handleTestAll = async () => {
    if (testingAll) {
      // 正在测速时点击可立即停止
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setTestingAll(false);
      setPendingSites({});
      return;
    }

    setTestingAll(true);
    const initialPending: Record<string, boolean> = {};
    for (const s of sites) {
      initialPending[s.id] = true;
    }
    setPendingSites(initialPending);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const sseResult = await streamProbeSites({
        query: { timeout_ms: 3500 },
        signal: ac.signal,
        onSseEvent: (event) => {
          if (event.event === 'done') {
            setTestingAll(false);
            setPendingSites({});
            return;
          }
          if (event.data) {
            try {
              const item: ProbeResultItem = JSON.parse(event.data);
              if (item && item.id) {
                setResults((prev) => ({ ...prev, [item.id]: item }));
                setPendingSites((prev) => {
                  const next = { ...prev };
                  delete next[item.id];
                  return next;
                });
              }
            } catch (e) {
              console.error('解析流式测速结果失败:', e);
            }
          }
        },
        onSseError: () => {
          setTestingAll(false);
          setPendingSites({});
        },
      });

      // 消费流异步迭代器直至完成
      for await (const _ of sseResult.stream) {
        if (ac.signal.aborted) break;
      }
    } catch {
      // 忽略 Abort 异常
    } finally {
      setTestingAll(false);
      setPendingSites({});
      abortRef.current = null;
    }
  };

  // 3. 单卡片局部重测
  const handleTestSingle = async (siteId: string) => {
    setTestingIds((prev) => ({ ...prev, [siteId]: true }));
    try {
      const res = await testProbeSites({
        body: { site_id: siteId, timeout_ms: 3500 },
      });
      if (res.data?.results && res.data.results.length > 0) {
        const r = res.data.results[0];
        setResults((prev) => ({ ...prev, [siteId]: r }));
      }
    } catch (e) {
      console.error(`单站点测速异常 [${siteId}]:`, e);
    } finally {
      setTestingIds((prev) => ({ ...prev, [siteId]: false }));
    }
  };

  // 提取分类列表
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of sites) {
      if (s.category) set.add(s.category);
    }
    return Array.from(set);
  }, [sites]);

  // 过滤展示站点
  const filteredSites = useMemo(() => {
    return sites.filter((s) => {
      const matchCat = activeCategory === 'all' || s.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (results[s.id]?.selected_endpoint?.toLowerCase().includes(q) ?? false);
      return matchCat && matchQuery;
    });
  }, [sites, activeCategory, searchQuery, results]);

  // 统计概览
  const stats = useMemo(() => {
    const total = sites.length;
    let tested = 0;
    let ok = 0;
    let timeout = 0;
    let blocked = 0;
    let totalLatency = 0;

    for (const s of sites) {
      const r = results[s.id];
      if (r) {
        tested++;
        if (r.status === 'ok') {
          ok++;
          totalLatency += r.latency_ms;
        } else if (r.status === 'blocked') {
          blocked++;
        } else {
          timeout++;
        }
      }
    }

    const avgLatency = ok > 0 ? Math.round(totalLatency / ok) : 0;
    return { total, tested, ok, timeout, blocked, avgLatency };
  }, [sites, results]);

  // 出网形式徽章渲染
  const renderEgressBadge = (res?: ProbeResultItem) => {
    if (!res) {
      return (
        <span className="text-[11px] font-mono text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-700/50">
          {t('probe_card_egress_waiting')}
        </span>
      );
    }

    if (res.status === 'blocked' || res.rule_target === 'REJECT') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-300 bg-purple-950/70 border border-purple-800/60 px-2 py-0.5 rounded">
          <ShieldAlert className="w-3 h-3 text-purple-400" />
          {t('probe_card_egress_blocked')}
        </span>
      );
    }

    const ep = res.selected_endpoint;
    const isUnderlay = ep.toLowerCase().includes('campus') || ep.toLowerCase().includes('vpn');
    const isDirect = ep.toUpperCase() === 'DIRECT';

    if (isDirect) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          {t('probe_card_egress_direct')}
        </span>
      );
    }

    if (isUnderlay) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          {t('probe_card_egress_campus')}
        </span>
      );
    }

    // Clash 节点
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-300 bg-indigo-950/70 border border-indigo-800/60 px-2 py-0.5 rounded">
        <Zap className="w-3 h-3 text-indigo-400" />
        {ep} {t('probe_card_egress_proxy')}
      </span>
    );
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* 头部标题与全量测速按钮 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">
              {t('probe_title')}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t('probe_desc')}
          </p>
        </div>

        <button
          onClick={handleTestAll}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white shadow-lg transition active:scale-[0.98] shrink-0 ${
            testingAll
              ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
          }`}
        >
          {testingAll ? (
            <>
              <Square className="w-4 h-4 fill-white" />
              <span>{t('probe_btn_stop')} ({Object.keys(pendingSites).length} {t('probe_probing_count')})</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>{t('probe_btn_start')}</span>
            </>
          )}
        </button>
      </div>

      {/* 统计状态条 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 flex flex-col">
          <span className="text-[11px] text-slate-400 font-medium">{t('probe_stat_total')}</span>
          <span className="text-xl font-bold font-mono text-slate-100 mt-0.5">
            {stats.total}
          </span>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-emerald-950/40 p-3 flex flex-col">
          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {t('probe_stat_ok')}
          </span>
          <span className="text-xl font-bold font-mono text-emerald-300 mt-0.5">
            {stats.ok}
          </span>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-rose-950/40 p-3 flex flex-col">
          <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {t('probe_stat_timeout')}
          </span>
          <span className="text-xl font-bold font-mono text-rose-300 mt-0.5">
            {stats.timeout}
          </span>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-purple-950/40 p-3 flex flex-col">
          <span className="text-[11px] text-purple-400 font-medium flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> {t('probe_stat_blocked')}
          </span>
          <span className="text-xl font-bold font-mono text-purple-300 mt-0.5">
            {stats.blocked}
          </span>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-indigo-950/40 p-3 flex flex-col col-span-2 sm:col-span-1">
          <span className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> {t('probe_stat_avg_latency')}
          </span>
          <span className="text-xl font-bold font-mono text-indigo-300 mt-0.5">
            {stats.avgLatency > 0 ? `${stats.avgLatency} ms` : '--'}
          </span>
        </div>
      </div>

      {/* 过滤与搜索栏 */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* 分类筛选标签 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium ${
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80'
            }`}
          >
            {t('probe_cat_all')} ({sites.length})
          </button>
          {categories.map((cat) => {
            const count = sites.filter((s) => s.category === cat).length;
            const label = translateCategory(cat);
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {/* 模糊搜索框 */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('probe_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* 50 站点卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 overflow-y-auto pr-1 pb-4">
        {filteredSites.map((site) => {
          const res = results[site.id];
          const isPending = Boolean(pendingSites[site.id]);
          const isSingleTesting = Boolean(testingIds[site.id]);
          const isTesting = isPending || isSingleTesting;

          return (
            <div
              key={site.id}
              className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-4 hover:border-slate-700 transition flex flex-col justify-between gap-3 group relative"
            >
              {/* 卡片头部 */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl select-none" role="img" aria-label={site.name}>
                    {site.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition line-clamp-1">
                      {site.name}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 line-clamp-1">
                      {site.domain}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleTestSingle(site.id)}
                  disabled={isTesting}
                  title={t('probe_card_retest')}
                  className="p-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition opacity-80 group-hover:opacity-100 disabled:opacity-30"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-400' : ''}`}
                  />
                </button>
              </div>

              {/* 卡片核心时延展示 */}
              <div className="py-2 px-3 rounded-lg bg-slate-950/60 border border-slate-800/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">{t('probe_card_latency')}</span>
                {isTesting ? (
                  <span className="text-xs font-mono text-indigo-400 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    {t('probe_card_probing')}
                  </span>
                ) : !res ? (
                  <span className="text-xs font-mono text-slate-500">{t('probe_card_untested')}</span>
                ) : res.status === 'blocked' ? (
                  <span className="text-xs font-bold text-purple-400 font-mono">
                    {t('probe_card_blocked')}
                  </span>
                ) : res.status === 'ok' ? (
                  <span
                    className={`text-sm font-bold font-mono ${
                      res.latency_ms <= 100
                        ? 'text-emerald-400'
                        : res.latency_ms <= 250
                        ? 'text-teal-300'
                        : res.latency_ms <= 400
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {res.latency_ms} ms
                  </span>
                ) : (
                  <span className="text-xs font-bold text-rose-400 font-mono">
                    {t('probe_card_timeout')}
                  </span>
                )}
              </div>

              {/* 卡片底部：出网形式与分流规则 */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{t('probe_card_policy')}</span>
                  <span className="font-mono text-slate-300 font-medium">
                    {res?.rule_target ?? t('probe_card_policy_pending')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{t('probe_card_egress')}</span>
                  <div>{renderEgressBadge(res)}</div>
                </div>

                {/* 拓扑链展开 */}
                {res && res.chain && res.chain.length > 0 && res.status !== 'blocked' && (
                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 pt-1 overflow-hidden truncate">
                    <span className="text-slate-500">{t('probe_card_chain')}</span>
                    <span className="text-indigo-300/80 truncate">
                      {res.chain.join(' ➔ ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
