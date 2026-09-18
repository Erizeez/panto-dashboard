import {
  PantoClient,
  type VersionResponse,
  type StatusResponse,
  type ModeResponse,
  type SetModeRequest,
  type TailscaleExitNodesResponse,
  type SetTailscaleExitNodeRequest,
  type TailscaleExitNodeResult,
  type MagicIPPendingResponse,
  type MagicIPChoicesResponse,
  type MagicIPDecideResponse,
  type MagicIPDeleteResponse,
  type TopologyResponse,
  type TopologyNode,
  type GroupsResponse,
  type GroupItem,
  type SelectMemberRequest,
  type SelectMemberResponse,
  type DelayTestRequest,
  type DelayTestResponse,
  type RulesResponse,
  type RuleItem,
  type RuleMatchRequest,
  type RuleMatchResponse,
  type TrafficResponse,
  type ConfigResponse,
  type ProbeSitesResponse,
  type ProbeSite,
  type ProbeTestRequest,
  type ProbeTestResponse,
  type ProbeResultItem,
} from '@erizeez/panto-api';

export interface TailscaleExitNodeItem {
  id: string;
  name: string;
  hostname?: string;
  ip: string;
  ips: string[];
  online: boolean;
  active: boolean;
  location?: string;
}

export interface MagicIPCandidate {
  ip: string;
  device_name: string;
  source: string;
  endpoint_id: string;
  hostname?: string;
  dns_name?: string;
  online?: boolean;
  priority?: number;
}

export interface MagicIPConflictItem {
  conflict_ip: string;
  ip?: string;
  last_used_endpoint?: string;
  candidates: MagicIPCandidate[];
}

export interface MagicIPChoiceItem {
  ip: string;
  chosen_device: string;
  endpoint?: string;
  peer_hostname?: string;
}

export interface MagicIPDecideRequest {
  conflict_ip?: string;
  chosen_device?: string;
  ip?: string;
  endpoint_id?: string;
  endpoint?: string;
  remember?: boolean;
}

// 导出所有类型别名以兼容原有 UI
export type {
  VersionResponse,
  StatusResponse,
  ModeResponse,
  SetModeRequest,
  TailscaleExitNodesResponse,
  SetTailscaleExitNodeRequest,
  TailscaleExitNodeResult,
  MagicIPPendingResponse,
  MagicIPChoicesResponse,
  MagicIPDecideResponse,
  MagicIPDeleteResponse,
  MagicIPConflictItem as MagicIpConflictItem,
  MagicIPChoiceItem as MagicIpChoiceItem,
  TopologyResponse,
  TopologyNode,
  GroupsResponse,
  GroupItem,
  SelectMemberRequest,
  SelectMemberResponse,
  DelayTestRequest,
  DelayTestResponse,
  RulesResponse,
  RuleItem,
  RuleMatchRequest,
  RuleMatchResponse,
  TrafficResponse,
  ConfigResponse,
  ProbeSitesResponse,
  ProbeSite,
  ProbeTestRequest,
  ProbeTestResponse,
  ProbeResultItem,
};

// 支持动态配置或读取后端基础 URL
const STORAGE_KEY = 'panto_api_base_url';

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  }
  // 默认同源，如果是 Vite 开发模式或非标准端口则连向 9090
  if (typeof window !== 'undefined' && window.location.port !== '9090' && window.location.port !== '') {
    return 'http://127.0.0.1:9090';
  }
  return '';
}

export function setBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, url);
  }
  client = new PantoClient({ baseUrl: url });
}

export let client = new PantoClient({ baseUrl: getBaseUrl() });

// 兼容层封装：使原有 UI 组件零修改平滑过渡
export async function getStatus() {
  const data = await client.getStatus();
  return { data };
}

export async function getGroups() {
  const data = await client.getGroups();
  return { data };
}

export async function selectGroupMember(options: {
  path: { id: string };
  body: { selected: string };
}) {
  const data = await client.selectGroupMember(options.path.id, options.body);
  return { data };
}

