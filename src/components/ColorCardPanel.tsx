import { useState } from "react";
import type { ArchiveState, ColorCard } from "../domain/types";
import type { ArchiveActions } from "../state/useArchiveState";
import { fmtDate, today } from "./util";

interface Props {
  state: ArchiveState;
  actions: ArchiveActions;
}

export function ColorCardPanel({ state, actions }: Props) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>材料色卡</p>
          <h2>色号与染料批次</h2>
        </div>
      </div>
      <div className="color-grid">
        {state.colors.map((color) => (
          <ColorCardBlock
            key={color.id}
            color={color}
            state={state}
            actions={actions}
          />
        ))}
      </div>
    </section>
  );
}

function ColorCardBlock({
  color,
  state,
  actions,
}: {
  color: ColorCard;
  state: ArchiveState;
  actions: ArchiveActions;
}) {
  const batches = state.batches
    .filter((b) => b.colorId === color.id)
    .sort((a, b) => a.arrivedAt.localeCompare(b.arrivedAt));

  const [adding, setAdding] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [arrivedAt, setArrivedAt] = useState(today());
  const [initial, setInitial] = useState("");

  const submitBatch = () => {
    const ok = actions.addBatch({
      colorId: color.id,
      id: batchId,
      arrivedAt,
      initial: Number(initial),
    });
    if (ok) {
      setBatchId("");
      setInitial("");
      setAdding(false);
    }
  };

  const deactivate = (id: string) => {
    const ok = window.confirm(
      `确认停用批次 ${id}？\n用过该批次的破损区域将转为「待复核」并保留原用量，其它批次和档案不受影响。`
    );
    if (ok) actions.deactivateBatch(id, "褪色");
  };

  return (
    <article className="color-card">
      <div className="color-head">
        <span className="swatch big" style={{ background: color.hex }} />
        <div>
          <h4>{color.name}</h4>
          <p>{color.code}</p>
        </div>
        <button className="ghost" onClick={() => setAdding((v) => !v)}>
          {adding ? "收起" : "＋批次入库"}
        </button>
      </div>

      {adding && (
        <div className="inline-form add-batch">
          <input
            placeholder="批次号，如 IND-04-2026A"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
          />
          <input
            type="date"
            value={arrivedAt}
            onChange={(e) => setArrivedAt(e.target.value)}
          />
          <input
            type="number"
            min={1}
            placeholder="到货量（克）"
            value={initial}
            onChange={(e) => setInitial(e.target.value)}
          />
          <button
            className="primary"
            disabled={batchId.trim() === "" || initial === ""}
            onClick={submitBatch}
          >
            入库
          </button>
        </div>
      )}

      <table className="batch-table">
        <thead>
          <tr>
            <th>批次号</th>
            <th>到货日期</th>
            <th>余量</th>
            <th>状态</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => {
            const pct =
              b.initial === 0 ? 0 : Math.round((b.remaining / b.initial) * 100);
            const low = b.status === "active" && b.remaining < 100;
            return (
              <tr key={b.id} className={b.status === "discontinued" ? "dead" : ""}>
                <td>{b.id}</td>
                <td>{fmtDate(b.arrivedAt)}</td>
                <td>
                  <div className="remain">
                    <span className={low ? "low" : ""}>
                      {b.remaining}g / {b.initial}g
                    </span>
                    <div className="bar slim">
                      <i style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </td>
                <td>
                  {b.status === "active" ? (
                    low ? (
                      <em className="badge low">余量偏低</em>
                    ) : (
                      <em className="badge ok">可用</em>
                    )
                  ) : (
                    <em className="badge dead">已停用·{b.note}</em>
                  )}
                </td>
                <td>
                  {b.status === "active" && (
                    <button className="danger" onClick={() => deactivate(b.id)}>
                      停用
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}
