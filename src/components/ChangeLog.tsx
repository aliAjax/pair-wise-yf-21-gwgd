import type { ArchiveState } from "../domain/types";
import { fmtDateTime } from "./util";

const typeClass: Record<string, string> = {
  入库: "ok",
  补线: "info",
  停用: "dead",
  复核换批: "review",
};

export function ChangeLog({ state }: { state: ArchiveState }) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>留痕</p>
          <h2>换批与批次记录（{state.records.length}）</h2>
        </div>
      </div>
      <div className="records">
        {state.records.map((r) => {
          const color = state.colors.find((c) => c.id === r.colorId);
          return (
            <article key={r.id}>
              <b className={`rec-badge ${typeClass[r.type] ?? ""}`}>{r.type}</b>
              <div>
                <h3>
                  <span
                    className="swatch small"
                    style={{ background: color?.hex ?? "#999" }}
                  />
                  {color?.name}（{color?.code}）
                  {r.fromBatchId && <span className="rec-flow"> {r.fromBatchId}</span>}
                  {r.fromBatchId && r.toBatchId && <span className="rec-flow"> → </span>}
                  {r.toBatchId && <span className="rec-flow">{r.toBatchId}</span>}
                  {typeof r.amount === "number" && (
                    <span className="rec-amount"> {r.amount}g</span>
                  )}
                </h3>
                <p>{r.note}</p>
                <p className="rec-time">{fmtDateTime(r.at)}</p>
              </div>
            </article>
          );
        })}
        {state.records.length === 0 && <p className="empty">暂无记录</p>}
      </div>
    </section>
  );
}
