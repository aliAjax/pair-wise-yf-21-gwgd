import type { ArchiveState } from "../domain/types";

export function MetricsBar({ state }: { state: ArchiveState }) {
  const areas = state.rugs.flatMap((r) => r.areas);
  const reviewCount = areas.filter((a) => a.status === "待复核").length;
  const activeBatches = state.batches.filter((b) => b.status === "active");
  const lowStock = activeBatches.filter((b) => b.remaining < 100).length;
  const done = areas.filter((a) => a.status === "已完工").length;
  const rate = areas.length === 0 ? 0 : Math.round((done / areas.length) * 100);

  const metrics = [
    { label: "待复核区域", value: reviewCount, warn: reviewCount > 0 },
    { label: "可用批次", value: activeBatches.length, warn: false },
    { label: "余量预警批次", value: lowStock, warn: lowStock > 0 },
    { label: "区域完工率", value: `${rate}%`, warn: false },
  ];

  return (
    <section className="metrics">
      {metrics.map((m) => (
        <article key={m.label} className={m.warn ? "warn" : ""}>
          <small>{m.label}</small>
          <strong>{m.value}</strong>
        </article>
      ))}
    </section>
  );
}
