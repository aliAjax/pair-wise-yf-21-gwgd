// 纯展示辅助：日期与批次的显示文案

import type { StudioState } from "./types";
import { getColor } from "./batchRules";

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** 批次的显示名：色号 + 到货日期 */
export function batchLabel(state: StudioState, batchId?: string): string {
  if (!batchId) return "未选定批次";
  const b = state.batches.find((x) => x.id === batchId);
  if (!b) return `批次 ${batchId}`;
  const c = getColor(state, b.colorId);
  return `${c?.code ?? b.colorId} · ${b.arrivedAt}到货`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
