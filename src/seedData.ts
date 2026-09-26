// 初始示例档案：色卡 / 批次 / 破损区域 / 日志，首次进入时落盘。

import type { ChangeLog, StudioState } from "./types";
import { STORAGE_VERSION } from "./batchRules";

export function seedState(): StudioState {
  const colors = [
    { id: "col-red", code: "R-204", name: "茜草红", hex: "#9a3412" },
    { id: "col-indigo", code: "I-117", name: "靛蓝", hex: "#1e3a8a" },
    { id: "col-amber", code: "Y-088", name: "石榴黄", hex: "#b7791f" },
    { id: "col-brown", code: "N-031", name: "核桃棕", hex: "#5c3a21" },
  ];

  const batches = [
    {
      id: "bat-red-a",
      colorId: "col-red",
      arrivedAt: "2026-05-06",
      initialStock: 200,
      remaining: 148,
      status: "active" as const,
    },
    {
      id: "bat-red-b",
      colorId: "col-red",
      arrivedAt: "2026-08-18",
      initialStock: 120,
      remaining: 120,
      status: "active" as const,
    },
    {
      id: "bat-indigo-a",
      colorId: "col-indigo",
      arrivedAt: "2026-04-22",
      initialStock: 160,
      remaining: 140,
      status: "active" as const,
    },
    {
      id: "bat-indigo-b",
      colorId: "col-indigo",
      arrivedAt: "2026-08-30",
      initialStock: 100,
      remaining: 100,
      status: "active" as const,
    },
    {
      id: "bat-amber-a",
      colorId: "col-amber",
      arrivedAt: "2026-06-10",
      initialStock: 90,
      remaining: 90,
      status: "active" as const,
    },
    {
      id: "bat-brown-a",
      colorId: "col-brown",
      arrivedAt: "2026-03-15",
      initialStock: 150,
      remaining: 120,
      status: "active" as const,
    },
  ];

  const archives = [
    {
      id: "CAR-092",
      origin: "波斯",
      era: "约1960s",
      material: "羊毛",
      dyeType: "植物染",
      knotDensity: "36 结/英寸",
      areas: [
        {
          id: "area-092-edge",
          name: "左缘磨损",
          colorId: "col-red",
          currentBatchId: "bat-red-a",
          requiredAmount: 60,
          status: "施工中" as const,
          note: "边缘经线外露，需顺原纹补绒",
          usages: [
            { id: "use-092-1", batchId: "bat-red-a", amount: 52, at: "2026-09-02T10:00:00.000Z" },
          ],
        },
        {
          id: "area-092-corner",
          name: "角隅纹样缺绒",
          colorId: "col-amber",
          requiredAmount: 24,
          status: "待补线" as const,
          note: "等待选定石榴黄批次",
          usages: [],
        },
      ],
    },
    {
      id: "CAR-117",
      origin: "安纳托利亚",
      era: "约1980s",
      material: "羊毛",
      dyeType: "植物染",
      knotDensity: "42 结/英寸",
      areas: [
        {
          id: "area-117-center",
          name: "中心纹样缺口",
          colorId: "col-indigo",
          requiredAmount: 40,
          status: "待补线" as const,
          note: "靛蓝两批有色差，需先比对留样",
          usages: [],
        },
      ],
    },
    {
      id: "CAR-138",
      origin: "藏毯",
      era: "约1970s",
      material: "牦牛毛",
      dyeType: "矿物染",
      knotDensity: "48 结/英寸",
      areas: [
        {
          id: "area-138-fade",
          name: "局部褪色区",
          colorId: "col-indigo",
          currentBatchId: "bat-indigo-a",
          requiredAmount: 35,
          status: "施工中" as const,
          note: "与周边旧线混色衔接",
          usages: [
            { id: "use-138-1", batchId: "bat-indigo-a", amount: 20, at: "2026-09-08T09:20:00.000Z" },
          ],
        },
        {
          id: "area-138-border",
          name: "边框磨断",
          colorId: "col-brown",
          currentBatchId: "bat-brown-a",
          requiredAmount: 30,
          status: "已完工" as const,
          note: "修复前后照片已归档",
          usages: [
            { id: "use-138-2", batchId: "bat-brown-a", amount: 30, at: "2026-08-25T14:00:00.000Z" },
          ],
        },
      ],
    },
  ];

  const logs: ChangeLog[] = [
    { id: "log-seed-1", at: "2026-08-25T14:00:00.000Z", type: "allocate", batchId: "bat-brown-a", colorId: "col-brown", archiveId: "CAR-138", areaId: "area-138-border", amount: 30 },
    { id: "log-seed-2", at: "2026-09-02T10:00:00.000Z", type: "allocate", batchId: "bat-red-a", colorId: "col-red", archiveId: "CAR-092", areaId: "area-092-edge", amount: 52 },
    { id: "log-seed-3", at: "2026-09-08T09:20:00.000Z", type: "allocate", batchId: "bat-indigo-a", colorId: "col-indigo", archiveId: "CAR-138", areaId: "area-138-fade", amount: 20 },
  ];

  return { version: STORAGE_VERSION, colors, batches, archives, logs };
}
