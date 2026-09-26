import { useState } from "react";
import type { ArchiveState, DamagedArea, RugArchive } from "../domain/types";
import {
  activeBatchesOf,
  discontinuedBatchesOf,
  progressOfArea,
  usedOfArea,
} from "../domain/batchRules";
import type { ArchiveActions } from "../state/useArchiveState";
import { fmtDate } from "./util";

interface Props {
  state: ArchiveState;
  rug: RugArchive;
  actions: ArchiveActions;
}

export function RugDetail({ state, rug, actions }: Props) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>纹样档案</p>
          <h2>
            {rug.id} · {rug.origin}
          </h2>
        </div>
      </div>
      <dl className="rug-meta">
        <div>
          <dt>年代</dt>
          <dd>{rug.era}</dd>
        </div>
        <div>
          <dt>结密度</dt>
          <dd>{rug.knotDensity} 结/10cm</dd>
        </div>
        <div>
          <dt>材质</dt>
          <dd>{rug.material}</dd>
        </div>
        <div>
          <dt>染色类型</dt>
          <dd>{rug.dyeType}</dd>
        </div>
      </dl>

      <h3 className="section-title">破损区域（{rug.areas.length}）</h3>
      <div className="area-list">
        {rug.areas.map((area) => (
          <AreaCard key={area.id} state={state} area={area} actions={actions} />
        ))}
      </div>
    </section>
  );
}

function AreaCard({
  state,
  area,
  actions,
}: {
  state: ArchiveState;
  area: DamagedArea;
  actions: ArchiveActions;
}) {
  const color = state.colors.find((c) => c.id === area.colorId);
  const used = usedOfArea(area);
  const percent = Math.min(100, Math.round(progressOfArea(area) * 100));
  const discontinued = discontinuedBatchesOf(state, area);
  const activeBatches = activeBatchesOf(state, area.colorId);
  const reviewing = area.status === "待复核";

  // 复核默认补用量：先补差额；已完工的区域按原用量返工
  const remaining = Math.max(0, area.needed - used);
  const defaultAmount = remaining > 0 ? remaining : used;

  const [batchId, setBatchId] = useState("");
  const [amount, setAmount] = useState("");
  const [reviewBatchId, setReviewBatchId] = useState("");
  const [reviewAmount, setReviewAmount] = useState("");

  const submitUse = () => {
    const n = Number(amount);
    if (actions.registerUsage(area.id, batchId, n)) {
      setAmount("");
      setBatchId("");
    }
  };

  const submitReview = () => {
    const n = Number(reviewAmount === "" ? defaultAmount : reviewAmount);
    if (actions.reviewSwitchBatch(area.id, reviewBatchId, n)) {
      setReviewAmount("");
      setReviewBatchId("");
    }
  };

  return (
    <article className={`area-card ${reviewing ? "reviewing" : ""}`}>
      <div className="area-head">
        <span
          className="swatch"
          style={{ background: color?.hex ?? "#999" }}
          title={color?.code}
        />
        <div>
          <h4>{area.label}</h4>
          <p>
            需 {color?.name}（{color?.code}）· 已用 {used}g / 预计 {area.needed}g
          </p>
        </div>
        <em className={`badge status-${area.status}`}>{area.status}</em>
      </div>

      <div className="bar">
        <i style={{ width: `${percent}%` }} />
      </div>

      {area.uses.length > 0 && (
        <table className="use-table">
          <tbody>
            {area.uses.map((u) => {
              const b = state.batches.find((x) => x.id === u.batchId);
              const dead = b?.status === "discontinued";
              return (
                <tr key={u.id} className={dead ? "dead" : ""}>
                  <td>{u.batchId}</td>
                  <td>{u.amount}g</td>
                  <td>{fmtDate(u.at)}</td>
                  <td>{u.kind === "review" ? "复核换批" : "补线"}</td>
                  <td>{dead ? "批次已停用" : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {reviewing ? (
        <div className="review-box">
          <p className="review-note">
            批次 {discontinued.map((b) => b.id).join("、")} 已停用（
            {discontinued[0]?.note ?? "褪色"}），该区域待复核；原用量 {used}g
            保留，复核后改用新批次继续。
          </p>
          <div className="inline-form">
            <select
              value={reviewBatchId}
              onChange={(e) => setReviewBatchId(e.target.value)}
            >
              <option value="">选择新批次</option>
              {activeBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id}（余量 {b.remaining}g）
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              placeholder={`补用量，默认 ${defaultAmount}g`}
              value={reviewAmount}
              onChange={(e) => setReviewAmount(e.target.value)}
            />
            <button
              className="primary"
              disabled={reviewBatchId === "" || activeBatches.length === 0}
              onClick={submitReview}
            >
              复核换批
            </button>
          </div>
        </div>
      ) : (
        <div className="inline-form">
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">选择批次</option>
            {activeBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id}（余量 {b.remaining}g）
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            placeholder="用量（克）"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            className="primary"
            disabled={batchId === "" || amount === "" || activeBatches.length === 0}
            onClick={submitUse}
          >
            登记补线
          </button>
        </div>
      )}
      {!reviewing && activeBatches.length === 0 && (
        <p className="empty">该色号暂无可用批次，请先在色卡入库。</p>
      )}
    </article>
  );
}
