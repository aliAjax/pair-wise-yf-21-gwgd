import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { DamagedArea, StudioState } from "../types";
import type { StudioActions } from "../useStudioStore";
import {
  areaProgress,
  currentBatchUsed,
  getColor,
  usedAmount,
  usableBatches,
} from "../batchRules";
import { batchLabel, formatDateTime } from "../format";

interface Props {
  state: StudioState;
  actions: StudioActions;
}

export default function ArchiveList({ state, actions }: Props) {
  const origins = useMemo(
    () => ["全部", ...Array.from(new Set(state.archives.map((a) => a.origin)))],
    [state.archives]
  );
  const [origin, setOrigin] = useState("全部");

  const shown =
    origin === "全部"
      ? state.archives
      : state.archives.filter((a) => a.origin === origin);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>破损区域补线</p>
          <h2>修复档案与区域进度</h2>
        </div>
        <div className="chips">
          {origins.map((o) => (
            <button
              key={o}
              className={origin === o ? "chip-on" : ""}
              onClick={() => setOrigin(o)}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="archive-grid">
        {shown.map((archive) => (
          <article key={archive.id} className="archive-card">
            <header className="archive-head">
              <h3>{archive.id}</h3>
              <span className="badge badge-origin">{archive.origin}</span>
            </header>
            <p className="archive-meta">
              {archive.era} · {archive.material} · {archive.dyeType} · 结密度
              {archive.knotDensity}
            </p>

            <div className="areas">
              {archive.areas.map((area) => (
                <AreaRow
                  key={area.id}
                  state={state}
                  archiveId={archive.id}
                  area={area}
                  actions={actions}
                />
              ))}
            </div>
          </article>
        ))}
        {shown.length === 0 && <p className="hint">该产地暂无档案。</p>}
      </div>
    </section>
  );
}

function AreaRow({
  state,
  archiveId,
  area,
  actions,
}: {
  state: StudioState;
  archiveId: string;
  area: DamagedArea;
  actions: StudioActions;
}) {
  const color = getColor(state, area.colorId)!;
  const candidates = usableBatches(state, area.colorId);
  const [batchId, setBatchId] = useState(candidates[0]?.id ?? "");
  const [amount, setAmount] = useState(String(area.requiredAmount));

  // 批次停用后候选列表会变化，保证选中值始终指向一个可用批次
  useEffect(() => {
    if (!candidates.some((b) => b.id === batchId)) {
      setBatchId(candidates[0]?.id ?? "");
    }
  }, [candidates, batchId]);

  const progress = areaProgress(area);
  const currentBatch = state.batches.find((b) => b.id === area.currentBatchId);

  return (
    <div className={`area area-${area.status}`}>
      <div className="area-head">
        <span className="swatch sm" style={{ background: color.hex }} />
        <strong>{area.name}</strong>
        <em className="code">{color.code}</em>
        <span className={`badge badge-area status-${area.status}`}>{area.status}</span>
      </div>
      {area.note && <p className="area-note">{area.note}</p>}

      <div className="progress">
        <div className="progress-bar">
          <span style={{ width: `${progress}%` }} />
        </div>
        <small>
          当前批次进度 {progress}%（{currentBatchUsed(area)}/{area.requiredAmount} 米）
        </small>
      </div>

      <p className="current-batch">
        当前用批：{batchLabel(state, area.currentBatchId)}
        {currentBatch && (
          <>
            {" "}
            · 余量 {currentBatch.remaining} 米 ·{" "}
            {currentBatch.status === "retired" ? "已停用" : "在用"}
          </>
        )}
      </p>

      <details className="usage-history">
        <summary>原用量记录（{area.usages.length} 笔，合计 {usedAmount(area)} 米）</summary>
        <ul>
          {area.usages.map((u) => (
            <li key={u.id} className={u.reassignLogId ? "reassigned-usage" : ""}>
              {batchLabel(state, u.batchId)} · {u.amount} 米 · {formatDateTime(u.at)}
              {u.reassignLogId && <span className="tag">换批前用量·已保留</span>}
            </li>
          ))}
        </ul>
      </details>

      {area.status === "待复核" ? (
        <div className="area-action">
          <p className="review-tip">
            原批次已停用，请复核并改用该颜色的其他在用批次；原用量已保留。
          </p>
          <ReassignForm
            state={state}
            area={area}
            candidates={candidates}
            batchId={batchId}
            setBatchId={setBatchId}
            amount={amount}
            setAmount={setAmount}
            onSubmit={() =>
              actions.reassign({
                archiveId,
                areaId: area.id,
                newBatchId: batchId,
                amount: Number(amount),
              })
            }
          />
        </div>
      ) : area.status !== "已完工" ? (
        <div className="area-action">
          <AllocateForm
            state={state}
            area={area}
            candidates={candidates}
            batchId={batchId}
            setBatchId={setBatchId}
            amount={amount}
            setAmount={setAmount}
            onSubmit={() =>
              actions.allocate({
                archiveId,
                areaId: area.id,
                batchId,
                amount: Number(amount),
              })
            }
          />
        </div>
      ) : (
        <p className="done-note">该破损区域已完工，无需再补线。</p>
      )}
    </div>
  );
}

interface FormProps {
  state: StudioState;
  area: DamagedArea;
  candidates: ReturnType<typeof usableBatches>;
  batchId: string;
  setBatchId: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
}

function BatchSelect({
  state,
  area,
  candidates,
  batchId,
  setBatchId,
  amount,
  setAmount,
  children,
}: FormProps & { children?: ReactNode }) {
  const picked = state.batches.find((b) => b.id === batchId);
  return (
    <div className="batch-form">
      <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
        {candidates.length === 0 && <option value="">该颜色暂无可用批次</option>}
        {candidates.map((b) => (
          <option key={b.id} value={b.id}>
            {b.arrivedAt} 到货 · 余 {b.remaining} 米
          </option>
        ))}
      </select>
      <input
        type="number"
        min="1"
        max={picked?.remaining}
        aria-label={`${area.name} 补线用量`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <span className="unit">米</span>
      {children}
    </div>
  );
}

function AllocateForm(props: FormProps & { onSubmit: () => void }) {
  return (
    <>
      <BatchSelect {...props}>
        <button className="primary" onClick={props.onSubmit}>
          选定批次补线
        </button>
      </BatchSelect>
    </>
  );
}

function ReassignForm(props: FormProps & { onSubmit: () => void }) {
  return (
    <BatchSelect {...props}>
      <button className="primary" onClick={props.onSubmit}>
        复核改用此批
      </button>
    </BatchSelect>
  );
}