export async function testGroupDelay(options: {
  path: { id: string };
  body?: DelayTestRequest;
}) {
  const data = await client.testGroupDelay(options.path.id, options.body);
  return { data };
}

export async function getTopology() {
  const data = await client.getTopology();
  return { data };
}

export async function getRules() {
  const data = await client.getRules();
  return { data };
}

export async function matchRule(options: { body: RuleMatchRequest }) {
  const data = await client.matchRule(options.body);
  return { data };
}

export async function getConfig() {
  const data = await client.getConfig();
  return { data };
}

export async function getMode() {
  const data = await client.getMode();
  return { data };
}

export async function setMode(options: { body: SetModeRequest }) {
  const data = await client.setMode(options.body);
  return { data };
}

export async function getTailscaleExitNodes() {
  const data = await client.getTailscaleExitNodes();
  const nodes: TailscaleExitNodeItem[] = data.exit_nodes.map((n) => ({
    ...n,
    hostname: n.name,
    ips: [n.ip],
  }));
  return {
    data: {
      ...data,
      exit_nodes: nodes,
      nodes,
    },
  };
}

export async function setTailscaleExitNode(options: { body: { selected?: string; node_id?: string } }) {
  const nodeId = options.body.node_id ?? options.body.selected ?? '';
  const data = await client.setTailscaleExitNode({ node_id: nodeId });
  return { data };
}

export async function getMagicIpPending() {
  const data = await client.getMagicIPPending();
  const conflicts: MagicIPConflictItem[] = data.conflicts.map((c) => ({
    ...c,
    ip: c.conflict_ip,
    candidates: c.candidates.map((cand) => ({
      ...cand,
      endpoint_id: cand.device_name,
      hostname: cand.device_name,
      online: true,
      priority: 1,
    })),
  }));
  return {
    data: {
      ...data,
      conflicts,
    },
  };
}

export async function getMagicIpChoices() {
  const data = await client.getMagicIPChoices();
  const choices: MagicIPChoiceItem[] = data.choices.map((ch) => ({
    ...ch,
    endpoint: ch.chosen_device,
    peer_hostname: ch.chosen_device,
  }));
  return {
    data: {
      ...data,
      choices,
    },
  };
}

export async function decideMagicIp(options: { body: MagicIPDecideRequest }) {
  const conflictIp = options.body.conflict_ip ?? options.body.ip ?? '';
  const chosenDevice = options.body.chosen_device ?? options.body.endpoint_id ?? options.body.endpoint ?? '';
  const data = await client.decideMagicIP({
    conflict_ip: conflictIp,
    chosen_device: chosenDevice,
  });
  return { data };
}

export async function deleteMagicIpChoice(options: {
  body?: { ip: string };
  path?: { ip: string };
}) {
  const ip = options.path?.ip ?? options.body?.ip ?? '';
  const data = await client.deleteMagicIPChoice(ip);
  return { data };
}

export async function getProbeSites() {
  const data = await client.getProbeSites();
  return { data };
}

export async function testProbeSites(options?: { body?: ProbeTestRequest }) {
  const data = await client.testProbeSites(options?.body);
  return { data };
}

export async function streamProbeSites(options: {
  query?: { timeout_ms?: number };
  signal?: AbortSignal;
  onSseEvent?: (event: { event?: string; data?: string }) => void;
  onSseError?: (err: unknown) => void;
}) {
  const url = client.getProbeStreamUrl(options.query?.timeout_ms);
  async function* makeStream() {
    try {
      const res = await fetch(url, { signal: options.signal });
      if (!res.ok || !res.body) {
        options.onSseError?.(new Error(`Failed to stream: ${res.statusText}`));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const block of parts) {
          if (!block.trim()) continue;
          let eventType = 'message';
          let data = '';
          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              data = line.slice(5).trim();
            }
          }
          options.onSseEvent?.({ event: eventType, data });
          yield data;
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        options.onSseError?.(err);
      }
    }
  }

  return {
    stream: makeStream(),
  };
}
