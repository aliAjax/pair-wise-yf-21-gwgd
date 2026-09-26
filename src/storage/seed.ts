// 初始档案：色卡、批次、地毯与既有用量。
// 批次余量 = 到货量 - 已登记用量，两处保持一致。

import type { ArchiveState } from "../domain/types";

export function seedArchive(): ArchiveState {
  return {
    colors: [
      { id: "c-indigo", name: "靛蓝", code: "IND-04", hex: "#274472" },
      { id: "c-madder", name: "茜草红", code: "MAD-02", hex: "#9f1239" },
      { id: "c-pome", name: "石榴黄", code: "POM-07", hex: "#b45309" },
      { id: "c-walnut", name: "核桃壳棕", code: "WAL-03", hex: "#7c2d12" },
      { id: "c-lake", name: "湖绿", code: "LAK-01", hex: "#0f766e" },
    ],
    batches: [
      { id: "IND-04-2023A", colorId: "c-indigo", arrivedAt: "2023-11-02", initial: 600, remaining: 450, status: "active" },
      { id: "IND-04-2024B", colorId: "c-indigo", arrivedAt: "2024-06-18", initial: 600, remaining: 600, status: "active" },
      { id: "IND-04-2025C", colorId: "c-indigo", arrivedAt: "2025-03-09", initial: 400, remaining: 400, status: "active" },
      { id: "MAD-02-2023A", colorId: "c-madder", arrivedAt: "2023-09-14", initial: 500, remaining: 450, status: "active" },
      { id: "MAD-02-2024B", colorId: "c-madder", arrivedAt: "2024-10-01", initial: 500, remaining: 500, status: "active" },
      { id: "POM-07-2024A", colorId: "c-pome", arrivedAt: "2024-02-20", initial: 90, remaining: 90, status: "active" },
      { id: "POM-07-2025B", colorId: "c-pome", arrivedAt: "2025-05-11", initial: 450, remaining: 450, status: "active" },
      { id: "WAL-03-2023A", colorId: "c-walnut", arrivedAt: "2023-12-05", initial: 700, remaining: 620, status: "active" },
      { id: "WAL-03-2024B", colorId: "c-walnut", arrivedAt: "2024-08-22", initial: 700, remaining: 700, status: "active" },
      { id: "LAK-01-2024A", colorId: "c-lake", arrivedAt: "2024-04-02", initial: 300, remaining: 280, status: "active" },
      { id: "LAK-01-2025B", colorId: "c-lake", arrivedAt: "2025-01-15", initial: 300, remaining: 300, status: "active" },
    ],
    rugs: [
      {
        id: "CAR-092",
        origin: "波斯",
        era: "约1960s",
        knotDensity: 36,
        material: "羊毛",
        dyeType: "植物染",
        areas: [
          {
            id: "CAR-092-A1",
            rugId: "CAR-092",
            label: "西北角边缘磨损",
            colorId: "c-indigo",
            needed: 120,
            status: "修复中",
            uses: [
              { id: "use-seed-1", batchId: "IND-04-2023A", amount: 60, at: "2026-08-14T09:30:00.000Z", kind: "repair" },
            ],
          },
          {
            id: "CAR-092-A2",
            rugId: "CAR-092",
            label: "流苏根部断裂",
            colorId: "c-walnut",
            needed: 80,
            status: "已完工",
            uses: [
              { id: "use-seed-2", batchId: "WAL-03-2023A", amount: 80, at: "2026-08-20T02:10:00.000Z", kind: "repair" },
            ],
          },
        ],
      },
      {
        id: "CAR-117",
        origin: "安纳托利亚",
        era: "约1940s",
        knotDensity: 42,
        material: "羊毛",
        dyeType: "植物染",
        areas: [
          {
            id: "CAR-117-A1",
            rugId: "CAR-117",
            label: "中心纹样缺口",
            colorId: "c-madder",
            needed: 150,
            status: "修复中",
            uses: [
              { id: "use-seed-3", batchId: "MAD-02-2023A", amount: 50, at: "2026-09-02T07:45:00.000Z", kind: "repair" },
            ],
          },
          {
            id: "CAR-117-A2",
            rugId: "CAR-117",
            label: "南侧虫蛀",
            colorId: "c-pome",
            needed: 60,
            status: "待补线",
            uses: [],
          },
        ],
      },
      {
        id: "CAR-138",
        origin: "藏毯",
        era: "约1970s",
        knotDensity: 30,
        material: "牦牛毛混羊毛",
        dyeType: "植物染",
        areas: [
          {
            id: "CAR-138-A1",
            rugId: "CAR-138",
            label: "局部褪色补色",
            colorId: "c-indigo",
            needed: 90,
            status: "已完工",
            uses: [
              { id: "use-seed-4", batchId: "IND-04-2023A", amount: 90, at: "2026-08-28T03:20:00.000Z", kind: "repair" },
            ],
          },
          {
            id: "CAR-138-A2",
            rugId: "CAR-138",
            label: "边缘包边松散",
            colorId: "c-lake",
            needed: 45,
            status: "修复中",
            uses: [
              { id: "use-seed-5", batchId: "LAK-01-2024A", amount: 20, at: "2026-09-10T06:00:00.000Z", kind: "repair" },
            ],
          },
        ],
      },
      {
        id: "CAR-151",
        origin: "高加索",
        era: "约1950s",
        knotDensity: 38,
        material: "羊毛",
        dyeType: "矿物染",
        areas: [
          {
            id: "CAR-151-A1",
            rugId: "CAR-151",
            label: "东侧裂口",
            colorId: "c-madder",
            needed: 110,
            status: "待补线",
            uses: [],
          },
        ],
      },
    ],
    records: [
      { id: "rec-seed-5", at: "2026-09-10T06:00:00.000Z", type: "补线", colorId: "c-lake", rugId: "CAR-138", areaId: "CAR-138-A2", toBatchId: "LAK-01-2024A", amount: 20, note: "CAR-138「边缘包边松散」从批次 LAK-01-2024A 取线 20g" },
      { id: "rec-seed-4", at: "2026-08-28T03:20:00.000Z", type: "补线", colorId: "c-indigo", rugId: "CAR-138", areaId: "CAR-138-A1", toBatchId: "IND-04-2023A", amount: 90, note: "CAR-138「局部褪色补色」从批次 IND-04-2023A 取线 90g" },
      { id: "rec-seed-3", at: "2026-09-02T07:45:00.000Z", type: "补线", colorId: "c-madder", rugId: "CAR-117", areaId: "CAR-117-A1", toBatchId: "MAD-02-2023A", amount: 50, note: "CAR-117「中心纹样缺口」从批次 MAD-02-2023A 取线 50g" },
      { id: "rec-seed-2", at: "2026-08-20T02:10:00.000Z", type: "补线", colorId: "c-walnut", rugId: "CAR-092", areaId: "CAR-092-A2", toBatchId: "WAL-03-2023A", amount: 80, note: "CAR-092「流苏根部断裂」从批次 WAL-03-2023A 取线 80g" },
      { id: "rec-seed-1", at: "2026-08-14T09:30:00.000Z", type: "补线", colorId: "c-indigo", rugId: "CAR-092", areaId: "CAR-092-A1", toBatchId: "IND-04-2023A", amount: 60, note: "CAR-092「西北角边缘磨损」从批次 IND-04-2023A 取线 60g" },
    ],
  };
}
