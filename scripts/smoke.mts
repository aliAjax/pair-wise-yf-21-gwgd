import { seedState } from "../src/seedData";
import {
  addBatch,
  allocateThread,
  reassignBatch,
  retireBatch,
  usableBatches,
  usedAmount,
  areaProgress,
  areasUsingBatch,
  getBatch,
  BatchRuleError,
} from "../src/batchRules";
import type { StudioState } from "../src/types";

let s: StudioState = seedState();
let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    console.log("PASS", name);
  } else {
    failures++;
    console.error("FAIL", name, extra);
  }
}

const now = (m: string) => new Date(m).toISOString();

// 1. 登记新批次：到货日期与余量独立维护
s = addBatch(s, { colorId: "col-indigo", arrivedAt: "2026-09-20", initialStock: 80 }, now("2026-09-20"));
const newIndigo = s.batches.filter((b) => b.colorId === "col-indigo").pop()!;
check("新批次到货余量=80", newIndigo.remaining === 80);
check("新批次日志置顶", s.logs[0].type === "add");

// 2. 破损区补线：必须选定具体批次，扣余量、进施工中
const indigoABefore = getBatch(s, "bat-indigo-a")!.remaining;
s = allocateThread(
  s,
  { archiveId: "CAR-117", areaId: "area-117-center", batchId: "bat-indigo-a", amount: 15 },
  now("2026-09-21")
);
check(
  "补线扣减该批次余量",
  getBatch(s, "bat-indigo-a")!.remaining === indigoABefore - 15
);
const area117 = s.archives.find((a) => a.id === "CAR-117")!.areas[0];
check("补线后区域进入施工中", area117.status === "施工中", area117.status);
check("补线写入具体用量", area117.usages.at(-1)!.batchId === "bat-indigo-a");

// 3. 跨色号 / 停用批 / 余量不足 都要被规则拒绝
function expectError(label: string, fn: () => void) {
  try {
    fn();
    check(label, false, "未抛出规则错误");
  } catch (e) {
    check(label + "（拒绝：" + (e as BatchRuleError).message + "）", e instanceof BatchRuleError);
  }
}
expectError("停用批次不能补线", () => {
  const t = retireBatch(s, "bat-red-a", "褪色", now("2026-09-22"));
  allocateThread(t, {
    archiveId: "CAR-092",
    areaId: "area-092-edge",
    batchId: "bat-red-a",
    amount: 1,
  });
});
expectError("色号不一致不能选批", () =>
  allocateThread(s, {
    archiveId: "CAR-117",
    areaId: "area-117-center",
    batchId: "bat-red-b",
    amount: 1,
  })
);
expectError("余量不足拒绝补线", () =>
  allocateThread(s, {
    archiveId: "CAR-117",
    areaId: "area-117-center",
    batchId: "bat-indigo-a",
    amount: 9999,
  })
);

// 4. 停用褪色批次：波及所有正在用它的区域（跨档案，含已完工），其它批次/档案照常
const using = areasUsingBatch(s, "bat-indigo-a");
check("停用前两个档案的区域引用该批", using.length === 2, String(using.length));
s = retireBatch(s, "bat-indigo-a", "留样褪色", now("2026-09-22"));
check("停用后状态为 retired", getBatch(s, "bat-indigo-a")!.status === "retired");
check(
  "其它批次不受影响仍在用",
  usableBatches(s, "col-indigo").every((b) => b.status === "active") &&
    usableBatches(s, "col-indigo").length === 2
);
for (const { archive, area } of using) {
  const live = s.archives.find((a) => a.id === archive.id)!.areas.find((x) => x.id === area.id)!;
  check(`${archive.id} ${area.name} 转待复核`, live.status === "待复核", live.status);
  check(
    `${archive.id} ${area.name} 原用量保留`,
    usedAmount(live) === usedAmount(area) && usedAmount(live) > 0,
    `现 ${usedAmount(live)} / 原 ${usedAmount(area)}`
  );
  check("停用后 currentBatchId 仍指向旧批以便追溯", live.currentBatchId === "bat-indigo-a");
}
// 停用不影响其它颜色/档案：石榴黄待补线区域照常选批施工
const amberBefore = getBatch(s, "bat-amber-a")!.remaining;
s = allocateThread(
  s,
  { archiveId: "CAR-092", areaId: "area-092-corner", batchId: "bat-amber-a", amount: 10 },
  now("2026-09-23")
);
check("其它颜色批次余量正常扣减", getBatch(s, "bat-amber-a")!.remaining === amberBefore - 10);
const corner = s.archives.find((a) => a.id === "CAR-092")!.areas.find((x) => x.id === "area-092-corner")!;
check("其它档案区域正常进入施工中", corner.status === "施工中", corner.status);

// 5. 待复核区域不能直接补线，必须复核换批
expectError("待复核区域拒绝直接补线", () =>
  allocateThread(s, {
    archiveId: "CAR-117",
    areaId: "area-117-center",
    batchId: newIndigo.id,
    amount: 5,
  })
);
const targetBefore = getBatch(s, newIndigo.id)!.remaining;
s = reassignBatch(
  s,
  { archiveId: "CAR-117", areaId: "area-117-center", newBatchId: newIndigo.id, amount: 25 },
  now("2026-09-24")
);
const area117b = s.archives.find((a) => a.id === "CAR-117")!.areas[0];
check("复核后指向新批次", area117b.currentBatchId === newIndigo.id);
check("复核扣减新批次余量", getBatch(s, newIndigo.id)!.remaining === targetBefore - 25);
check("复核后区域恢复施工中", area117b.status === "施工中", area117b.status);
check(
  "进度按新批次重算（25/40=63%）",
  areaProgress(area117b) === 63,
  String(areaProgress(area117b))
);
check("旧批用量仍保留在 usages", area117b.usages.some((u) => u.batchId === "bat-indigo-a"));
check("新用量带复核标记", !!area117b.usages.at(-1)!.reassignLogId);
const reassignLog = s.logs[0];
check(
  "换批日志记录旧批→新批",
  reassignLog.type === "reassign" &&
    reassignLog.fromBatchId === "bat-indigo-a" &&
    reassignLog.toBatchId === newIndigo.id
);

// 6. 足量复核直接完工
s = reassignBatch(
  s,
  { archiveId: "CAR-138", areaId: "area-138-fade", newBatchId: "bat-indigo-b", amount: 35 },
  now("2026-09-25")
);
const area138 = s.archives.find((a) => a.id === "CAR-138")!.areas.find((x) => x.id === "area-138-fade")!;
check("足量复核换批后完工，进度100%", area138.status === "已完工" && areaProgress(area138) === 100);

// 7. 产地筛选不受数据操作影响（纯数据校验）
const origins = Array.from(new Set(s.archives.map((a) => a.origin)));
check("档案仍覆盖三个产地", origins.length === 3, origins.join(","));
check("停用批日志数 = 受影响区域数 + 其他停用动作", s.logs.filter((l) => l.type === "retire").length >= 2);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
