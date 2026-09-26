// 档案数据结构：色卡（颜色）— 染料批次 — 破损区域 — 换批记录

export type BatchStatus = "active" | "retired";

/** 染料批次：同一色号下不同到货批次，各自独立维护余量 */
export interface DyeBatch {
  id: string;
  colorId: string;
  /** 到货日期 ISO，如 2026-08-12 */
  arrivedAt: string;
  /** 到货数量（米） */
  initialStock: number;
  /** 当前余量（米） */
  remaining: number;
  status: BatchStatus;
  /** 停用原因，如褪色 */
  retireReason?: string;
  /** 停用时间 ISO */
  retiredAt?: string;
}

/** 一次补线用量：分配/复核换批都会留下一条 */
export interface BatchUsage {
  id: string;
  batchId: string;
  /** 用线量（米） */
  amount: number;
  at: string;
  /** 本条用量来自哪次复核（首配为空） */
  reassignLogId?: string;
}

export type AreaStatus = "待补线" | "施工中" | "已完工" | "待复核";

/** 破损区域：补线时必须选定具体批次 */
export interface DamagedArea {
  id: string;
  name: string;
  colorId: string;
  /** 当前施工使用的批次；复核换批后指向新批次 */
  currentBatchId?: string;
  /** 该区域需要的总用线量（米） */
  requiredAmount: number;
  /** 历史用量全部保留，停用批次的原用量也不删除 */
  usages: BatchUsage[];
  status: AreaStatus;
  note?: string;
}

/** 地毯修复档案 */
export interface CarpetArchive {
  id: string;
  origin: string;
  era: string;
  material: string;
  dyeType: string;
  knotDensity: string;
  areas: DamagedArea[];
}

/** 材料色卡：档案里原来只记颜色，现在颜色下挂批次 */
export interface ColorCard {
  id: string;
  code: string;
  name: string;
  hex: string;
}

/** 换批 / 批次动作日志：页面关掉再回来仍可追溯 */
export interface ChangeLog {
  id: string;
  at: string;
  type: "add" | "allocate" | "retire" | "reassign";
  batchId: string;
  colorId: string;
  archiveId?: string;
  areaId?: string;
  amount?: number;
  reason?: string;
  /** 复核换批时被替换掉的旧批次 */
  fromBatchId?: string;
  toBatchId?: string;
}

/** 档案持久层保存的完整快照 */
export interface StudioState {
  version: number;
  colors: ColorCard[];
  batches: DyeBatch[];
  archives: CarpetArchive[];
  logs: ChangeLog[];
}

// ---- 规则层的入参类型 ----

export interface AddBatchInput {
  colorId: string;
  arrivedAt: string;
  initialStock: number;
}

export interface AllocateInput {
  archiveId: string;
  areaId: string;
  batchId: string;
  amount: number;
}

export interface ReassignInput {
  archiveId: string;
  areaId: string;
  newBatchId: string;
  amount: number;
}
