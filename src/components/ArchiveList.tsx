import type { ArchiveState } from "../domain/types";
import { progressOfRug } from "../domain/batchRules";

interface Props {
  state: ArchiveState;
  origins: string[];
  selectedOrigin: string | null;
  onSelectOrigin: (origin: string | null) => void;
  selectedRugId: string | null;
  onSelectRug: (id: string) => void;
}

export function ArchiveList({
  state,
  origins,
  selectedOrigin,
  onSelectOrigin,
  selectedRugId,
  onSelectRug,
}: Props) {
  const rugs = state.rugs.filter(
    (r) => selectedOrigin === null || r.origin === selectedOrigin
  );

  return (
    <aside className="panel">
      <h2>按产地筛选</h2>
      <div className="chips">
        <button
          className={selectedOrigin === null ? "active" : ""}
          onClick={() => onSelectOrigin(null)}
        >
          全部
        </button>
        {origins.map((o) => (
          <button
            key={o}
            className={selectedOrigin === o ? "active" : ""}
            onClick={() => onSelectOrigin(o)}
          >
            {o}
          </button>
        ))}
      </div>

      <div className="rug-list">
        {rugs.map((rug) => {
          const p = progressOfRug(rug);
          const reviewing = rug.areas.filter((a) => a.status === "待复核").length;
          return (
            <button
              key={rug.id}
              className={`rug-item ${rug.id === selectedRugId ? "selected" : ""}`}
              onClick={() => onSelectRug(rug.id)}
            >
              <div className="rug-item-head">
                <strong>{rug.id}</strong>
                <span>{rug.origin}</span>
                {reviewing > 0 && (
                  <em className="badge review">待复核 {reviewing}</em>
                )}
              </div>
              <div className="rug-item-sub">
                {rug.era} · 结密度 {rug.knotDensity} · 完工 {p.done}/{p.total}
              </div>
              <div className="bar">
                <i style={{ width: `${Math.round(p.percent * 100)}%` }} />
              </div>
            </button>
          );
        })}
        {rugs.length === 0 && <p className="empty">该产地暂无档案</p>}
      </div>
    </aside>
  );
}
