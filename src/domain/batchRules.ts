// 批次规则：全部为纯函数，输入旧档案返回新档案，规则不合法时抛出中文错误。
// 这一层不关心 React，也不关心存取方式。

import type {
  ArchiveState,
  ChangeRecord,
  DamagedArea,
  DyeBatch,
  RecordType,
  RepairUse,
  RugArchive,
} from "./types";

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export function nowStamp(): string {
  return new Date().toISOString();
}

// ---------- 查询派生 ----------

export function usedOfArea(area: DamagedArea): number {
  return area.uses.reduce((sum, u) => sum + u.amount, 0);
}

/** 区域进度 0~1（返工可能超过 1，展示时截断） */
export function progressOfArea(area: DamagedArea): number {
  if (area.needed <= 0) return 1;
  return usedOfArea(area) / area.needed;
}

export function progressOfRug(rug: RugArchive): {
  done: number;
  total: number;
  percent: number;
} {
  const total = rug.areas.length;
  const done = rug.areas.filter((a) => a.status === "已完工").length;
  const percent =
    total === 0
      ? 0
      : rug.areas.reduce((s, a) => s + Math.min(1, progressOfArea(a)), 0) /
        total;
  return { done, total, percent };
}

export function findBatch(state: ArchiveState, batchId: string): DyeBatch {
  const batch = state.batches.find((b) => b.id === batchId);
  if (!batch) throw new Error(`找不到批次 ${batchId}`);
  return batch;
}

export function findArea(
  state: ArchiveState,
  areaId: string
): { rug: RugArchive; area: DamagedArea } {
  for (const rug of state.rugs) {
    const area = rug.areas.find((a) => a.id === areaId);
    if (area) return { rug, area };
  }
  throw new Error(`找不到破损区域 ${areaId}`);
}

export function activeBatchesOf(
  state: ArchiveState,
  colorId: string
): DyeBatch[] {
  return state.batches
    .filter((b) => b.colorId === colorId && b.status === "active")
    .sort((a, b) => a.arrivedAt.localeCompare(b.arrivedAt));
}

/** 区域当前受影响的停用批次（可能先后用过多个停用批） */
export function discontinuedBatchesOf(
  state: ArchiveState,
  area: DamagedArea
): DyeBatch[] {
  const ids = new Set(area.uses.map((u) => u.batchId));
  return state.batches.filter((b) => ids.has(b.id) && b.status === "discontinued");
}

// ---------- 内部工具 ----------

function recomputeStatus(area: DamagedArea): DamagedArea {
  if (area.status === "待复核") return area; // 只能由复核换批解除
  const used = usedOfArea(area);
  const status =
    used <= 0 ? "待补线" : used >= area.needed ? "已完工" : "修复中";
  return { ...area, status };
}

function withArea(
  state: ArchiveState,
  areaId: string,
  fn: (area: DamagedArea) => DamagedArea
): ArchiveState {
  return {
    ...state,
    rugs: state.rugs.map((rug) => ({
      ...rug,
      areas: rug.areas.map((a) => (a.id === areaId ? fn(a) : a)),
    })),
  };
}

function withBatch(
  state: ArchiveState,
  batchId: string,
  fn: (batch: DyeBatch) => DyeBatch
): ArchiveState {
  return {
    ...state,
    batches: state.batches.map((b) => (b.id === batchId ? fn(b) : b)),
  };
}

function appendRecord(
  state: ArchiveState,
  record: Omit<ChangeRecord, "id" | "at"> & { at?: string }
): ArchiveState {
  const entry: ChangeRecord = {
    id: uid("rec"),
    at: record.at ?? nowStamp(),
    ...record,
  };
  return { ...state, records: [entry, ...state.records] };
}

function assertAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("用量需为大于 0 的数字");
  }
}

function assertUsableBatch(
  state: ArchiveState,
  batchId: string,
  colorId: string,
  amount: number
): DyeBatch {
  const batch = findBatch(state, batchId);
  if (batch.status === "discontinued") {
    throw new Error(`批次 ${batch.id} 已停用，不能再取线`);
  }
  if (batch.colorId !== colorId) {
    throw new Error(`批次 ${batch.id} 不属于该区域所需色号`);
  }
  if (amount > batch.remaining) {
    throw new Error(
      `批次 ${batch.id} 余量不足：剩 ${batch.remaining}g，需 ${amount}g`
    );
  }
  return batch;
}

// ---------- 规则一：新批次入库 ----------

