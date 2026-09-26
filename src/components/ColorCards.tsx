import { useState } from "react";
import type { StudioState } from "../types";
import type { StudioActions } from "../useStudioStore";
import {
  BATCH_STATUS_LABEL,
  batchesOfColor,
  colorRemaining,
} from "../batchRules";
import { formatDateTime, today } from "../format";

interface Props {
  state: StudioState;
  actions: StudioActions;
}

export default function ColorCards({ state, actions }: Props) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>材料色卡</p>
          <h2>颜色与染料批次</h2>
        </div>
        <span className="hint">每个颜色分别维护批次、到货日期与余量；停用批次不影响其它批次施工</span>
      </div>

      <div className="color-grid">
        {state.colors.map((color) => (
          <ColorCardItem key={color.id} colorId={color.id} state={state} actions={actions} />
        ))}
      </div>
    </section>
  );
}

function ColorCardItem({
  colorId,
  state,
  actions,
}: {
  colorId: string;
} & Props) {
  const color = state.colors.find((c) => c.id === colorId)!;
  const batches = batchesOfColor(state, colorId);
  const remaining = colorRemaining(state, colorId);
  const [arrivedAt, setArrivedAt] = useState(today());
  const [stock, setStock] = useState("100");
  const [retireReason, setRetireReason] = useState<Record<string, string>>({});

  return (
    <article className="color-card">
      <header className="color-head">
        <span className="swatch" style={{ background: color.hex }} />
        <div>
          <h3>
            {color.name} <em className="code">{color.code}</em>
          </h3>
          <p>
            在用余量合计 <strong>{remaining}</strong> 米 · {batches.length} 个批次
          </p>
        </div>
      </header>

      <ul className="batch-list">
        {batches.map((b) => (
          <li key={b.id} className={`batch ${b.status}`}>
            <div className="batch-main">
              <span className="batch-date">{b.arrivedAt} 到货</span>
              <span className={`badge badge-${b.status}`}>
                {BATCH_STATUS_LABEL[b.status]}
              </span>
            </div>
            <div className="batch-stock">
              余量 {b.remaining} / {b.initialStock} 米
            </div>
            {b.status === "active" ? (
              <div className="retire-row">
                <input
                  aria-label={`${color.code} 批次 ${b.arrivedAt} 停用原因`}
                  placeholder="停用原因，如：褪色"
                  value={retireReason[b.id] ?? ""}
                  onChange={(e) =>
                    setRetireReason((m) => ({ ...m, [b.id]: e.target.value }))
                  }
                />
                <button
                  className="danger"
                  onClick={() =>
                    actions.retire(b.id, retireReason[b.id]?.trim() || "褪色")
                  }
                >
                  因褪色停用
                </button>
              </div>
            ) : (
              <p className="retire-note">
                {b.retireReason ? `停用原因：${b.retireReason}` : "已停用"}
                {b.retiredAt && <br />}
                {b.retiredAt ? `停用于 ${formatDateTime(b.retiredAt)}` : ""}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="add-batch">
        <span>登记新到货批次</span>
        <div className="add-batch-form">
          <label>
            <input
              type="date"
              value={arrivedAt}
              onChange={(e) => setArrivedAt(e.target.value)}
            />
          </label>
          <label>
            <input
              type="number"
              min="1"
              placeholder="余量(米)"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </label>
          <button
            onClick={() =>
              actions.addNewBatch({
                colorId,
                arrivedAt,
                initialStock: Number(stock),
              })
            }
          >
            增加批次
          </button>
        </div>
      </div>
    </article>
  );
}
