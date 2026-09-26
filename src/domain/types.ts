// 领域模型：色卡、染料批次、地毯档案、破损区域、换批记录

export type BatchStatus = "active" | "discontinued";

export type AreaStatus = "待补线" | "修复中" | "已完工" | "待复核";

export type RecordType = "入库" | "补线" | "停用" | "复核换批";

/** 染料批次：同一色号下按到货分批，各自记余量 */
export interface DyeBatch {
  id: string; // 批次号，如 IND-04-2023A
  colorId: string;
  arrivedAt: string; // 到货日期 yyyy-mm-dd
  initial: number; // 到货量（克）
  remaining: number; // 余量（克）
  status: BatchStatus;
  note?: string; // 停用原因等
}

/** 材料色卡：只记颜色，批次挂在色号下 */
export interface ColorCard {
  id: string;
  name: string; // 如 靛蓝
  code: string; // 色号，如 IND-04
  hex: string;
}

/** 一条用量记录：某区域从某批次取线 */
export interface RepairUse {
  id: string;
  batchId: string;
  amount: number; // 克
  at: string;
  kind: "repair" | "review"; // 常规补线 / 复核换批
}

/** 破损区域 */
export interface DamagedArea {
  id: string;
  rugId: string;
  label: string;
  colorId: string; // 需要补的色号
  needed: number; // 预计需线（克）
  status: AreaStatus;
  uses: RepairUse[]; // 原用量始终保留
}

/** 地毯纹样档案 */
export interface RugArchive {
  id: string;
  origin: string; // 产地
  era: string;
  knotDensity: number; // 结密度（结/10cm）
  material: string;
  dyeType: string;
  areas: DamagedArea[];
}

/** 换批/批次流水：入库、补线、停用、复核换批都留痕 */
export interface ChangeRecord {
  id: string;
  at: string;
  type: RecordType;
  colorId: string;
  rugId?: string;
  areaId?: string;
  fromBatchId?: string;
  toBatchId?: string;
  amount?: number;
  note: string;
}

/** 整份档案库的持久化形态 */
export interface ArchiveState {
  colors: ColorCard[];
  batches: DyeBatch[];
  rugs: RugArchive[];
  records: ChangeRecord[];
}