export function addBatch(
  state: ArchiveState,
  input: { colorId: string; id: string; arrivedAt: string; initial: number },
  at?: string
): ArchiveState {
  const color = state.colors.find((c) => c.id === input.colorId);
  if (!color) throw new Error("找不到对应色卡");
  const id = input.id.trim();
  if (!id) throw new Error("批次号不能为空");
  if (state.batches.some((b) => b.id === id)) {
    throw new Error(`批次号 ${id} 已存在`);
  }
  if (!input.arrivedAt) throw new Error("请填写到货日期");
  assertAmount(input.initial);

  const batch: DyeBatch = {
    id,
    colorId: color.id,
    arrivedAt: input.arrivedAt,
    initial: input.initial,
    remaining: input.initial,
    status: "active",
  };
  let next: ArchiveState = { ...state, batches: [...state.batches, batch] };
  next = appendRecord(next, {
    type: "入库",
    colorId: color.id,
    toBatchId: id,
    amount: input.initial,
    note: `${color.name}（${color.code}）新批次 ${id} 到货 ${input.initial}g`,
    at,
  });
  return next;
}

// ---------- 规则二：破损区域补线，选定具体批次 ----------

export function registerUsage(
  state: ArchiveState,
  areaId: string,
  batchId: string,
  amount: number,
  at?: string
): ArchiveState {
  const { rug, area } = findArea(state, areaId);
  if (area.status === "待复核") {
    throw new Error("该区域正待复核，请先完成复核换批再补线");
  }
  assertAmount(amount);
  assertUsableBatch(state, batchId, area.colorId, amount);

  const use: RepairUse = {
    id: uid("use"),
    batchId,
    amount,
    at: at ?? nowStamp(),
    kind: "repair",
  };
  let next = withBatch(state, batchId, (b) => ({
    ...b,
    remaining: b.remaining - amount,
  }));
  next = withArea(next, areaId, (a) =>
    recomputeStatus({ ...a, uses: [...a.uses, use] })
  );
  next = appendRecord(next, {
    type: "补线",
    colorId: area.colorId,
    rugId: rug.id,
    areaId: area.id,
    toBatchId: batchId,
    amount,
    note: `${rug.id}「${area.label}」从批次 ${batchId} 取线 ${amount}g`,
    at,
  });
  return next;
}

// ---------- 规则三：批次因褪色停用 ----------
// 只影响用过该批的区域（转待复核、保留原用量）；
// 其它批次、其它档案不受影响，可继续施工。

export function deactivateBatch(
  state: ArchiveState,
  batchId: string,
  reason: string,
  at?: string
): ArchiveState {
  const batch = findBatch(state, batchId);
  if (batch.status === "discontinued") {
    throw new Error(`批次 ${batch.id} 已经停用`);
  }

  let next = withBatch(state, batchId, (b) => ({
    ...b,
    status: "discontinued",
    note: reason,
  }));

  const affected: string[] = [];
  next = {
    ...next,
    rugs: next.rugs.map((rug) => ({
      ...rug,
      areas: rug.areas.map((area) => {
        const hit = area.uses.some((u) => u.batchId === batchId);
        if (!hit) return area;
        affected.push(`${rug.id}「${area.label}」`);
        return { ...area, status: "待复核" }; // uses 原样保留
      }),
    })),
  };

  next = appendRecord(next, {
    type: "停用",
    colorId: batch.colorId,
    fromBatchId: batchId,
    note:
      affected.length > 0
        ? `批次 ${batchId} 因${reason}停用，${affected.length} 个区域转待复核：${affected.join("、")}`
        : `批次 ${batchId} 因${reason}停用，暂无区域使用`,
    at,
  });
  return next;
}

// ---------- 规则四：复核后改用新批次 ----------
// 扣新批次余量、写复核用量、解除待复核；
// 色卡余量、区域进度、产地列表都从这同一份状态派生，自然同步。

export function reviewSwitchBatch(
  state: ArchiveState,
  areaId: string,
  newBatchId: string,
  amount: number,
  at?: string
): ArchiveState {
  const { rug, area } = findArea(state, areaId);
  if (area.status !== "待复核") {
    throw new Error("该区域不在待复核状态");
  }
  assertAmount(amount);
  assertUsableBatch(state, newBatchId, area.colorId, amount);

  const oldBatches = discontinuedBatchesOf(state, area).map((b) => b.id);
  const use: RepairUse = {
    id: uid("use"),
    batchId: newBatchId,
    amount,
    at: at ?? nowStamp(),
    kind: "review",
  };

  let next = withBatch(state, newBatchId, (b) => ({
    ...b,
    remaining: b.remaining - amount,
  }));
  next = withArea(next, areaId, (a) =>
    recomputeStatus({ ...a, status: "修复中", uses: [...a.uses, use] })
  );
  next = appendRecord(next, {
    type: "复核换批",
    colorId: area.colorId,
    rugId: rug.id,
    areaId: area.id,
    fromBatchId: oldBatches.join("、") || undefined,
    toBatchId: newBatchId,
    amount,
    note: `${rug.id}「${area.label}」复核后改用批次 ${newBatchId}，补线 ${amount}g（原用量保留）`,
    at,
  });
  return next;
}

export const recordTypeLabel: Record<RecordType, string> = {
  入库: "入库",
  补线: "补线",
  停用: "停用",
  复核换批: "复核换批",
};
