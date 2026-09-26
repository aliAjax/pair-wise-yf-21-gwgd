// 批次规则层：纯函数，不碰 React 与 localStorage。
// 所有写操作都返回新状态（不可变更新），由档案存取层负责持久化。

import type {
  AddBatchInput,
  AllocateInput,
  AreaStatus,
  BatchStatus,
  ChangeLog,
  ColorCard,
  CarpetArchive,
  DamagedArea,
  DyeBatch,
  ReassignInput,
  StudioState,
} from "./types";

export const STORAGE_VERSION = 1;

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export class BatchRuleError extends Error {}

// ---------- 查询类规则 ----------

/** 某颜色下仍可施工的批次（未停用且有余量） */
export function usableBatches(state: StudioState, colorId: string): DyeBatch[] {
  return state.batches
    .filter((b) => b.colorId === colorId && b.status === "active")
    .sort((a, b) => a.arrivedAt.localeCompare(b.arrivedAt));
}

export function batchesOfColor(state: StudioState, colorId: string): DyeBatch[] {
  return state.batches
    .filter((b) => b.colorId === colorId)
    .sort((a, b) => a.arrivedAt.localeCompare(b.arrivedAt));
}

export function getBatch(state: StudioState, batchId?: string): DyeBatch | undefined {
  if (!batchId) return undefined;
  return state.batches.find((b) => b.id === batchId);
}

export function getColor(state: StudioState, colorId: string): ColorCard | undefined {
  return state.colors.find((c) => c.id === colorId);
}

export function getArchive(state: StudioState, archiveId: string): CarpetArchive | undefined {
  return state.archives.find((a) => a.id === archiveId);
}

/** 区域已用线量：历史用量全部计入（含已停用批次） */
export function usedAmount(area: DamagedArea): number {
  return area.usages.reduce((sum, u) => sum + u.amount, 0);
}

/** 区域当前批次已补的量（用于进度百分比） */
export function currentBatchUsed(area: DamagedArea): number {
  if (!area.currentBatchId) return 0;
  return area.usages
    .filter((u) => u.batchId === area.currentBatchId)
    .reduce((sum, u) => sum + u.amount, 0);
}

/** 施工进度 0~100，按当前批次累计用量 / 需求总量 */
export function areaProgress(area: DamagedArea): number {
  if (area.requiredAmount <= 0) return 0;
  return Math.min(100, Math.round((currentBatchUsed(area) / area.requiredAmount) * 100));
}

/** 颜色在所有在用批次上的余量合计 */
export function colorRemaining(state: StudioState, colorId: string): number {
  return state.batches
    .filter((b) => b.colorId === colorId && b.status === "active")
    .reduce((sum, b) => sum + b.remaining, 0);
}

/** 找出所有引用了某批次的破损区域（跨档案） */
export function areasUsingBatch(
  state: StudioState,
  batchId: string
): Array<{ archive: CarpetArchive; area: DamagedArea }> {
  const hits: Array<{ archive: CarpetArchive; area: DamagedArea }> = [];
  for (const archive of state.archives) {
    for (const area of archive.areas) {
      if (area.currentBatchId === batchId) hits.push({ archive, area });
    }
  }
  return hits;
}

export const AREA_STATUS_LABEL: Record<AreaStatus, string> = {
  待补线: "待补线",
  施工中: "施工中",
  已完工: "已完工",
  待复核: "待复核",
};

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  active: "在用",
  retired: "已停用",
};

// ---------- 写入类规则（纯函数，返回 { state, log }）----------

function appendLog(state: StudioState, log: ChangeLog): StudioState {
  return { ...state, logs: [log, ...state.logs] };
}

/** 为色卡登记一个新到货批次 */
export function addBatch(
  state: StudioState,
  input: AddBatchInput,
  now: string = new Date().toISOString()
): StudioState {
  const color = getColor(state, input.colorId);
  if (!color) throw new BatchRuleError("色卡不存在，无法登记批次");
  if (!input.arrivedAt) throw new BatchRuleError("请填写到货日期");
  if (!(input.initialStock > 0)) throw new BatchRuleError("到货余量必须大于 0");

  const batch: DyeBatch = {
    id: uid("bat"),
    colorId: input.colorId,
    arrivedAt: input.arrivedAt,
    initialStock: input.initialStock,
    remaining: input.initialStock,
    status: "active",
  };
  const next = { ...state, batches: [...state.batches, batch] };
  return appendLog(next, {
    id: uid("log"),
    at: now,
    type: "add",
    batchId: batch.id,
    colorId: input.colorId,
    amount: input.initialStock,
  });
}

