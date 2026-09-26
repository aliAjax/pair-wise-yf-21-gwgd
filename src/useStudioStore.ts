// 页面状态层：把「批次规则」与「档案存取」接到 React。
// 业务判断不在这里，这里只负责取快照、调用规则、落盘和界面提示。

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AddBatchInput,
  AllocateInput,
  ReassignInput,
  StudioState,
} from "./types";
import {
  addBatch,
  allocateThread,
  BatchRuleError,
  reassignBatch,
  retireBatch,
} from "./batchRules";
import { loadArchive, resetArchive, saveArchive } from "./archiveStore";

export interface Toast {
  kind: "ok" | "error";
  message: string;
}

export interface StudioActions {
  addNewBatch: (input: AddBatchInput) => boolean;
  allocate: (input: AllocateInput) => boolean;
  retire: (batchId: string, reason: string) => boolean;
  reassign: (input: ReassignInput) => boolean;
  resetAll: () => void;
}

export function useStudioStore() {
  const [state, setState] = useState<StudioState | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // 打开页面即从档案存取层恢复（含历次换批记录）
  useEffect(() => {
    setState(loadArchive());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // 规则层纯函数产出新快照 -> 落盘 -> 刷新页面状态
  const commit = useCallback(
    (updater: (prev: StudioState) => StudioState) => {
      if (!state) return false;
      try {
        const next = updater(state);
        saveArchive(next); // 每次动作即时落盘，关闭页面不丢记录
        setState(next);
        setToast({ kind: "ok", message: "已更新并保存到档案" });
        return true;
      } catch (error) {
        setToast({
          kind: "error",
          message:
            error instanceof BatchRuleError ? error.message : "操作失败，请检查输入",
        });
        return false;
      }
    },
    [state]
  );

  const actions: StudioActions = useMemo(
    () => ({
      addNewBatch: (input) => commit((s) => addBatch(s, input)),
      allocate: (input) => commit((s) => allocateThread(s, input)),
      retire: (batchId, reason) => commit((s) => retireBatch(s, batchId, reason)),
      reassign: (input) => commit((s) => reassignBatch(s, input)),
      resetAll: () => {
        setState(resetArchive());
        setToast({ kind: "ok", message: "已恢复为示例档案" });
      },
    }),
    [commit]
  );

  return { state, actions, toast };
}
