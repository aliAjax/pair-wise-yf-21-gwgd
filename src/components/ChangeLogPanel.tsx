import type { ChangeLog, StudioState } from "../types";
import { getColor } from "../batchRules";
import { batchLabel, formatDateTime } from "../format";

const TYPE_TEXT: Record<ChangeLog["type"], string> = {
  add: "登记批次",
  allocate: "补线",
  retire: "批次停用",
  reassign: "复核换批",
};

export default function ChangeLogPanel({ state }: { state: StudioState }) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>批次追溯</p>
          <h2>换批与批次记录</h2>
        </div>
        <span className="hint">关闭页面再回来仍可查看，共 {state.logs.length} 条</span>
      </div>

      <ol className="log-list">
        {state.logs.map((log) => {
          const color = getColor(state, log.colorId);
          return (
            <li key={log.id} className={`log log-${log.type}`}>
              <span className={`badge badge-log type-${log.type}`}>
                {TYPE_TEXT[log.type]}
              </span>
              <div className="log-body">
                <p>
                  {color ? `${color.name}（${color.code}）` : log.colorId} ·{" "}
                  {describeLog(state, log)}
                </p>
                <small>{formatDateTime(log.at)}</small>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function describeLog(state: StudioState, log: ChangeLog): string {
  const areaName = findAreaName(state, log.archiveId, log.areaId);
  switch (log.type) {
    case "add":
      return `新批次到货 ${log.amount ?? ""} 米`;
    case "allocate":
      return `${areaName} 领用 ${log.amount ?? ""} 米（${batchLabel(state, log.batchId)}）`;
    case "retire":
      return areaName
        ? `${batchLabel(state, log.batchId)} 停用，${areaName} 转待复核（${log.reason ?? ""}）`
        : `${batchLabel(state, log.batchId)} 停用（${log.reason ?? ""}）`;
    case "reassign":
      return `${areaName} 复核换批：${batchLabel(
        state,
        log.fromBatchId
      )} → ${batchLabel(state, log.toBatchId)}，新批领用 ${log.amount ?? ""} 米`;
  }
}

function findAreaName(
  state: StudioState,
  archiveId?: string,
  areaId?: string
): string {
  if (!archiveId || !areaId) return "";
  const archive = state.archives.find((a) => a.id === archiveId);
  const area = archive?.areas.find((x) => x.id === areaId);
  return archive && area ? `${archive.id} ${area.name}` : "";
}
