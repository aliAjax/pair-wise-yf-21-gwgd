// 页面状态层：持有档案状态，把领域规则包成 UI 动作，
// 每次变更后交给存取层持久化。规则校验失败时把错误消息带给页面。

import { useEffect, useState } from "react";
import type { ArchiveState } from "../domain/types";
import {
  addBatch,
  deactivateBatch,
  registerUsage,
  reviewSwitchBatch,
} from "../domain/batchRules";
import { loadArchive, resetArchive, saveArchive } from "../storage/archiveStore";

export interface ArchiveActions {
  registerUsage: (areaId: string, batchId: string, amount: number) => boolean;
  deactivateBatch: (batchId: string, reason: string) => boolean;
  reviewSwitchBatch: (areaId: string, newBatchId: string, amount: number) => boolean;
  addBatch: (input: {
    colorId: string;
    id: string;
    arrivedAt: string;
    initial: number;
  }) => boolean;
  resetAll: () => void;
  dismissError: () => void;
}

export function useArchiveState(): {
  state: ArchiveState;
  error: string | null;
  actions: ArchiveActions;
} {
  const [state, setState] = useState<ArchiveState>(loadArchive);
  const [error, setError] = useState<string | null>(null);

  // 关掉页面再回来仍能看到：每次状态变化都写回存取层
  useEffect(() => {
    saveArchive(state);
  }, [state]);

  // 同步计算下一状态：规则抛错能被 catch 住并显示在页面上
  const run = (fn: (s: ArchiveState) => ArchiveState): boolean => {
    try {
      const next = fn(state);
      setState(next);
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  };

  const actions: ArchiveActions = {
    registerUsage: (areaId, batchId, amount) =>
      run((s) => registerUsage(s, areaId, batchId, amount)),
    deactivateBatch: (batchId, reason) =>
      run((s) => deactivateBatch(s, batchId, reason)),
    reviewSwitchBatch: (areaId, newBatchId, amount) =>
      run((s) => reviewSwitchBatch(s, areaId, newBatchId, amount)),
    addBatch: (input) => run((s) => addBatch(s, input)),
    resetAll: () => {
      setState(resetArchive());
      setError(null);
    },
    dismissError: () => setError(null),
  };

  return { state, error, actions };
}
