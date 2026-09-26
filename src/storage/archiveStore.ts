// 档案存取层：只负责把整份档案读进来、写回去，不含任何批次规则。
// 当前实现为 localStorage，换掉本文件即可迁移到后端接口。

import type { ArchiveState } from "../domain/types";
import { seedArchive } from "./seed";

const STORAGE_KEY = "carpet-repair-archive/v1";

function isArchiveState(value: unknown): value is ArchiveState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.colors) &&
    Array.isArray(v.batches) &&
    Array.isArray(v.rugs) &&
    Array.isArray(v.records)
  );
}

export function loadArchive(): ArchiveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedArchive();
    const parsed: unknown = JSON.parse(raw);
    if (!isArchiveState(parsed)) return seedArchive();
    return parsed;
  } catch {
    return seedArchive();
  }
}

export function saveArchive(state: ArchiveState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储被禁用或已满时静默失败，页面内状态仍可用
  }
}

export function resetArchive(): ArchiveState {
  const fresh = seedArchive();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // 同上
  }
  return fresh;
}
