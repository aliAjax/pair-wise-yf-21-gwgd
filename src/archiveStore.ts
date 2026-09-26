// 档案存取层：负责工作室档案的读取与落盘（localStorage）。
// 不包含任何批次业务规则，也不依赖 React；页面层只通过这里取数/存数。

import type { StudioState } from "./types";
import { STORAGE_VERSION } from "./batchRules";
import { seedState } from "./seedData";

const STORAGE_KEY = "hxyfront-62009.studio-archive.v1";

/** 读取档案；首次访问或数据损坏时回落到初始示例档案 */
export function loadArchive(): StudioState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedState();
      saveArchive(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as StudioState;
    if (!parsed || parsed.version !== STORAGE_VERSION) {
      throw new Error("archive version mismatch");
    }
    return parsed;
  } catch {
    const seeded = seedState();
    saveArchive(seeded);
    return seeded;
  }
}

/** 全量快照落盘：关掉页面再回来，批次、用量与每次换批记录都还在 */
export function saveArchive(state: StudioState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetArchive(): StudioState {
  const seeded = seedState();
  saveArchive(seeded);
  return seeded;
}
