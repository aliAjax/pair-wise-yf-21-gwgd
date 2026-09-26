// 规则层自测：node 直接运行（先由 esbuild 打包）。
// 覆盖：种子一致性、补线、停用隔离、复核换批、入库、存取回环。

import { seedArchive } from "../src/storage/seed";
import {
  addBatch,
  activeBatchesOf,
  deactivateBatch,
  findArea,
  progressOfRug,
  registerUsage,
  reviewSwitchBatch,
  usedOfArea,
} from "../src/domain/batchRules";
import type { ArchiveState } from "../src/domain/types";

let passed = 0;
function ok(cond: boolean, name: string) {
  if (!cond) {
    console.error(`✗ ${name}`);
    process.exit(1);
  }
  passed += 1;
  console.log(`✓ ${name}`);
}
function throws(fn: () => unknown, name: string) {
  try {
    fn();
  } catch {
    passed += 1;
    console.log(`✓ ${name}`);
    return;
  }
  console.error(`✗ ${name}（应抛错但未抛）`);
  process.exit(1);
}

// 1. 种子一致性：余量 = 到货量 - 已登记用量
{
  const s = seedArchive();
  for (const b of s.batches) {
    const used = s.rugs
      .flatMap((r) => r.areas)
      .flatMap((a) => a.uses)
      .filter((u) => u.batchId === b.id)
      .reduce((sum, u) => sum + u.amount, 0);
    ok(b.remaining === b.initial - used, `种子一致：${b.id} 余量 ${b.remaining}`);
  }
}

// 2. 补线：扣余量、写用量、状态推进
{
  let s = seedArchive();
  const before = s.batches.find((b) => b.id === "POM-07-2024A")!.remaining;
  s = registerUsage(s, "CAR-117-A2", "POM-07-2024A", 30);
  const batch = s.batches.find((b) => b.id === "POM-07-2024A")!;
  const { area } = findArea(s, "CAR-117-A2");
  ok(batch.remaining === before - 30, "补线扣减批次余量");
  ok(usedOfArea(area) === 30 && area.status === "修复中", "补线后区域转修复中");
  s = registerUsage(s, "CAR-117-A2", "POM-07-2024A", 30);
  ok(findArea(s, "CAR-117-A2").area.status === "已完工", "补足用量后区域完工");
  ok(s.records[0].type === "补线", "补线写入换批记录");
}

// 3. 补线校验
{
  const s = seedArchive();
  throws(() => registerUsage(s, "CAR-117-A2", "POM-07-2024A", 9999), "余量不足拒绝补线");
  throws(() => registerUsage(s, "CAR-117-A2", "IND-04-2024B", 10), "色号不符拒绝补线");
  throws(() => registerUsage(s, "CAR-117-A2", "POM-07-2024A", 0), "用量为 0 拒绝补线");
}

// 4. 停用：只影响用过该批的区域，其它批次/档案照常
{
  let s = seedArchive();
  const doneBefore = findArea(s, "CAR-138-A1").area.status; // 已完工，用过 IND-04-2023A
  s = deactivateBatch(s, "IND-04-2023A", "褪色");
  ok(s.records[0].type === "停用" && s.records[0].fromBatchId === "IND-04-2023A", "停用写入换批记录");
  ok(s.batches.find((b) => b.id === "IND-04-2023A")!.status === "discontinued", "批次标记停用");
  ok(findArea(s, "CAR-092-A1").area.status === "待复核", "用过该批的修复中区域转待复核");
  ok(findArea(s, "CAR-138-A1").area.status === "待复核", `用过该批的已完工区域也转待复核（原状态 ${doneBefore}）`);
  ok(usedOfArea(findArea(s, "CAR-092-A1").area) === 60, "待复核区域保留原用量");
  ok(findArea(s, "CAR-117-A1").area.status === "修复中", "未用该批的区域不受影响");
  ok(findArea(s, "CAR-092-A2").area.status === "已完工", "同毯其它区域不受影响");
  // 其它批次继续施工
  s = registerUsage(s, "CAR-117-A1", "MAD-02-2023A", 10);
  ok(findArea(s, "CAR-117-A1").area.status === "修复中", "停用后其它档案继续补线");
  // 停用批次不能再取线
  throws(() => registerUsage(s, "CAR-138-A1", "IND-04-2023A", 10), "停用批次拒绝取线");
  // 待复核区域不能直接补线
  throws(() => registerUsage(s, "CAR-092-A1", "IND-04-2024B", 10), "待复核区域须先复核换批");

  // 5. 复核换批：扣新批余量、解除待复核、原用量保留
  const newBefore = s.batches.find((b) => b.id === "IND-04-2024B")!.remaining;
  const oldUses = findArea(s, "CAR-092-A1").area.uses.length;
  s = reviewSwitchBatch(s, "CAR-092-A1", "IND-04-2024B", 60);
  const { area } = findArea(s, "CAR-092-A1");
  ok(s.batches.find((b) => b.id === "IND-04-2024B")!.remaining === newBefore - 60, "复核换批扣新批次余量");
  ok(area.status === "已完工", "复核补足后区域完工");
  ok(area.uses.length === oldUses + 1 && usedOfArea(area) === 120, "原用量保留并追加复核用量");
  ok(s.records[0].type === "复核换批" && s.records[0].fromBatchId === "IND-04-2023A", "换批记录含原批次与新批次");
  throws(() => reviewSwitchBatch(s, "CAR-117-A1", "MAD-02-2024B", 10), "非待复核区域拒绝复核换批");
  // 复核后该区域恢复正常施工链路
  ok(activeBatchesOf(s, "c-indigo").every((b) => b.id !== "IND-04-2023A"), "可用批次列表不再含停用批");
}

// 6. 入库
{
  let s = seedArchive();
  s = addBatch(s, { colorId: "c-lake", id: "LAK-01-2026A", arrivedAt: "2026-09-26", initial: 300 });
  ok(s.batches.some((b) => b.id === "LAK-01-2026A" && b.remaining === 300), "新批次入库");
  ok(s.records[0].type === "入库", "入库写入换批记录");
  throws(() => addBatch(s, { colorId: "c-lake", id: "LAK-01-2026A", arrivedAt: "2026-09-26", initial: 100 }), "批次号重复拒绝入库");
}

// 7. 存取回环（localStorage 打桩）
{
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  const { loadArchive, saveArchive } = await import("../src/storage/archiveStore");
  let s: ArchiveState = loadArchive();
  ok(s.rugs.length === 4, "空存储时载入种子档案");
  s = deactivateBatch(s, "MAD-02-2023A", "褪色");
  saveArchive(s);
  const reloaded = loadArchive();
  ok(
    reloaded.records.some((r) => r.type === "停用" && r.fromBatchId === "MAD-02-2023A"),
    "关掉页面再回来仍能看到停用/换批记录"
  );
  ok(findArea(reloaded, "CAR-117-A1").area.status === "待复核", "刷新后待复核状态保留");
  const p = progressOfRug(reloaded.rugs.find((r) => r.id === "CAR-117")!);
  ok(p.total === 2 && p.done === 0, "产地列表用的进度派生正常");
}

console.log(`\n全部通过：${passed} 项断言`);