/** 破损区补线：选定具体批次，扣减余量、追加用量、更新区域状态与进度 */
export function allocateThread(
  state: StudioState,
  input: AllocateInput,
  now: string = new Date().toISOString()
): StudioState {
  if (!(input.amount > 0)) throw new BatchRuleError("补线用量必须大于 0");
  const batch = state.batches.find((b) => b.id === input.batchId);
  if (!batch) throw new BatchRuleError("所选批次不存在");
  if (batch.status === "retired") throw new BatchRuleError("该批次已停用，不能再补线");
  if (batch.remaining < input.amount)
    throw new BatchRuleError(`批次余量不足，仅剩 ${batch.remaining} 米`);

  const archive = getArchive(state, input.archiveId);
  const area = archive?.areas.find((a) => a.id === input.areaId);
  if (!archive || !area) throw new BatchRuleError("破损区域不存在");
  if (area.colorId !== batch.colorId)
    throw new BatchRuleError("批次色号与该破损区需要的颜色不一致");
  if (area.status === "已完工") throw new BatchRuleError("该区域已完工");
  if (area.status === "待复核")
    throw new BatchRuleError("该区域待复核，请改用新批次后再施工");

  const usage = {
    id: uid("use"),
    batchId: batch.id,
    amount: input.amount,
    at: now,
  };

  const used =
    (area.currentBatchId === batch.id ? currentBatchUsed(area) : 0) + input.amount;
  const status: AreaStatus = used >= area.requiredAmount ? "已完工" : "施工中";

  const next: StudioState = {
    ...state,
    batches: state.batches.map((b) =>
      b.id === batch.id ? { ...b, remaining: b.remaining - input.amount } : b
    ),
    archives: state.archives.map((a) =>
      a.id !== archive.id
        ? a
        : {
            ...a,
            areas: a.areas.map((ar) =>
              ar.id !== area.id
                ? ar
                : {
                    ...ar,
                    currentBatchId: batch.id,
                    usages: [...ar.usages, usage],
                    status,
                  }
            ),
          }
    ),
  };

  return appendLog(next, {
    id: uid("log"),
    at: now,
    type: "allocate",
    batchId: batch.id,
    colorId: batch.colorId,
    archiveId: archive.id,
    areaId: area.id,
    amount: input.amount,
  });
}

/**
 * 批次停用（如褪色）：
 * - 该批次标记停用，其它批次与其它档案照常施工；
 * - 当前正在使用该批的破损区域全部转「待复核」，原用量原样保留。
 */
export function retireBatch(
  state: StudioState,
  batchId: string,
  reason: string,
  now: string = new Date().toISOString()
): StudioState {
  const batch = getBatch(state, batchId);
  if (!batch) throw new BatchRuleError("批次不存在");
  if (batch.status === "retired") throw new BatchRuleError("该批次已是停用状态");

  const affected = areasUsingBatch(state, batchId);

  let next: StudioState = {
    ...state,
    batches: state.batches.map((b) =>
      b.id === batchId
        ? {
            ...b,
            status: "retired" as BatchStatus,
            retireReason: reason || "褪色",
            retiredAt: now,
          }
        : b
    ),
    archives: state.archives.map((a) => ({
      ...a,
      areas: a.areas.map((ar) =>
        ar.currentBatchId === batchId
          ? { ...ar, status: "待复核" as AreaStatus }
          : ar
      ),
    })),
  };

  for (const { archive, area } of affected) {
    next = appendLog(next, {
      id: uid("log"),
      at: now,
      type: "retire",
      batchId,
      colorId: batch.colorId,
      archiveId: archive.id,
      areaId: area.id,
      reason: reason || "褪色",
    });
  }
  if (affected.length === 0) {
    next = appendLog(next, {
      id: uid("log"),
      at: now,
      type: "retire",
      batchId,
      colorId: batch.colorId,
      reason: reason || "褪色",
    });
  }
  return next;
}

/**
 * 待复核区域改用新批次：
 * - 新批次扣减余量并追加用量；旧批次的历史用量保留不动；
 * - 区域进度按新批次重新计算，状态转「施工中 / 已完工」；
 * - 留下一条 reassign 换批记录。
 */
export function reassignBatch(
  state: StudioState,
  input: ReassignInput,
  now: string = new Date().toISOString()
): StudioState {
  if (!(input.amount > 0)) throw new BatchRuleError("补线用量必须大于 0");
  const batch = state.batches.find((b) => b.id === input.newBatchId);
  if (!batch) throw new BatchRuleError("新批次不存在");
  if (batch.status === "retired") throw new BatchRuleError("新批次已停用，不能选用");
  if (batch.remaining < input.amount)
    throw new BatchRuleError(`新批次余量不足，仅剩 ${batch.remaining} 米`);

  const archive = getArchive(state, input.archiveId);
  const area = archive?.areas.find((a) => a.id === input.areaId);
  if (!archive || !area) throw new BatchRuleError("破损区域不存在");
  if (area.colorId !== batch.colorId)
    throw new BatchRuleError("新批次色号与该区域需要的颜色不一致");

  const oldBatchId = area.currentBatchId;
  const logId = uid("log");

  const usage = {
    id: uid("use"),
    batchId: batch.id,
    amount: input.amount,
    at: now,
    reassignLogId: logId,
  };

  const usedOnNew = input.amount;
  const status: AreaStatus = usedOnNew >= area.requiredAmount ? "已完工" : "施工中";

  let next: StudioState = {
    ...state,
    batches: state.batches.map((b) =>
      b.id === batch.id ? { ...b, remaining: b.remaining - input.amount } : b
    ),
    archives: state.archives.map((a) =>
      a.id !== archive.id
        ? a
        : {
            ...a,
            areas: a.areas.map((ar) =>
              ar.id !== area.id
                ? ar
                : {
                    ...ar,
                    currentBatchId: batch.id,
                    usages: [...ar.usages, usage],
                    status,
                  }
            ),
          }
    ),
  };

  next = appendLog(next, {
    id: logId,
    at: now,
    type: "reassign",
    batchId: batch.id,
    colorId: batch.colorId,
    archiveId: archive.id,
    areaId: area.id,
    amount: input.amount,
    fromBatchId: oldBatchId,
    toBatchId: batch.id,
  });
  return next;
}
