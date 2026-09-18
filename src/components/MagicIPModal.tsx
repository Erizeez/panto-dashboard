import { useState } from 'react';
import {
  Wifi,
  Trash2,
  X,
  Server,
  Radio,
  Bookmark,
} from 'lucide-react';
import {
  decideMagicIp,
  deleteMagicIpChoice,
  type MagicIpConflictItem,
  type MagicIpChoiceItem,
} from '../api';

interface Props {
  conflicts: MagicIpConflictItem[];
  choices: MagicIpChoiceItem[];
  onRefresh: () => void;
}

export function MagicIPModal({ conflicts, choices, onRefresh }: Props) {
  const [selectedConflict, setSelectedConflict] = useState<MagicIpConflictItem | null>(null);
  const [targetEndpoint, setTargetEndpoint] = useState<string>('');
  const [remember, setRemember] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showChoicesModal, setShowChoicesModal] = useState<boolean>(false);

  // 当有未处理冲突且用户未主动打开指定弹窗时，如果用户点击浮条，就打开第一个冲突
  const openConflictModal = (c: MagicIpConflictItem) => {
    setSelectedConflict(c);
    setTargetEndpoint(c.last_used_endpoint || c.candidates[0]?.endpoint_id || '');
    setRemember(true);
  };

  const handleDecide = async () => {
    if (!selectedConflict || !targetEndpoint) return;
    setSubmitting(true);
    try {
      await decideMagicIp({
        body: {
          ip: selectedConflict.ip,
          endpoint: targetEndpoint,
          remember: remember,
        },
      });
      setSelectedConflict(null);
      onRefresh();
    } catch (e) {
      console.error('提交决策失败:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteChoice = async (ip: string) => {
    try {
      await deleteMagicIpChoice({
        path: { ip },
      });
      onRefresh();
    } catch (e) {
      console.error('删除偏好失败:', e);
    }
  };

  return (
    <>
      {/* 1. 顶部 Wi-Fi 式冲突提醒浮动通知条 */}
      {conflicts.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between text-sm transition-all duration-300">
          <div className="flex items-center space-x-3 text-amber-300">
            <div className="p-1 rounded-full bg-amber-500/20 animate-pulse">
              <Wifi className="w-4 h-4 text-amber-400" />
            </div>
            <span>
              <strong className="font-semibold">检测到 IP 冲突：</strong>
              发现 <strong>{conflicts[0].ip}</strong> 等 {conflicts.length} 个 IP 在多个 Tailnet 中可用，当前已临时直通。
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => openConflictModal(conflicts[0])}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded font-medium text-xs shadow transition flex items-center space-x-1.5"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>选择连接网络</span>
            </button>
            {choices.length > 0 && (
              <button
                onClick={() => setShowChoicesModal(true)}
                className="text-xs text-neutral-400 hover:text-neutral-200 underline"
              >
                已记住 ({choices.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Wi-Fi 式网络决策选择器 Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-neutral-800 flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2 text-amber-400 font-semibold text-base mb-1">
                  <Wifi className="w-5 h-5" />
                  <span>选择要连接的网络节点</span>
                </div>
                <p className="text-xs text-neutral-400">
                  目标 IP <code className="text-amber-200 font-mono bg-neutral-800 px-1.5 py-0.5 rounded">{selectedConflict.ip}</code> 存在于以下候选网络中：
                </p>
              </div>
              <button
                onClick={() => setSelectedConflict(null)}
                className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedConflict.candidates.map((cand) => {
                const isSelected = targetEndpoint === cand.endpoint_id;
                return (
                  <div
                    key={cand.endpoint_id}
                    onClick={() => setTargetEndpoint(cand.endpoint_id)}
                    className={`cursor-pointer border rounded-lg p-3.5 flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-cyan-500/60 bg-cyan-950/20 text-white shadow-sm'
                        : 'border-neutral-800 hover:border-neutral-700 bg-neutral-800/40 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-neutral-600'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm text-neutral-200">
                            {cand.endpoint_id}
                          </span>
                          {cand.online && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400" title="在线" />
                          )}
                        </div>
                        <div className="text-xs text-neutral-400 font-mono flex items-center space-x-1 mt-0.5">
                          <Server className="w-3 h-3 text-neutral-500 inline" />
                          <span>{cand.hostname || cand.dns_name || '未知设备'}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded">
                      优先权: {cand.priority}
                    </span>
                  </div>
                );
              })}

              {/* 记住选择 Checkbox */}
              <div className="pt-2 border-t border-neutral-800">
                <label className="flex items-center space-x-2 text-xs text-neutral-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>记住我的选择（后续访问该 IP 将自动直连此节点）</span>
                </label>
              </div>
            </div>

            <div className="p-4 bg-neutral-950/60 border-t border-neutral-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedConflict(null)}
                className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
              >
                暂不处理
              </button>
              <button
                type="button"
                disabled={submitting || !targetEndpoint}
                onClick={handleDecide}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-medium text-xs flex items-center space-x-1.5"
              >
                {submitting ? <span>连接中...</span> : <span>确认连接</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. 已记住选择列表查看与管理 Modal */}
      {showChoicesModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-neutral-800 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-neutral-200 font-semibold text-base">
                <Bookmark className="w-5 h-5 text-cyan-400" />
                <span>已记住的 Magic IP 偏好</span>
              </div>
              <button
                onClick={() => setShowChoicesModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
              {choices.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs">
                  暂无已保存的 IP 决策记忆
                </div>
              ) : (
                choices.map((ch) => (
                  <div
                    key={ch.ip}
                    className="border border-neutral-800 rounded-lg p-3 bg-neutral-800/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-cyan-300 font-semibold">{ch.ip}</span>
                        <span className="text-neutral-500">➔</span>
                        <span className="text-emerald-300 font-medium">{ch.endpoint}</span>
                      </div>
                      {ch.peer_hostname && (
                        <div className="text-neutral-400 text-[11px] mt-0.5">
                          绑定节点: {ch.peer_hostname}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteChoice(ch.ip)}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 rounded hover:bg-neutral-800 transition"
                      title="清除记忆"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-neutral-950/60 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setShowChoicesModal(false)}
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
